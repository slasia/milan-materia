import { Body, Controller, Post, Query, HttpCode } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('create-checkout-session')
  createCheckoutSession(@Body() dto: CreateCheckoutDto) {
    return this.paymentsService.createCheckoutSession(dto);
  }

  // MercadoPago IPN webhook — receives ?type=payment&id=xxx
  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Query('type') type: string,
    @Query('id') paymentId: string,
    @Body() body: any,
  ) {
    // MP sends either query params or body depending on notification type
    const resolvedType = type || body?.type;
    const resolvedId   = paymentId || body?.data?.id;
    return this.paymentsService.handleWebhook(resolvedType, resolvedId);
  }
}
