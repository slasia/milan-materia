import { PrismaService } from '../prisma/prisma.service';
export declare class OrdersService {
    private prisma;
    constructor(prisma: PrismaService);
    findOne(id: number): Promise<{
        items: ({
            product: {
                id: number;
                name: string;
                imageUrl: string;
            };
        } & {
            id: number;
            productId: number;
            quantity: number;
            unitPrice: number;
            total: number;
            orderId: number;
        })[];
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        discountAmt: number;
        customerEmail: string | null;
        customerName: string | null;
        customerPhone: string | null;
        promoCode: string | null;
        shippingAddress: string | null;
        notes: string | null;
        total: number;
        status: string;
        subtotal: number;
        promotionId: number | null;
        mpPreferenceId: string | null;
        mpPaymentId: string | null;
        paymentMethod: string | null;
    }>;
    findAll(filters?: {
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: ({
            items: ({
                product: {
                    id: number;
                    name: string;
                };
            } & {
                id: number;
                productId: number;
                quantity: number;
                unitPrice: number;
                total: number;
                orderId: number;
            })[];
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            discountAmt: number;
            customerEmail: string | null;
            customerName: string | null;
            customerPhone: string | null;
            promoCode: string | null;
            shippingAddress: string | null;
            notes: string | null;
            total: number;
            status: string;
            subtotal: number;
            promotionId: number | null;
            mpPreferenceId: string | null;
            mpPaymentId: string | null;
            paymentMethod: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    updateStatus(id: number, status: string): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        discountAmt: number;
        customerEmail: string | null;
        customerName: string | null;
        customerPhone: string | null;
        promoCode: string | null;
        shippingAddress: string | null;
        notes: string | null;
        total: number;
        status: string;
        subtotal: number;
        promotionId: number | null;
        mpPreferenceId: string | null;
        mpPaymentId: string | null;
        paymentMethod: string | null;
    }>;
}
