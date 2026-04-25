import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderRepository } from './repositories/order.repository';
import { PrismaOrderRepository } from './repositories/prisma-order.repository';

@Module({
  providers: [
    OrdersService,
    { provide: OrderRepository, useClass: PrismaOrderRepository },
  ],
  controllers: [OrdersController],
  exports: [OrdersService, OrderRepository],
})
export class OrdersModule {}
