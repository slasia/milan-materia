import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AdminJwtGuard } from '../auth/auth.guard';

@Controller()
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  /** Public order lookup — returns only safe, non-PII fields (BUG-03 fix) */
  @Get('orders/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const order = await this.ordersService.findOne(id);
    return {
      id: order.id,
      status: order.status,
      trackingNumber: order.trackingNumber ?? null,
      adminNotes: order.adminNotes ?? null,
      createdAt: order.createdAt,
      items: order.items.map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
        product: item.product
          ? { id: item.product.id, name: item.product.name, imageUrl: item.product.imageUrl }
          : null,
      })),
    };
  }

  @UseGuards(AdminJwtGuard)
  @Get('admin/orders')
  findAll(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.findAll({
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @UseGuards(AdminJwtGuard)
  @Get('admin/orders/:id')
  findOneAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findOne(id);
  }

  @UseGuards(AdminJwtGuard)
  @Patch('admin/orders/:id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, updateOrderStatusDto);
  }
}
