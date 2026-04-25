import { Injectable } from '@nestjs/common';
import { DashboardRepository } from './repositories/dashboard.repository';

@Injectable()
export class DashboardService {
  constructor(private dashboardRepo: DashboardRepository) {}

  async getDashboard() {
    const now   = new Date();
    const since = new Date(now);
    since.setDate(since.getDate() - 29);
    since.setHours(0, 0, 0, 0);

    const [
      { total: totalOrders, paid: paidOrders },
      recentOrders,
      ordersByStatusRaw,
      topProductsRaw,
      totalRevenue,
      paidLast30,
    ] = await Promise.all([
      this.dashboardRepo.getOrderCounts(),
      this.dashboardRepo.getRecentOrders(10),
      this.dashboardRepo.getOrdersByStatus(),
      this.dashboardRepo.getTopProducts(5),
      this.dashboardRepo.getTotalRevenue(),
      this.dashboardRepo.getPaidOrdersSince(since),
    ]);

    const productIds     = topProductsRaw.map(p => p.productId);
    const productDetails = await this.dashboardRepo.getProductsByIds(productIds);

    const topProducts = topProductsRaw.map(item => ({
      product:       productDetails.find(p => p.id === item.productId) ?? null,
      totalQuantity: item.totalQuantity,
      totalRevenue:  item.totalRevenue,
    }));

    // Build daily revenue map for the last 30 days
    const revenueByDay = new Map<string, { revenue: number; count: number }>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      revenueByDay.set(d.toISOString().slice(0, 10), { revenue: 0, count: 0 });
    }
    for (const order of paidLast30) {
      const key = order.createdAt.toISOString().slice(0, 10);
      const day = revenueByDay.get(key);
      if (day) {
        day.revenue += order.total;
        day.count   += 1;
      }
    }
    const dailyRevenue = Array.from(revenueByDay.entries()).map(([date, vals]) => ({
      date,
      revenue: vals.revenue,
      count:   vals.count,
    }));

    const ordersByStatus = ordersByStatusRaw.reduce<Record<string, number>>(
      (acc, { status, count }) => { acc[status] = count; return acc; },
      {},
    );

    return {
      totalOrders,
      paidOrders,
      totalRevenue,
      topProducts,
      recentOrders,
      dailyRevenue,
      ordersByStatus,
    };
  }
}
