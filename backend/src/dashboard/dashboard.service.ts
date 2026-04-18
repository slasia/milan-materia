import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboard() {
    const [totalOrders, paidOrders, recentOrders, ordersByStatus, topProductsRaw, revenueAgg] =
      await Promise.all([
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
      ordersByStatus: ordersByStatus.reduce(
        (acc, item) => {
          acc[item.status] = item._count.id;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }
}
