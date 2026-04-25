import type { Prisma } from '@prisma/client';

export type TopProductRow = {
  productId: number;
  totalQuantity: number;
  totalRevenue: number;
};

export type ProductSummary = {
  id: number;
  name: string;
  imageUrl: string | null;
};

export type RecentOrder = Prisma.OrderGetPayload<{
  include: {
    items: { include: { product: { select: { id: true; name: true } } } };
  };
}>;

export type StatusCount = {
  status: string;
  count: number;
};

export type DailyRevenue = {
  total: number;
  createdAt: Date;
};

export abstract class DashboardRepository {
  abstract getOrderCounts(): Promise<{ total: number; paid: number }>;
  abstract getRecentOrders(take: number): Promise<RecentOrder[]>;
  abstract getOrdersByStatus(): Promise<StatusCount[]>;
  abstract getTopProducts(take: number): Promise<TopProductRow[]>;
  abstract getProductsByIds(ids: number[]): Promise<ProductSummary[]>;
  abstract getTotalRevenue(): Promise<number>;
  abstract getPaidOrdersSince(date: Date): Promise<DailyRevenue[]>;
}
