import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService, private mail: MailService) {}

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, email: true, name: true, phone: true, city: true, province: true },
        },
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
          customer: {
            select: { id: true, email: true, name: true, phone: true },
          },
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

  async updateStatus(id: number, dto: UpdateOrderStatusDto) {
    const existing = await this.findOne(id);

    const updateData: any = { status: dto.status };
    if (dto.trackingNumber !== undefined) updateData.trackingNumber = dto.trackingNumber;
    if (dto.adminNotes !== undefined) updateData.adminNotes = dto.adminNotes;

    const updated = await this.prisma.order.update({
      where: { id },
      data: updateData,
    });

    // Prefer stored customer fields; fall back to linked Customer record
    const customerEmail = existing.customerEmail ?? existing.customer?.email;
    const customerName  = existing.customerName  ?? existing.customer?.name;

    // Notify admin of status change (fire-and-forget)
    this.mail.sendStatusUpdate({
      id: updated.id,
      status: updated.status,
      total: updated.total,
      customerName: customerName ?? undefined,
      customerEmail: customerEmail ?? undefined,
    }).catch(() => {});

    // Notify customer if they have an email (fire-and-forget)
    if (customerEmail) {
      this.mail.sendCustomerStatusUpdate({
        id: updated.id,
        status: updated.status,
        total: updated.total,
        customerName: customerName ?? undefined,
        customerEmail,
        trackingNumber: updated.trackingNumber ?? undefined,
        adminNotes: updated.adminNotes ?? undefined,
        items: existing.items.map(i => ({
          name: i.product?.name ?? 'Producto',
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      }).catch(() => {});
    }

    return updated;
  }
}
