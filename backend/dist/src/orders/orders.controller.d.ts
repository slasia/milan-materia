import { OrdersService } from './orders.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
export declare class OrdersController {
    private ordersService;
    constructor(ordersService: OrdersService);
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
    findAll(status?: string, page?: string, limit?: string): Promise<{
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
    findOneAdmin(id: number): Promise<{
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
    updateStatus(id: number, updateOrderStatusDto: UpdateOrderStatusDto): Promise<{
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
