import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboard() {
    // Build 30-day date window
    const now = new Date();
    const since = new Date(now);
    since.setDate(since.getDate() - 29);
    since.setHours(0, 0, 0, 0);

    const [totalOrders, paidOrders, recentOrders, ordersByStatus, topProductsRaw, revenueAgg, paidLast30] =
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
        this.prisma.order.findMany({
          where: { status: 'paid', createdAt: { gte: since } },
          select: { total: true, createdAt: true },
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

    // Build daily revenue map for last 30 days
    const revenueByDay = new Map<string, { revenue: number; count: number }>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      revenueByDay.set(key, { revenue: 0, count: 0 });
    }
    for (const order of paidLast30) {
      const key = order.createdAt.toISOString().slice(0, 10);
      if (revenueByDay.has(key)) {
        const day = revenueByDay.get(key)!;
        day.revenue += order.total;
        day.count += 1;
      }
    }
    const dailyRevenue = Array.from(revenueByDay.entries()).map(([date, vals]) => ({
      date,
      revenue: vals.revenue,
      count: vals.count,
    }));

    return {
      totalOrders,
      paidOrders,
      totalRevenue: revenueAgg._sum.total || 0,
      topProducts,
      recentOrders,
      dailyRevenue,
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
