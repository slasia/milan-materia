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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let DashboardService = class DashboardService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDashboard() {
        const [totalOrders, paidOrders, recentOrders, ordersByStatus, topProductsRaw, revenueAgg] = await Promise.all([
            this.prisma.order.count(),
            this.prisma.order.count({ where: { status: 'paid' } }),
            this.prisma.order.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' },
                include: {
                    items: {
                        include: { product: { select: { id: true, name: true } } },
                    },
                },
            }),
            this.prisma.order.groupBy({
                by: ['status'],
                _count: { id: true },
            }),
            this.prisma.orderItem.groupBy({
                by: ['productId'],
                _sum: { quantity: true, total: true },
                orderBy: { _sum: { total: 'desc' } },
                take: 5,
            }),
            this.prisma.order.aggregate({
                _sum: { total: true },
                where: { status: 'paid' },
            }),
        ]);
        const productIds = topProductsRaw.map((p) => p.productId);
        const topProductDetails = await this.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, imageUrl: true },
        });
        const topProducts = topProductsRaw.map((item) => {
            const product = topProductDetails.find((p) => p.id === item.productId);
            return {
                product,
                totalQuantity: item._sum.quantity,
                totalRevenue: item._sum.total,
            };
        });
        return {
            totalOrders,
            paidOrders,
            totalRevenue: revenueAgg._sum.total || 0,
            topProducts,
            recentOrders,
            ordersByStatus: ordersByStatus.reduce((acc, item) => {
                acc[item.status] = item._count.id;
                return acc;
            }, {}),
        };
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map