import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DashboardRepository,
  TopProductRow,
  ProductSummary,
  RecentOrder,
  StatusCount,
  DailyRevenue,
} from './dashboard.repository';

@Injectable()
export class PrismaDashboardRepository extends DashboardRepository {
  constructor(private prisma: PrismaService) {
    super();
  }

  async getOrderCounts(): Promise<{ total: number; paid: number }> {
    const [total, paid] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'paid' } }),
    ]);
    return { total, paid };
  }

  async getRecentOrders(take: number): Promise<RecentOrder[]> {
    return this.prisma.order.findMany({
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: { product: { select: { id: true, name: true } } },
        },
      },
    });
  }

  async getOrdersByStatus(): Promise<StatusCount[]> {
    const rows = await this.prisma.order.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    return rows.map(r => ({ status: r.status, count: r._count.id }));
  }

  async getTopProducts(take: number): Promise<TopProductRow[]> {
    const rows = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { total: 'desc' } },
      take,
    });
    return rows.map(r => ({
      productId: r.productId,
      totalQuantity: r._sum.quantity ?? 0,
      totalRevenue: r._sum.total ?? 0,
    }));
  }

  async getProductsByIds(ids: number[]): Promise<ProductSummary[]> {
    return this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, imageUrl: true },
    });
  }

  async getTotalRevenue(): Promise<number> {
    const agg = await this.prisma.order.aggregate({
      _sum: { total: true },
      where: { status: 'paid' },
    });
    return agg._sum.total ?? 0;
  }

  async getPaidOrdersSince(date: Date): Promise<DailyRevenue[]> {
    return this.prisma.order.findMany({
      where: { status: 'paid', createdAt: { gte: date } },
      select: { total: true, createdAt: true },
    });
  }
}
