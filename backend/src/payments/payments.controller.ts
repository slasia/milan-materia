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
    @Body() body: any,
    @Req() req: Request,
  ) {
    // ── LOG: full incoming request ──────────────────────────────────────────
    this.logger.log('MP WEBHOOK received');
    this.logger.log(`Query params: ${JSON.stringify({ type, paymentId, dataId })}`);
    this.logger.log(`Body: ${JSON.stringify(body)}`);
    this.logger.log(`Headers: ${JSON.stringify({
      'x-signature'  : req.headers['x-signature'],
      'x-request-id' : req.headers['x-request-id'],
      'content-type' : req.headers['content-type'],
      'user-agent'   : req.headers['user-agent'],
    })}`);
    // ───────────────────────────────────────────────────────────────────────

    // Verify HMAC-SHA256 signature when secret is configured
    const secret = this.configService.get<string>('MP_WEBHOOK_SECRET');

    this.logger.log(`Secret configured: ${secret ? `yes (starts: ${secret.slice(0,8)}...)` : 'NO — skipping verification'}`);

    if (secret) {
      const xSignature  = req.headers['x-signature']  as string | undefined;
      const xRequestId  = req.headers['x-request-id'] as string | undefined;

      // For signature verification MP always uses body.data.id, not the query param
      const signatureDataId = body?.data?.id ?? paymentId ?? dataId ?? '';

      this.logger.log(`Signature inputs: ${JSON.stringify({
        xSignature,
        xRequestId: xRequestId ?? '(missing — will use empty string)',
        signatureDataId,
      })}`);

      if (!xSignature) {
        this.logger.warn('MP WEBHOOK — missing x-signature, rejecting');
        throw new UnauthorizedException('Missing x-signature');
      }

      // Extract ts and v1 from x-signature header: "ts=...,v1=..."
      const parts = Object.fromEntries(
        xSignature.split(',').map(p => {
          const idx = p.indexOf('=');
          return [p.slice(0, idx), p.slice(idx + 1)];
        }),
      );
      const ts = parts['ts'];
      const v1 = parts['v1'];

      this.logger.log(`Parsed signature: ${JSON.stringify({ ts, v1 })}`);

      if (!ts || !v1) {
        this.logger.warn(`MP WEBHOOK — malformed x-signature: ${xSignature}`);
        throw new UnauthorizedException('Malformed x-signature');
      }

      const manifest = `id:${signatureDataId};request-id:${xRequestId ?? ''};ts:${ts};`;
      const expected = crypto
        .createHmac('sha256', secret.trim())
        .update(manifest)
        .digest('hex');

      const isLiveMode = body?.live_mode === true;
      const signatureOk = expected === v1;

      this.logger.log(`Manifest: ${manifest}`);
      this.logger.log(`Expected hash: ${expected} | Received hash: ${v1} | Match: ${signatureOk} | Live mode: ${isLiveMode}`);

      if (!signatureOk) {
        if (isLiveMode) {
          // Production: reject invalid signatures
          this.logger.warn('MP WEBHOOK — invalid signature in LIVE mode, rejecting');
          throw new UnauthorizedException('Invalid webhook signature');
        } else {
          // Sandbox: MP may sign with a different key — warn but allow through
          this.logger.warn('MP WEBHOOK — invalid signature in SANDBOX mode, allowing through (known MP sandbox behavior)');
        }
      } else {
        this.logger.log('MP WEBHOOK — signature OK');
      }
    } else {
      this.logger.warn('MP WEBHOOK — MP_WEBHOOK_SECRET not set, skipping signature verification');
    }

    const resolvedType = type || body?.type;
    const resolvedId   = paymentId || dataId || body?.data?.id || body?.id;
    this.logger.log(`MP WEBHOOK — resolved type: "${resolvedType}" | resolved id: "${resolvedId}"`);

    // Route by event type
    if (resolvedType === 'topic_merchant_order_wh' || resolvedType === 'merchant_order') {
      return this.paymentsService.handleMerchantOrderWebhook(resolvedId);
    }

    return this.paymentsService.handleWebhook(resolvedType, resolvedId);
  }
}
