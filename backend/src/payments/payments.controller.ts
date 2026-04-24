import { Body, Controller, Post, Query, Req, HttpCode, UseGuards, UnauthorizedException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { OptionalCustomerJwtGuard } from '../customers/customer-jwt.guard';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';

@Controller('payments')
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    private configService: ConfigService,
  ) {}

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
    @Query('data.id') dataId: string,
    @Body() body: any,
    @Req() req: Request,
  ) {
    // Verify HMAC-SHA256 signature when secret is configured
    const secret = this.configService.get<string>('MP_WEBHOOK_SECRET');
    if (secret) {
      const xSignature = req.headers['x-signature'] as string;
      const xRequestId = req.headers['x-request-id'] as string;
      const resolvedDataId = paymentId || dataId || body?.data?.id;

      if (!xSignature) throw new UnauthorizedException('Missing x-signature');

      // Extract ts and v1 from x-signature header: "ts=...,v1=..."
      const parts = Object.fromEntries(
        xSignature.split(',').map(p => p.split('=') as [string, string]),
      );
      const ts = parts['ts'];
      const v1 = parts['v1'];

      if (!ts || !v1) throw new UnauthorizedException('Malformed x-signature');

      // Build manifest string as per MercadoPago docs
      const manifest = `id:${resolvedDataId};request-id:${xRequestId};ts:${ts};`;
      const expected = crypto
        .createHmac('sha256', secret)
        .update(manifest)
        .digest('hex');

      if (expected !== v1) throw new UnauthorizedException('Invalid webhook signature');
    }

    const resolvedType = type || body?.type;
    const resolvedId   = paymentId || dataId || body?.data?.id;
    return this.paymentsService.handleWebhook(resolvedType, resolvedId);
  }
}
