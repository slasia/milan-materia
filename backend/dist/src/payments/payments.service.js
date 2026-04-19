"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const promotions_service_1 = require("../promotions/promotions.service");
const mail_service_1 = require("../mail/mail.service");
const mercadopago_1 = require("mercadopago");
let PaymentsService = class PaymentsService {
    constructor(configService, prisma, promotionsService, mail) {
        this.configService = configService;
        this.prisma = prisma;
        this.promotionsService = promotionsService;
        this.mail = mail;
        this.mpClient = new mercadopago_1.default({
            accessToken: this.configService.get('MP_ACCESS_TOKEN') || '',
        });
    }
    async createCheckoutSession(dto) {
        const { items, customerEmail, customerName, customerPhone, promoCode, shippingAddress, notes } = dto;
        if (!items || items.length === 0)
            throw new common_1.BadRequestException('No items provided');
        const productIds = items.map((i) => i.productId);
        const products = await this.prisma.product.findMany({
            where: { id: { in: productIds }, active: true },
        });
        if (products.length !== productIds.length)
            throw new common_1.BadRequestException('One or more products not found');
        const productMap = new Map(products.map((p) => [p.id, p]));
        let subtotal = 0;
        const orderItemsData = items.map((item) => {
            const product = productMap.get(item.productId);
            const unitPrice = product.price;
            const lineTotal = unitPrice * item.quantity;
            subtotal += lineTotal;
            return { productId: item.productId, quantity: item.quantity, unitPrice, total: lineTotal };
        });
        let discountAmt = 0;
        let promotionId = null;
        if (promoCode) {
            const result = await this.promotionsService.validateCode(promoCode, subtotal);
            if (result.valid) {
                discountAmt = result.discountAmount;
                promotionId = result.promotionId;
            }
        }
        const total = Math.max(0, subtotal - discountAmt);
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
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5500';
        const backendUrl = this.configService.get('BACKEND_URL') || 'http://localhost:3001';
        const mpItems = items.map((item) => {
            const product = productMap.get(item.productId);
            return {
                id: String(product.id),
                title: product.name,
                description: product.description || product.name,
                picture_url: product.imageUrl ? `${backendUrl}/${product.imageUrl}` : undefined,
                quantity: item.quantity,
                currency_id: 'ARS',
                unit_price: product.price / 100,
            };
        });
        const preferenceClient = new mercadopago_1.Preference(this.mpClient);
        let preference;
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
                    notification_url: `${backendUrl}/payments/webhook`,
                    statement_descriptor: 'MILAN MATERIA',
                },
            });
        }
        catch (mpError) {
            await this.prisma.order.update({
                where: { id: order.id },
                data: { status: 'cancelled' },
            });
            console.error(`Order #${order.id} cancelled: MercadoPago error — ${mpError.message}`);
            throw new common_1.BadRequestException('No se pudo iniciar el pago con MercadoPago. Intente de nuevo.');
        }
        await this.prisma.order.update({
            where: { id: order.id },
            data: { mpPreferenceId: preference.id },
        });
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
        }).catch(() => { });
        return {
            preferenceId: preference.id,
            url: preference.init_point,
            sandboxUrl: preference.sandbox_init_point,
            orderId: order.id,
        };
    }
    async handleWebhook(type, paymentId) {
        if (type !== 'payment' || !paymentId)
            return { received: true };
        try {
            const paymentClient = new mercadopago_1.Payment(this.mpClient);
            const payment = await paymentClient.get({ id: paymentId });
            const orderId = payment.external_reference ? parseInt(payment.external_reference) : null;
            if (!orderId)
                return { received: true };
            if (payment.status === 'approved') {
                await this.prisma.order.update({
                    where: { id: orderId },
                    data: {
                        status: 'paid',
                        mpPaymentId: String(payment.id),
                        paymentMethod: payment.payment_type_id || 'mercadopago',
                    },
                });
                const order = await this.prisma.order.findUnique({ where: { id: orderId } });
                if (order?.promotionId) {
                    await this.prisma.promotion.update({ where: { id: order.promotionId }, data: { usedCount: { increment: 1 } } });
                }
                console.log(`Order #${orderId} marked as PAID via MercadoPago`);
            }
            else if (payment.status === 'rejected' || payment.status === 'cancelled') {
                await this.prisma.order.update({ where: { id: orderId }, data: { status: 'cancelled' } });
            }
        }
        catch (e) {
            console.error('MP webhook error:', e.message);
        }
        return { received: true };
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        promotions_service_1.PromotionsService,
        mail_service_1.MailService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map