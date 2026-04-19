import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PromotionsModule } from '../promotions/promotions.module';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [PromotionsModule, CustomersModule],
  providers: [PaymentsService],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
