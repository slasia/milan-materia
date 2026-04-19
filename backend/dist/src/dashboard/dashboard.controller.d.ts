import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private dashboardService;
    constructor(dashboardService: DashboardService);
    getDashboard(): Promise<{
        totalOrders: number;
        paidOrders: number;
        totalRevenue: number;
        topProducts: {
            product: {
                id: number;
                name: string;
                imageUrl: string;
            };
            totalQuantity: number;
            totalRevenue: number;
        }[];
        recentOrders: ({
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
        dailyRevenue: {
            date: string;
            revenue: number;
            count: number;
        }[];
        ordersByStatus: Record<string, number>;
    }>;
}
