import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PromotionsService } from '../promotions/promotions.service';
import { MailService } from '../mail/mail.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import MercadoPagoConfig, { Preference, Payment } from 'mercadopago';

@Injectable()
export class PaymentsService {
  private mpClient: MercadoPagoConfig;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private promotionsService: PromotionsService,
    private mail: MailService,
  ) {
    this.mpClient = new MercadoPagoConfig({
      accessToken: this.configService.get<string>('MP_ACCESS_TOKEN') || '',
    });
  }

  async createCheckoutSession(dto: CreateCheckoutDto) {
    const { items, customerEmail, customerName, customerPhone, promoCode, shippingAddress, notes } = dto;

    if (!items || items.length === 0) throw new BadRequestException('No items provided');

    // Fetch products server-side — never trust client prices
    const productIds = items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, active: true },
    });
    if (products.length !== productIds.length) throw new BadRequestException('One or more products not found');

    const productMap = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const orderItemsData = items.map((item) => {
      const product = productMap.get(item.productId);
      const unitPrice = product.price;
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;
      return { productId: item.productId, quantity: item.quantity, unitPrice, total: lineTotal };
    });

    // Promo code
    let discountAmt = 0;
    let promotionId: number | null = null;
    if (promoCode) {
      const result = await this.promotionsService.validateCode(promoCode, subtotal);
      if (result.valid) { discountAmt = result.discountAmount; promotionId = result.promotionId; }
    }

    const total = Math.max(0, subtotal - discountAmt);

    // Create pending order
    const order = await this.prisma.order.create({
      data: {
        status: 'pending',
        customerEmail,
        customerName,
        customerPhone,
        subtotal,
        discountAmt,
        total,
        promoCode,
        promotionId,
        shippingAddress,
        notes,
        items: { create: orderItemsData },
      },
    });

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5500';
    const backendUrl  = this.configService.get<string>('BACKEND_URL')  || 'http://localhost:3001';

    // MercadoPago prices are in whole ARS (not cents) — divide by 100
    const mpItems = items.map((item) => {
      const product = productMap.get(item.productId);
      return {
        id: String(product.id),
        title: product.name,
        description: product.description || product.name,
        picture_url: product.imageUrl ? `${backendUrl}/${product.imageUrl}` : undefined,
        quantity: item.quantity,
        currency_id: 'ARS',
        unit_price: product.price / 100,  // cents → ARS
      };
    });

    const preferenceClient = new Preference(this.mpClient);
    let preference: any;
    try {
      preference = await preferenceClient.create({
        body: {
          items: mpItems,
          payer: customerEmail ? { email: customerEmail, name: customerName || undefined } : undefined,
          back_urls: {
            success: `${frontendUrl}/success?order=${order.id}`,
            failure: `${frontendUrl}/?payment=failure`,
            pending: `${frontendUrl}/success?order=${order.id}&status=pending`,
          },
          auto_return: 'approved',
          external_reference: String(order.id),
          notification_url: `${backendUrl}/payments/webhook`,
          statement_descriptor: 'MILAN MATERIA',
        },
      });
    } catch (mpError) {
      // MercadoPago failed — cancel the order so it doesn't stay as pending
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'cancelled' },
      });
      console.error(`Order #${order.id} cancelled: MercadoPago error — ${mpError.message}`);
      throw new BadRequestException('No se pudo iniciar el pago con MercadoPago. Intente de nuevo.');
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: { mpPreferenceId: preference.id },
    });

    // Send notification email (non-blocking)
    const fullOrder = await this.prisma.order.findUnique({
      where: { id: order.id },
      include: { items: { include: { product: { select: { name: true } } } } },
    });
    this.mail.sendNewOrder({
      id: order.id,
      total: order.total,
      customerName,
      customerEmail,
      customerPhone,
      items: fullOrder?.items ?? [],
    }).catch(() => {/* fire-and-forget */});

    return {
      preferenceId: preference.id,
      url: preference.init_point,         // production URL
      sandboxUrl: preference.sandbox_init_point, // test URL
      orderId: order.id,
    };
  }

  async handleWebhook(type: string, paymentId: string) {
    if (type !== 'payment' || !paymentId) return { received: true };

    try {
      const paymentClient = new Payment(this.mpClient);
      const payment = await paymentClient.get({ id: paymentId });

      const orderId = payment.external_reference ? parseInt(payment.external_reference) : null;
      if (!orderId) return { received: true };

      if (payment.status === 'approved') {
        await this.prisma.order.update({
          where: { id: orderId },
          data: {
            status: 'paid',
            mpPaymentId: String(payment.id),
            paymentMethod: payment.payment_type_id || 'mercadopago',
          },
        });
        // Increment promo usage
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (order?.promotionId) {
          await this.prisma.promotion.update({ where: { id: order.promotionId }, data: { usedCount: { increment: 1 } } });
        }
        console.log(`Order #${orderId} marked as PAID via MercadoPago`);
      } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
        await this.prisma.order.update({ where: { id: orderId }, data: { status: 'cancelled' } });
      }
    } catch (e) {
      console.error('MP webhook error:', e.message);
    }

    return { received: true };
  }
}
