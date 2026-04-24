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
    // ── LOG: full incoming request ──────────────────────────────────────────
    console.log('═══════════════ MP WEBHOOK ═══════════════');
    console.log('Query params :', { type, paymentId, dataId });
    console.log('Body         :', JSON.stringify(body, null, 2));
    console.log('Headers      :', {
      'x-signature'  : req.headers['x-signature'],
      'x-request-id' : req.headers['x-request-id'],
      'content-type' : req.headers['content-type'],
      'user-agent'   : req.headers['user-agent'],
    });
    // ───────────────────────────────────────────────────────────────────────

    // Verify HMAC-SHA256 signature when secret is configured
    const secret = this.configService.get<string>('MP_WEBHOOK_SECRET');

    // ── Signature debug info ────────────────────────────────────────────────
    console.log('Secret configured :', secret ? `yes (starts: ${secret.slice(0,8)}... ends: ...${secret.slice(-4)})` : 'NO — skipping verification');
    // ────────────────────────────────────────────────────────────────────────

    if (secret) {
      const xSignature  = req.headers['x-signature']  as string | undefined;
      const xRequestId  = req.headers['x-request-id'] as string | undefined;

      // For signature verification MP always uses body.data.id, not the query param
      const signatureDataId = body?.data?.id ?? paymentId ?? dataId ?? '';

      console.log('Signature inputs  :', {
        xSignature,
        xRequestId: xRequestId ?? '(missing — will use empty string)',
        signatureDataId,
      });

      if (!xSignature) {
        console.warn('MP WEBHOOK — missing x-signature, rejecting');
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

      console.log('Parsed signature  :', { ts, v1 });

      if (!ts || !v1) {
        console.warn('MP WEBHOOK — malformed x-signature:', xSignature);
        throw new UnauthorizedException('Malformed x-signature');
      }

      const trimmedSecret = secret.trim();
      const id  = signatureDataId;
      const rid = xRequestId ?? '';

      // Try every known manifest variant — one of these must match
      const candidates: Record<string, string> = {
        'id;rid;ts (official)'  : `id:${id};request-id:${rid};ts:${ts};`,
        'id;rid;ts (no trail)' : `id:${id};request-id:${rid};ts:${ts}`,
        'id;ts (no rid)'       : `id:${id};ts:${ts};`,
        'ts;id;rid'            : `ts:${ts};id:${id};request-id:${rid};`,
        'ts;id'                : `ts:${ts};id:${id};`,
        'plain concat'         : `${ts}${id}${rid}`,
      };

      const hmac = (key: string | Buffer, msg: string) =>
        crypto.createHmac('sha256', key).update(msg).digest('hex');

      const hexKey = Buffer.from(trimmedSecret, 'hex');

      console.log('Secret length     :', trimmedSecret.length, '(hex bytes:', hexKey.length, ')');
      console.log('Received hash     :', v1);
      console.log('--- Manifest candidates ---');

      let matchedVariant: string | null = null;
      for (const [label, msg] of Object.entries(candidates)) {
        const withStr = hmac(trimmedSecret, msg);
        const withHex = hmac(hexKey, msg);
        const strMatch = withStr === v1;
        const hexMatch = withHex === v1;
        console.log(`  [${label}]`);
        console.log(`    manifest : ${msg}`);
        console.log(`    str key  : ${withStr} | match: ${strMatch}`);
        console.log(`    hex key  : ${withHex} | match: ${hexMatch}`);
        if ((strMatch || hexMatch) && !matchedVariant) matchedVariant = label;
      }
      console.log('---------------------------');

      if (!matchedVariant) {
        console.warn('MP WEBHOOK — no manifest variant matched the received signature');
        console.warn('MP WEBHOOK — rejecting. Double-check MP_WEBHOOK_SECRET in .env vs MercadoPago portal');
        throw new UnauthorizedException('Invalid webhook signature');
      }

      console.log(`MP WEBHOOK — signature OK with variant: "${matchedVariant}"`);
    } else {
      console.warn('MP WEBHOOK — MP_WEBHOOK_SECRET not set, skipping signature verification');
    }

    const resolvedType = type || body?.type;
    const resolvedId   = paymentId || dataId || body?.data?.id;
    console.log(`MP WEBHOOK — resolved type: "${resolvedType}" | resolved id: "${resolvedId}"`);
    console.log('══════════════════════════════════════════');

    return this.paymentsService.handleWebhook(resolvedType, resolvedId);
  }
}
