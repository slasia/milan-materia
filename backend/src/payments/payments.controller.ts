import { Body, Controller, Post, Query, Req, HttpCode, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { OptionalCustomerJwtGuard } from '../customers/customer-jwt.guard';
import { Request } from 'express';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('create-checkout-session')
  @UseGuards(OptionalCustomerJwtGuard)
  createCheckoutSession(@Body() dto: CreateCheckoutDto, @Req() req: Request) {
    const user = req['user'] as { id: number; email: string } | undefined;
    return this.paymentsService.createCheckoutSession(dto, user?.id);
  }

  // MercadoPago IPN webhook — receives ?type=payment&id=xxx
  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Query('type') type: string,
    @Query('id') paymentId: string,
    @Body() body: any,
  ) {
    const resolvedType = type || body?.type;
    const resolvedId   = paymentId || body?.data?.id;
    return this.paymentsService.handleWebhook(resolvedType, resolvedId);
  }
}
