import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { ProductRepository } from "../products/repositories/product.repository";
import { OrderRepository } from "../orders/repositories/order.repository";
import { PromotionsService } from "../promotions/promotions.service";
import { MailService } from "../mail/mail.service";
import { ShippingService } from "../shipping/shipping.service";
import { CreateCheckoutDto } from "./dto/create-checkout.dto";
import type { Prisma } from "@prisma/client";
import MercadoPagoConfig, {
  Preference,
  Payment,
  MerchantOrder,
} from "mercadopago";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private mpClient: MercadoPagoConfig;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,           // kept only for $transaction coordination
    private productRepo: ProductRepository,
    private orderRepo: OrderRepository,
    private promotionsService: PromotionsService,
    private mail: MailService,
    private shipping: ShippingService,
  ) {
    this.mpClient = new MercadoPagoConfig({
      accessToken: this.configService.get<string>("MP_ACCESS_TOKEN") || "",
    });
  }

  async createCheckoutSession(dto: CreateCheckoutDto, customerId?: number) {
    let {
      items,
      customerEmail,
      customerName,
      customerPhone,
      promoCode,
      shippingAddress,
      shippingCity,
      shippingProvince,
      shippingZip,
      notes,
    } = dto;

    this.logger.log(
      `Checkout started — customer: ${customerId ? `#${customerId}` : "guest"}, items: ${items?.length ?? 0}, zip: ${shippingZip ?? "none"}`,
    );

    // Auto-fill missing fields from the customer profile when logged in
    if (customerId) {
      const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
      if (customer) {
        customerEmail    = customerEmail    || customer.email;
        customerName     = customerName     || customer.name;
        customerPhone    = customerPhone    || customer.phone  || undefined;
        if (!shippingAddress && customer.address)  shippingAddress  = customer.address;
        if (!shippingCity    && customer.city)     shippingCity     = customer.city;
        if (!shippingProvince && customer.province) shippingProvince = customer.province;
        if (!shippingZip     && customer.zip)      shippingZip      = customer.zip;
        this.logger.log(`Checkout prefilled from profile — customer #${customerId}`);
      }
    }

    if (!items || items.length === 0)
      throw new BadRequestException("No items provided");

    // Fetch products server-side — never trust client prices
    const productIds = items.map(i => i.productId);
    const products   = await this.productRepo.findByIds(productIds, true);

    if (products.length !== productIds.length) {
      this.logger.warn(`Checkout failed — some products not found: ${productIds.join(",")}`);
      throw new BadRequestException("One or more products not found");
    }

    const productMap = new Map(products.map(p => [p.id, p]));

    let subtotal = 0;
    const orderItemsData = items.map(item => {
      const product   = productMap.get(item.productId)!;
      const unitPrice = product.price;
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;
      return { productId: item.productId, quantity: item.quantity, unitPrice, total: lineTotal };
    });

    this.logger.log(
      `Checkout subtotal: ${subtotal} cents — items: ${items.map(i => `#${i.productId}×${i.quantity}`).join(", ")}`,
    );

    // Promo code
    let discountAmt  = 0;
    let promotionId: number | null = null;
    if (promoCode) {
      const result = await this.promotionsService.validateCode(promoCode, subtotal);
      if (result.valid) {
        discountAmt = result.discountAmount;
        promotionId = result.promotionId;
        this.logger.log(`Promo code "${promoCode}" applied — discount: ${discountAmt} cents`);
      } else {
        this.logger.log(`Promo code "${promoCode}" invalid or not applicable`);
      }
    }

    // Shipping cost — server-side, cannot be spoofed
    const shippingQuote = await this.shipping.quoteForCheckout(shippingZip || "");
    const shippingCost  = shippingQuote.costCents;

    const total = Math.max(0, subtotal - discountAmt + shippingCost);
    this.logger.log(
      `Checkout total: ${total} cents (subtotal: ${subtotal}, discount: ${discountAmt}, shipping: ${shippingCost})`,
    );

    const fullShippingAddress =
      [shippingAddress, shippingCity, shippingProvince, shippingZip]
        .filter(Boolean)
        .join(", ") || undefined;

    // Atomically decrement stock + create order inside a Prisma transaction
    const order = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const item of items) {
        const product = productMap.get(item.productId)!;
        const result  = await this.productRepo.decrementStock(item.productId, item.quantity, tx);
        if (result.count === 0) {
          const fresh = await this.productRepo.findFresh(item.productId, tx);
          this.logger.warn(
            `Checkout failed — insufficient stock for product #${item.productId} "${product.name}" (available: ${fresh?.stock ?? 0}, requested: ${item.quantity})`,
          );
          throw new BadRequestException(
            `Stock insuficiente para "${product.name}". Disponible: ${fresh?.stock ?? 0}, solicitado: ${item.quantity}.`,
          );
        }
      }

      return this.orderRepo.create(
        {
          status: "pending",
          customer:       customerId ? { connect: { id: customerId } } : undefined,
          customerEmail,
          customerName,
          customerPhone,
          subtotal,
          discountAmt,
          shippingCost,
          total,
          promoCode,
          promotion:      promotionId ? { connect: { id: promotionId } } : undefined,
          shippingAddress: fullShippingAddress,
          notes,
          items: { create: orderItemsData },
        } as Prisma.OrderCreateInput,
        tx,
      );
    });

    this.logger.log(
      `Order #${order.id} created — status: pending, total: ${total} cents, customer: ${customerEmail ?? "guest"}`,
    );

    const frontendUrl = this.configService.get<string>("VITE_FRONTEND_URL") || "http://localhost:5174";
    const backendUrl  = this.configService.get<string>("VITE_BACKEND_URL")  || "http://localhost:3001";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mpItems: any[] = items.map(item => {
      const product = productMap.get(item.productId)!;
      return {
        id:          String(product.id),
        title:       product.name,
        description: product.description || product.name,
        picture_url: product.imageUrl ? `${backendUrl}/${product.imageUrl}` : undefined,
        quantity:    item.quantity,
        currency_id: "ARS",
        unit_price:  product.price / 100,
      };
    });

    if (shippingCost > 0) {
      mpItems.push({
        id:          "shipping",
        title:       `Envío por ${shippingQuote.provider}`,
        description: shippingQuote.estimatedDays ?? "Envío a domicilio",
        quantity:    1,
        currency_id: "ARS",
        unit_price:  shippingCost / 100,
      });
    }

    this.logger.log(`Creating MercadoPago preference for order #${order.id}`);
    const preferenceClient = new Preference(this.mpClient);
    let preference: Awaited<ReturnType<typeof preferenceClient.create>>;

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
          external_reference: String(order.id),
          notification_url:   `${backendUrl}/payments/webhook`,
          statement_descriptor: "MILAN MATERIA",
        },
      });
      this.logger.log(`MP preference created — id: ${preference.id}, order #${order.id}`);
    } catch (mpError) {
      await this.orderRepo.update(order.id, { status: "cancelled" });
      this.logger.error(`MP preference failed — order #${order.id} cancelled: ${mpError.message}`);
      throw new BadRequestException("No se pudo iniciar el pago con MercadoPago. Intente de nuevo.");
    }

    await this.orderRepo.update(order.id, { mpPreferenceId: preference.id });

    return {
      preferenceId: preference.id,
      url:          preference.init_point,
      sandboxUrl:   preference.sandbox_init_point,
      orderId:      order.id,
    };
  }

  private sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

  async handleWebhook(type: string, paymentId: string) {
    await this.sleep(1000);
    if (type !== "payment" || !paymentId) {
      this.logger.log(`Webhook ignored — type: "${type}", id: "${paymentId}"`);
      return { received: true };
    }

    this.logger.log(`Processing MP webhook — payment id: ${paymentId}`);

    try {
      const paymentClient = new Payment(this.mpClient);
      const payment = await paymentClient.get({ id: paymentId });

      this.logger.log(
        `MP payment fetched — id: ${paymentId}, status: "${payment.status}", external_reference: "${payment.external_reference}"`,
      );

      const orderId = payment.external_reference ? parseInt(payment.external_reference) : null;
      if (!orderId) {
        this.logger.warn(`Webhook — no external_reference in payment ${paymentId}, ignoring`);
        return { received: true };
      }

      if (payment.status === "approved") {
        await this.orderRepo.update(orderId, {
          status:        "paid",
          mpPaymentId:   String(payment.id),
          paymentMethod: payment.payment_type_id || "mercadopago",
        });

        this.logger.log(`Order #${orderId} marked as PAID — payment method: ${payment.payment_type_id}`);

        const order = await this.orderRepo.findWithItems(orderId);

        if (order) {
          if (order.promotionId) {
            await this.orderRepo.incrementPromotionUsage(order.promotionId);
            this.logger.log(`Promo usage incremented — promotion #${order.promotionId}`);
          }

          if (order.customerEmail) {
            this.logger.log(`Sending buyer confirmation email to ${order.customerEmail}`);
            this.mail
              .sendBuyerOrderConfirmation({
                id:             order.id,
                total:          order.total,
                subtotal:       order.subtotal,
                discountAmt:    order.discountAmt,
                shippingCost:   order.shippingCost,
                customerName:   order.customerName || undefined,
                customerEmail:  order.customerEmail,
                shippingAddress: order.shippingAddress || undefined,
                items: order.items.map(i => ({
                  name:      i.product?.name ?? "Producto",
                  quantity:  i.quantity,
                  unitPrice: i.unitPrice,
                })),
              })
              .catch(e => this.logger.error(`Failed to send buyer email for order #${orderId}: ${e.message}`));
          }

          this.logger.log(`Sending admin notification for order #${orderId}`);
          this.mail
            .sendNewOrder({
              id:             order.id,
              status:         order.status,
              subtotal:       order.subtotal,
              discountAmt:    order.discountAmt,
              shippingCost:   order.shippingCost,
              total:          order.total,
              customerName:   order.customerName  || undefined,
              customerEmail:  order.customerEmail  || undefined,
              customerPhone:  order.customerPhone  || undefined,
              promoCode:      order.promoCode      || undefined,
              mpPreferenceId: order.mpPreferenceId || undefined,
              mpPaymentId:    order.mpPaymentId    || undefined,
              paymentMethod:  order.paymentMethod  || undefined,
              shippingAddress: order.shippingAddress || undefined,
              notes:          order.notes          || undefined,
              trackingNumber: order.trackingNumber || undefined,
              adminNotes:     order.adminNotes     || undefined,
              createdAt:      order.createdAt,
              items: order.items,
            })
            .catch(e => this.logger.error(`Failed to send admin email for order #${orderId}: ${e.message}`));
        }
      } else if (payment.status === "rejected" || payment.status === "cancelled") {
        await this.orderRepo.update(orderId, { status: "cancelled" });
        this.logger.log(`Order #${orderId} marked as CANCELLED — MP status: ${payment.status}`);
      } else {
        this.logger.log(`Order #${orderId} — unhandled MP status: "${payment.status}", no action taken`);
      }
    } catch (e) {
      this.logger.error(`MP webhook error — payment ${paymentId}: ${e.message}`);
    }

    return { received: true };
  }

  async handleMerchantOrderWebhook(merchantOrderId: string) {
    this.logger.log(`Fetching merchant order #${merchantOrderId} from MP`);
    try {
      const client        = new MerchantOrder(this.mpClient);
      const merchantOrder = await client.get({ merchantOrderId: Number(merchantOrderId) });

      this.logger.log(
        `Merchant order #${merchantOrderId} — status: "${merchantOrder.order_status}", payments: ${merchantOrder.payments?.length ?? 0}`,
      );

      if (!merchantOrder.payments || merchantOrder.payments.length === 0) {
        this.logger.log(`Merchant order #${merchantOrderId} has no payments yet, ignoring`);
        return { received: true };
      }

      for (const p of merchantOrder.payments) {
        const paymentId = String(p.id);
        this.logger.log(`Merchant order #${merchantOrderId} → processing payment #${paymentId} (status: ${p.status})`);
        await this.handleWebhook("payment", paymentId);
      }
    } catch (e) {
      this.logger.error(`Failed to process merchant order #${merchantOrderId}: ${e.message}`);
    }
    return { received: true };
  }
}
