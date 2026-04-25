import type { Order, Prisma } from '@prisma/client';

export type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    customer: { select: { id: true; email: true; name: true; phone: true; city: true; province: true } };
    items: {
      include: { product: { select: { id: true; name: true; imageUrl: true } } };
    };
  };
}>;

export type OrderSummary = Prisma.OrderGetPayload<{
  include: {
    customer: { select: { id: true; email: true; name: true; phone: true } };
    items: {
      include: { product: { select: { id: true; name: true } } };
    };
  };
}>;

export type OrderWithItems = Prisma.OrderGetPayload<{
  include: {
    items: { include: { product: { select: { id: true; name: true } } } };
  };
}>;

export type OrderFilters = {
  status?: string;
  page?: number;
  limit?: number;
};

export type PaginatedOrders = {
  data: OrderSummary[];
  total: number;
};

export type StatusCount = {
  status: string;
  count: number;
};

export type DailyRevenue = {
  total: number;
  createdAt: Date;
};

export abstract class OrderRepository {
  abstract findById(id: number): Promise<OrderWithRelations | null>;
  abstract findAll(filters?: OrderFilters): Promise<PaginatedOrders>;
  abstract create(data: Prisma.OrderCreateInput, tx?: Prisma.TransactionClient): Promise<Order>;
  abstract update(id: number, data: Prisma.OrderUpdateInput): Promise<Order>;
  abstract findByCustomerId(customerId: number): Promise<OrderWithItems[]>;
  abstract findWithItems(id: number): Promise<OrderWithItems | null>;

  // Analytics
  abstract count(where?: Prisma.OrderWhereInput): Promise<number>;
  abstract findRecent(take: number): Promise<OrderSummary[]>;
  abstract groupByStatus(): Promise<StatusCount[]>;
  abstract aggregateRevenue(): Promise<number>;
  abstract findPaidSince(date: Date): Promise<DailyRevenue[]>;

  // Promotions
  abstract incrementPromotionUsage(promotionId: number): Promise<void>;
}
