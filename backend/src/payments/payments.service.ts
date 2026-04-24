import { Injectable, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { PromotionsService } from "../promotions/promotions.service";
import { MailService } from "../mail/mail.service";
import { ShippingService } from "../shipping/shipping.service";
import { CreateCheckoutDto } from "./dto/create-checkout.dto";
import MercadoPagoConfig, { Preference, Payment } from "mercadopago";

@Injectable()
export class PaymentsService {
  private mpClient: MercadoPagoConfig;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
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

    console.log(
      `[SHOP] Checkout started — customer: ${customerId ? `#${customerId}` : "guest"}, items: ${items?.length ?? 0}, zip: ${shippingZip ?? "none"}`,
    );

    // If logged in, auto-fill missing fields from the customer profile
    if (customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
      });
      if (customer) {
        customerEmail = customerEmail || customer.email;
        customerName = customerName || customer.name;
        customerPhone = customerPhone || customer.phone || undefined;
        if (!shippingAddress && customer.address)
          shippingAddress = customer.address;
        if (!shippingCity && customer.city) shippingCity = customer.city;
        if (!shippingProvince && customer.province)
          shippingProvince = customer.province;
        if (!shippingZip && customer.zip) shippingZip = customer.zip;
        console.log(
          `[SHOP] Checkout prefilled from profile — customer #${customerId}`,
        );
      }
    }

    if (!items || items.length === 0)
      throw new BadRequestException("No items provided");

    // Fetch products server-side — never trust client prices
    const productIds = items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, active: true },
    });
    if (products.length !== productIds.length) {
      console.warn(
        `[SHOP] Checkout failed — some products not found: requested ${productIds.join(",")}`,
      );
      throw new BadRequestException("One or more products not found");
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const orderItemsData = items.map((item) => {
      const product = productMap.get(item.productId);
      const unitPrice = product.price;
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        total: lineTotal,
      };
    });

    console.log(
      `[SHOP] Checkout subtotal: ${subtotal} cents — items: ${items.map((i) => `#${i.productId}×${i.quantity}`).join(", ")}`,
    );

    // Promo code
    let discountAmt = 0;
    let promotionId: number | null = null;
    if (promoCode) {
      const result = await this.promotionsService.validateCode(
        promoCode,
        subtotal,
      );
      if (result.valid) {
        discountAmt = result.discountAmount;
        promotionId = result.promotionId;
        console.log(
          `[SHOP] Promo code "${promoCode}" applied — discount: ${discountAmt} cents`,
        );
      } else {
        console.log(
          `[SHOP] Promo code "${promoCode}" invalid or not applicable`,
        );
      }
    }

    // Get shipping cost from Andreani (server-side, so it can't be spoofed)
    const shippingQuote = await this.shipping.quoteForCheckout(
      shippingZip || "",
    );
    const shippingCost = shippingQuote.costCents;

    const total = Math.max(0, subtotal - discountAmt + shippingCost);
    console.log(
      `[SHOP] Checkout total: ${total} cents (subtotal: ${subtotal}, discount: ${discountAmt}, shipping: ${shippingCost})`,
    );

    const fullShippingAddress =
      [shippingAddress, shippingCity, shippingProvince, shippingZip]
        .filter(Boolean)
        .join(", ") || undefined;

    // Atomically decrement stock + create order
    const order = await this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        const product = productMap.get(item.productId);
        const result = await tx.product.updateMany({
          where: {
            id: item.productId,
            active: true,
            stock: { gte: item.quantity },
          },
          data: { stock: { decrement: item.quantity } },
        });
        if (result.count === 0) {
          const fresh = await tx.product.findUnique({
            where: { id: item.productId },
          });
          console.warn(
            `[SHOP] Checkout failed — insufficient stock for product #${item.productId} "${product.name}" (available: ${fresh?.stock ?? 0}, requested: ${item.quantity})`,
          );
          throw new BadRequestException(
            `Stock insuficiente para "${product.name}". Disponible: ${fresh?.stock ?? 0}, solicitado: ${item.quantity}.`,
          );
        }
      }

      return tx.order.create({
        data: {
          status: "pending",
          customerId: customerId ?? null,
          customerEmail,
          customerName,
          customerPhone,
          subtotal,
          discountAmt,
          shippingCost,
          total,
          promoCode,
          promotionId,
          shippingAddress: fullShippingAddress,
          notes,
          items: { create: orderItemsData },
        },
      });
    });

    console.log(
      `[SHOP] Order #${order.id} created — status: pending, total: ${total} cents, customer: ${customerEmail ?? "guest"}`,
    );

    const frontendUrl =
      this.configService.get<string>("FRONTEND_URL") || "http://localhost:5174";
    const backendUrl =
      this.configService.get<string>("BACKEND_URL") || "http://localhost:3001";

    const mpItems: any[] = items.map((item) => {
      const product = productMap.get(item.productId);
      return {
        id: String(product.id),
        title: product.name,
        description: product.description || product.name,
        picture_url: product.imageUrl
          ? `${backendUrl}/${product.imageUrl}`
          : undefined,
        quantity: item.quantity,
        currency_id: "ARS",
        unit_price: product.price / 100,
      };
    });

    if (shippingCost > 0) {
      mpItems.push({
        id: "shipping",
        title: `Envío por ${shippingQuote.provider}`,
        description: shippingQuote.estimatedDays ?? "Envío a domicilio",
        quantity: 1,
        currency_id: "ARS",
        unit_price: shippingCost / 100,
      });
    }

    console.log(
      `[SHOP] Creating MercadoPago preference for order #${order.id}`,
    );
    const preferenceClient = new Preference(this.mpClient);
    let preference: any;
    try {
      preference = await preferenceClient.create({
        body: {
          items: mpItems,
          payer: customerEmail
            ? { email: customerEmail, name: customerName || undefined }
            : undefined,
          back_urls: {
            success: `${frontendUrl}/success?order=${order.id}`,
            failure: `${frontendUrl}/?payment=failure`,
            pending: `${frontendUrl}/success?order=${order.id}&status=pending`,
          },
          external_reference: String(order.id),
          notification_url: `${backendUrl}/payments/webhook`,
          statement_descriptor: "MILAN MATERIA",
        },
      });
      console.log(
        `[SHOP] MP preference created — id: ${preference.id}, order #${order.id}`,
      );
    } catch (mpError) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: "cancelled" },
      });
      console.error(
        `[SHOP] MP preference failed — order #${order.id} cancelled: ${mpError.message}`,
      );
      throw new BadRequestException(
        "No se pudo iniciar el pago con MercadoPago. Intente de nuevo.",
      );
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: { mpPreferenceId: preference.id },
    });

    return {
      preferenceId: preference.id,
      url: preference.init_point,
      sandboxUrl: preference.sandbox_init_point,
      orderId: order.id,
    };
  }
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async handleWebhook(type: string, paymentId: string) {
    await this.sleep(1000);
    if (type !== "payment" || !paymentId) {
      console.log(
        `[SYSTEM] Webhook ignored — type: "${type}", id: "${paymentId}"`,
      );
      return { received: true };
    }

    console.log(`[SYSTEM] Processing MP webhook — payment id: ${paymentId}`);

    try {
      const paymentClient = new Payment(this.mpClient);
      const payment = await paymentClient.get({ id: paymentId });

      console.log(
        `[SYSTEM] MP payment fetched — id: ${paymentId}, status: "${payment.status}", external_reference: "${payment.external_reference}"`,
      );

      const orderId = payment.external_reference
        ? parseInt(payment.external_reference)
        : null;
      if (!orderId) {
        console.warn(
          `[SYSTEM] Webhook — no external_reference in payment ${paymentId}, ignoring`,
        );
        return { received: true };
      }

      if (payment.status === "approved") {
        await this.prisma.order.update({
          where: { id: orderId },
          data: {
            status: "paid",
            mpPaymentId: String(payment.id),
            paymentMethod: payment.payment_type_id || "mercadopago",
          },
        });

        console.log(
          `[SYSTEM] Order #${orderId} marked as PAID — payment method: ${payment.payment_type_id}`,
        );

        const order = await this.prisma.order.findUnique({
          where: { id: orderId },
          include: {
            items: { include: { product: { select: { name: true } } } },
          },
        });

        if (order) {
          if (order.promotionId) {
            await this.prisma.promotion.update({
              where: { id: order.promotionId },
              data: { usedCount: { increment: 1 } },
            });
            console.log(
              `[SYSTEM] Promo usage incremented — promotion #${order.promotionId}`,
            );
          }

          if (order.customerEmail) {
            console.log(
              `[SYSTEM] Sending buyer confirmation email to ${order.customerEmail}`,
            );
            this.mail
              .sendBuyerOrderConfirmation({
                id: order.id,
                total: order.total,
                subtotal: order.subtotal,
                discountAmt: order.discountAmt,
                shippingCost: (order as any).shippingCost ?? 0,
                customerName: order.customerName || undefined,
                customerEmail: order.customerEmail,
                shippingAddress: order.shippingAddress || undefined,
                items: order.items.map((i) => ({
                  name: i.product?.name ?? "Producto",
                  quantity: i.quantity,
                  unitPrice: i.unitPrice,
                })),
              })
              .catch((e) =>
                console.error(
                  `[SYSTEM] Failed to send buyer email for order #${orderId}: ${e.message}`,
                ),
              );
          }

          console.log(
            `[SYSTEM] Sending admin notification for order #${orderId}`,
          );
          this.mail
            .sendNewOrder({
              id: order.id,
              total: order.total,
              customerName: order.customerName || undefined,
              customerEmail: order.customerEmail || undefined,
              customerPhone: order.customerPhone || undefined,
              items: order.items,
            })
            .catch((e) =>
              console.error(
                `[SYSTEM] Failed to send admin email for order #${orderId}: ${e.message}`,
              ),
            );
        }
      } else if (
        payment.status === "rejected" ||
        payment.status === "cancelled"
      ) {
        await this.prisma.order.update({
          where: { id: orderId },
          data: { status: "cancelled" },
        });
        console.log(
          `[SYSTEM] Order #${orderId} marked as CANCELLED — MP status: ${payment.status}`,
        );
      } else {
        console.log(
          `[SYSTEM] Order #${orderId} — unhandled MP status: "${payment.status}", no action taken`,
        );
      }
    } catch (e) {
      console.error(
        `[SYSTEM] MP webhook error — payment ${paymentId}: ${e.message}`,
      );
    }

    return { received: true };
  }
}
