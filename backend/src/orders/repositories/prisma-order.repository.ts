import { Injectable } from '@nestjs/common';
import type { Order, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  OrderRepository,
  OrderWithRelations,
  OrderSummary,
  OrderWithItems,
  OrderFilters,
  PaginatedOrders,
  StatusCount,
  DailyRevenue,
} from './order.repository';

@Injectable()
export class PrismaOrderRepository extends OrderRepository {
  constructor(private prisma: PrismaService) {
    super();
  }

  async findById(id: number): Promise<OrderWithRelations | null> {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, email: true, name: true, phone: true, city: true, province: true },
        },
        items: {
          include: { product: { select: { id: true, name: true, imageUrl: true } } },
        },
      },
    });
  }

  async findAll(filters?: OrderFilters): Promise<PaginatedOrders> {
    const page  = filters?.page  || 1;
    const limit = filters?.limit || 20;
    const skip  = (page - 1) * limit;
    const where: Prisma.OrderWhereInput = {};
    if (filters?.status) where.status = filters.status;

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          customer: { select: { id: true, email: true, name: true, phone: true } },
          items: { include: { product: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data, total };
  }

  async create(data: Prisma.OrderCreateInput, tx?: Prisma.TransactionClient): Promise<Order> {
    const client = tx ?? this.prisma;
    return client.order.create({ data });
  }

  async update(id: number, data: Prisma.OrderUpdateInput): Promise<Order> {
    return this.prisma.order.update({ where: { id }, data });
  }

  async findByCustomerId(customerId: number): Promise<OrderWithItems[]> {
    return this.prisma.order.findMany({
      where: { customerId },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, imageUrl: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findWithItems(id: number): Promise<OrderWithItems | null> {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { id: true, name: true } } } },
      },
    });
  }

  async count(where?: Prisma.OrderWhereInput): Promise<number> {
    return this.prisma.order.count({ where });
  }

  async findRecent(take: number): Promise<OrderSummary[]> {
    return this.prisma.order.findMany({
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, email: true, name: true, phone: true } },
        items: { include: { product: { select: { id: true, name: true } } } },
      },
    });
  }

  async groupByStatus(): Promise<StatusCount[]> {
    const rows = await this.prisma.order.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    return rows.map(r => ({ status: r.status, count: r._count.id }));
  }

  async aggregateRevenue(): Promise<number> {
    const agg = await this.prisma.order.aggregate({
      _sum: { total: true },
      where: { status: 'paid' },
    });
    return agg._sum.total ?? 0;
  }

  async findPaidSince(date: Date): Promise<DailyRevenue[]> {
    return this.prisma.order.findMany({
      where: { status: 'paid', createdAt: { gte: date } },
      select: { total: true, createdAt: true },
    });
  }

  async incrementPromotionUsage(promotionId: number): Promise<void> {
    await this.prisma.promotion.update({
      where: { id: promotionId },
      data: { usedCount: { increment: 1 } },
    });
  }
}
