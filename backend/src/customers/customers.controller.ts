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
import { LoginCustomerDto } from './dto/login-customer.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
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
  login(@Body() dto: LoginCustomerDto) {
    return this.customersService.login(dto.email, dto.password);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.customersService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.customersService.resetPassword(dto.email, dto.code, dto.password);
  }

  // ── Email verification (requires customer JWT) ────────────────────────────

  @Post('verify')
  @UseGuards(RequireCustomerJwtGuard)
  verify(@Req() req: any, @Body() dto: VerifyEmailDto) {
    return this.customersService.verifyEmail(req.user.id, dto.code);
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
