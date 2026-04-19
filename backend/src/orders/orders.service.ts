import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService, private mail: MailService) {}

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, imageUrl: true },
            },
          },
        },
      },
    });
    if (!order) throw new NotFoundException(`Order #${id} not found`);
    return order;
  }

  async findAll(filters?: { status?: string; page?: number; limit?: number }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filters?.status) where.status = filters.status;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async updateStatus(id: number, status: string) {
    const existing = await this.findOne(id);
    const updated = await this.prisma.order.update({
      where: { id },
      data: { status },
    });

    // Notify admin of status change (fire-and-forget)
    this.mail.sendStatusUpdate({
      id: updated.id,
      status: updated.status,
      total: updated.total,
      customerName: existing.customerName ?? undefined,
      customerEmail: existing.customerEmail ?? undefined,
    }).catch(() => {/* ignore mail errors */});

    return updated;
  }
}
