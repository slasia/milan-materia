import { Module } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { PromotionsController } from './promotions.controller';
import { PromotionRepository } from './repositories/promotion.repository';
import { PrismaPromotionRepository } from './repositories/prisma-promotion.repository';

@Module({
  providers: [
    PromotionsService,
    { provide: PromotionRepository, useClass: PrismaPromotionRepository },
  ],
  controllers: [PromotionsController],
  exports: [PromotionsService, PromotionRepository],
})
export class PromotionsModule {}
