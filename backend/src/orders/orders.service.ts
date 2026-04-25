import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import type { Order } from '@prisma/client';
import { OrderRepository, OrderWithRelations, PaginatedOrders } from './repositories/order.repository';
import { MailService } from '../mail/mail.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private orderRepo: OrderRepository,
    private mail: MailService,
  ) {}

  async findOne(id: number): Promise<OrderWithRelations> {
    this.logger.log(`Fetching order #${id}`);
    const order = await this.orderRepo.findById(id);
    if (!order) {
      this.logger.warn(`Order #${id} not found`);
      throw new NotFoundException(`Order #${id} not found`);
    }
    this.logger.log(`Order #${id} found — status: ${order.status}, customer: ${order.customerEmail ?? 'guest'}`);
    return order;
  }

  async findAll(filters?: { status?: string; page?: number; limit?: number }): Promise<
    PaginatedOrders & { meta: { total: number; page: number; limit: number; pages: number } }
  > {
    const page  = filters?.page  || 1;
    const limit = filters?.limit || 20;
    this.logger.log(`Fetching orders — page: ${page}, limit: ${limit}, status: ${filters?.status ?? 'all'}`);

    const { data, total } = await this.orderRepo.findAll(filters);
    this.logger.log(`Returned ${data.length} orders (total: ${total})`);

    return {
      data,
      total,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async updateStatus(id: number, dto: UpdateOrderStatusDto): Promise<Order> {
    const existing = await this.findOne(id);
    this.logger.log(`Updating order #${id} status: "${existing.status}" → "${dto.status}"`);

    // Auto-set status to 'shipped' when a tracking number is provided
    let resolvedStatus = dto.status;
    if (dto.trackingNumber?.trim() && !['shipped', 'delivered'].includes(resolvedStatus)) {
      resolvedStatus = 'shipped';
      this.logger.log(`Order #${id} — status auto-set to 'shipped' because tracking number was provided`);
    }

    const updateData: Record<string, string | undefined> = { status: resolvedStatus };
    if (dto.trackingNumber !== undefined) updateData.trackingNumber = dto.trackingNumber;
    if (dto.adminNotes     !== undefined) updateData.adminNotes     = dto.adminNotes;

    const updated = await this.orderRepo.update(id, updateData);

    const customerEmail = existing.customerEmail ?? existing.customer?.email;
    const customerName  = existing.customerName  ?? existing.customer?.name;

    this.logger.log(`Order #${id} updated — notifying admin and customer (${customerEmail ?? 'no email'})`);

    this.mail.sendStatusUpdate({
      id:            updated.id,
      status:        updated.status,
      total:         updated.total,
      customerName:  customerName  ?? undefined,
      customerEmail: customerEmail ?? undefined,
    }).catch(() => {});

    if (customerEmail) {
      this.mail.sendCustomerStatusUpdate({
        id:             updated.id,
        status:         updated.status,
        total:          updated.total,
        customerName:   customerName  ?? undefined,
        customerEmail,
        trackingNumber: updated.trackingNumber ?? undefined,
        adminNotes:     updated.adminNotes     ?? undefined,
        items: existing.items.map(i => ({
          name:      i.product?.name ?? 'Producto',
          quantity:  i.quantity,
          unitPrice: i.unitPrice,
        })),
      }).catch(() => {});
    }

    return updated;
  }
}
