import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AdminJwtGuard } from '../auth/auth.guard';

@Controller('admin/dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @UseGuards(AdminJwtGuard)
  @Get()
  getDashboard() {
    return this.dashboardService.getDashboard();
  }
}
