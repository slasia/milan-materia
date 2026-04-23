import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Req,
  UseGuards,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { RequireCustomerJwtGuard } from './customer-jwt.guard';
import { AdminJwtGuard } from '../auth/auth.guard';

@Controller('auth/customer')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // ── Public auth ───────────────────────────────────────────────────────────

  @Post('register')
  register(@Body() dto: RegisterCustomerDto) {
    return this.customersService.register(dto);
  }

  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.customersService.login(body.email, body.password);
  }

  @Post('forgot-password')
  forgotPassword(@Body() body: { email: string }) {
    return this.customersService.forgotPassword(body.email);
  }

  @Post('reset-password')
  resetPassword(@Body() body: { email: string; code: string; password: string }) {
    return this.customersService.resetPassword(body.email, body.code, body.password);
  }

  // ── Email verification (requires customer JWT) ────────────────────────────

  @Post('verify')
  @UseGuards(RequireCustomerJwtGuard)
  verify(@Req() req: any, @Body() body: { code: string }) {
    return this.customersService.verifyEmail(req.user.id, body.code);
  }

  @Post('resend-verification')
  @UseGuards(RequireCustomerJwtGuard)
  resendVerification(@Req() req: any) {
    return this.customersService.resendVerification(req.user.id);
  }

  // ── Customer profile (requires customer JWT) ──────────────────────────────

  @Get('me')
  @UseGuards(RequireCustomerJwtGuard)
  getMe(@Req() req: any) {
    return this.customersService.getProfile(req.user.id);
  }

  @Patch('me')
  @UseGuards(RequireCustomerJwtGuard)
  updateMe(@Req() req: any, @Body() dto: UpdateCustomerDto) {
    return this.customersService.updateProfile(req.user.id, dto);
  }

  @Get('me/orders')
  @UseGuards(RequireCustomerJwtGuard)
  getMyOrders(@Req() req: any) {
    return this.customersService.getOrders(req.user.id);
  }
}

// ── Admin customer routes (separate controller prefix) ────────────────────────

@Controller('admin/customers')
export class AdminCustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @UseGuards(AdminJwtGuard)
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.customersService.findAllAdmin({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
    });
  }

  @UseGuards(AdminJwtGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.findOneAdmin(id);
  }
}
