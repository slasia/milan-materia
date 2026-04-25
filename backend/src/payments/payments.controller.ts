import { Body, Controller, Post, Query, Req, HttpCode, UseGuards, UnauthorizedException, Logger } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { OptionalCustomerJwtGuard } from '../customers/customer-jwt.guard';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

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
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
  ) {
    this.logger.log(`MP WEBHOOK received — type: "${type}", id: "${paymentId || dataId}"`);

    // Verify HMAC-SHA256 signature when secret is configured
    const secret = this.configService.get<string>('MP_WEBHOOK_SECRET');

    if (secret) {
      const xSignature = req.headers['x-signature'] as string | undefined;
      const xRequestId = req.headers['x-request-id'] as string | undefined;

      if (!xSignature) {
        this.logger.warn('MP WEBHOOK — missing x-signature, rejecting');
        throw new UnauthorizedException('Missing x-signature');
      }

      // For signature verification MP always uses body.data.id, not the query param
      const bodyData = body?.data as Record<string, unknown> | undefined;
      const signatureDataId = (bodyData?.id as string) ?? paymentId ?? dataId ?? '';

      // Extract ts and v1 from x-signature header: "ts=...,v1=..."
      const parts = Object.fromEntries(
        xSignature.split(',').map(p => {
          const idx = p.indexOf('=');
          return [p.slice(0, idx), p.slice(idx + 1)];
        }),
      );
      const ts = parts['ts'];
      const v1 = parts['v1'];

      if (!ts || !v1) {
        this.logger.warn('MP WEBHOOK — malformed x-signature, rejecting');
        throw new UnauthorizedException('Malformed x-signature');
      }

      const manifest = `id:${signatureDataId};request-id:${xRequestId ?? ''};ts:${ts};`;
      const expected = crypto
        .createHmac('sha256', secret.trim())
        .update(manifest)
        .digest('hex');

      const signatureOk = crypto.timingSafeEqual(
        Buffer.from(expected, 'hex'),
        Buffer.from(v1.padEnd(expected.length, '0').slice(0, expected.length), 'hex'),
      );

      if (!signatureOk) {
        this.logger.warn('MP WEBHOOK — invalid signature, rejecting');
        throw new UnauthorizedException('Invalid webhook signature');
      }

      this.logger.log('MP WEBHOOK — signature OK');
    } else {
      this.logger.warn('MP WEBHOOK — MP_WEBHOOK_SECRET not set, skipping signature verification');
    }

    const resolvedType = type || (body?.type as string);
    const resolvedId   = paymentId || dataId || ((body?.data as Record<string, unknown>)?.id as string) || (body?.id as string);
    this.logger.log(`MP WEBHOOK — resolved type: "${resolvedType}" | resolved id: "${resolvedId}"`);

    // Route by event type
    if (resolvedType === 'topic_merchant_order_wh' || resolvedType === 'merchant_order') {
      return this.paymentsService.handleMerchantOrderWebhook(resolvedId);
    }

    return this.paymentsService.handleWebhook(resolvedType, resolvedId);
  }
}
