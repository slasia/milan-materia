import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService, private mail: MailService) {}

  async findOne(id: number) {
    console.log(`[SHOP] Fetching order #${id}`);
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, email: true, name: true, phone: true, city: true, province: true },
        },
        items: {
          include: {
            product: { select: { id: true, name: true, imageUrl: true } },
          },
        },
      },
    });
    if (!order) {
      console.warn(`[SHOP] Order #${id} not found`);
      throw new NotFoundException(`Order #${id} not found`);
    }
    console.log(`[SHOP] Order #${id} found — status: ${order.status}, customer: ${order.customerEmail ?? 'guest'}`);
    return order;
  }

  async findAll(filters?: { status?: string; page?: number; limit?: number }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filters?.status) where.status = filters.status;

    console.log(`[ADMIN] Fetching orders — page: ${page}, limit: ${limit}, status: ${filters?.status ?? 'all'}`);

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          customer: { select: { id: true, email: true, name: true, phone: true } },
          items: {
            include: { product: { select: { id: true, name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    console.log(`[ADMIN] Returned ${orders.length} orders (total: ${total})`);
    return {
      data: orders,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async updateStatus(id: number, dto: UpdateOrderStatusDto) {
    const existing = await this.findOne(id);
    console.log(`[ADMIN] Updating order #${id} status: "${existing.status}" → "${dto.status}"`);

    const updateData: any = { status: dto.status };
    if (dto.trackingNumber !== undefined) updateData.trackingNumber = dto.trackingNumber;
    if (dto.adminNotes !== undefined) updateData.adminNotes = dto.adminNotes;

    const updated = await this.prisma.order.update({ where: { id }, data: updateData });

    const customerEmail = existing.customerEmail ?? existing.customer?.email;
    const customerName  = existing.customerName  ?? existing.customer?.name;

    console.log(`[ADMIN] Order #${id} updated — notifying admin and customer (${customerEmail ?? 'no email'})`);

    this.mail.sendStatusUpdate({
      id: updated.id,
      status: updated.status,
      total: updated.total,
      customerName: customerName ?? undefined,
      customerEmail: customerEmail ?? undefined,
    }).catch(() => {});

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
