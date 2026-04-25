import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { DashboardRepository } from './repositories/dashboard.repository';
import { PrismaDashboardRepository } from './repositories/prisma-dashboard.repository';

@Module({
  providers: [
    DashboardService,
    { provide: DashboardRepository, useClass: PrismaDashboardRepository },
  ],
  controllers: [DashboardController],
})
export class DashboardModule {}
