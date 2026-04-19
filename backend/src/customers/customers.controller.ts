import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Req,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { LoginCustomerDto } from './dto/login-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerJwtGuard } from './customer-jwt.guard';
import { JwtAuthGuard } from '../auth/auth.guard';
import { Request } from 'express';

@Controller('auth/customer')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post('register')
  register(@Body() dto: RegisterCustomerDto) {
    return this.customersService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginCustomerDto) {
    return this.customersService.login(dto);
  }

  @Get('me')
  @UseGuards(CustomerJwtGuard)
  me(@Req() req: Request) {
    const user = req['user'] as { id: number };
    return this.customersService.findById(user.id);
  }

  @Patch('me')
  @UseGuards(CustomerJwtGuard)
  update(@Req() req: Request, @Body() dto: UpdateCustomerDto) {
    const user = req['user'] as { id: number };
    return this.customersService.update(user.id, dto);
  }

  @Get('me/orders')
  @UseGuards(CustomerJwtGuard)
  myOrders(@Req() req: Request) {
    const user = req['user'] as { id: number };
    return this.customersService.getOrders(user.id);
  }

}

@Controller('admin/customers')
export class AdminCustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.customersService.adminFindAll({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.adminFindOne(id);
  }
}
