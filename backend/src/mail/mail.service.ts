import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('MAIL_HOST');
    const user = this.config.get<string>('MAIL_USER');
    const pass = this.config.get<string>('MAIL_PASS');

    if (!host || !user || !pass) {
      this.logger.warn('Mail not configured (MAIL_HOST / MAIL_USER / MAIL_PASS missing). Emails disabled.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: parseInt(this.config.get<string>('MAIL_PORT') || '587'),
      secure: this.config.get<string>('MAIL_PORT') === '465',
      auth: { user, pass },
    });
  }

  private get notifyTo(): string {
    return this.config.get<string>('MAIL_NOTIFY') || '';
  }

  private get from(): string {
    const user = this.config.get<string>('MAIL_USER') || '';
    return `"Milán Matería" <${user}>`;
  }

  private fmt(cents: number): string {
    return '$ ' + Math.round(cents / 100).toLocaleString('es-AR');
  }

  private async send(subject: string, html: string, to?: string) {
    if (!this.transporter) {
      this.logger.debug(`Email skipped (not configured): ${subject}`);
      return;
    }
    const recipient = to || this.notifyTo;
    if (!recipient) {
      this.logger.debug(`Email skipped (no recipient): ${subject}`);
      return;
    }
    try {
      await this.transporter.sendMail({ from: this.from, to: recipient, subject, html });
      this.logger.log(`Email sent → ${recipient}: ${subject}`);
    } catch (err) {
      this.logger.error(`Email failed: ${err.message}`);
    }
  }

  // ── New order ────────────────────────────────────────────────────────────
  async sendNewOrder(order: {
    id: number;
    total: number;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    items: { product?: { name: string }; quantity: number; unitPrice: number }[];
  }) {
    const itemRows = order.items
      .map(
        (i) =>
          `<tr>
            <td style="padding:6px 12px;border-bottom:1px solid #2a2318;">${i.product?.name ?? 'Producto'}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #2a2318;text-align:center;">${i.quantity}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #2a2318;text-align:right;color:#c8a96a;">${this.fmt(i.unitPrice * i.quantity)}</td>
          </tr>`,
      )
      .join('');

    const html = `
      ${this.baseStyle()}
      <div class="wrap">
        <div class="header">
          <span class="logo">MM</span>
          <p class="sub">MILÁN MATERÍA</p>
        </div>
        <div class="body">
          <h2 style="color:#c8a96a;margin:0 0 4px;">Nuevo pedido <span style="font-family:monospace;">#${order.id}</span></h2>
          <p style="color:#9a8870;margin:0 0 20px;font-size:13px;">Se acaba de registrar un nuevo pedido en la tienda.</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
            <thead>
              <tr style="background:#1a1510;">
                <th style="padding:8px 12px;text-align:left;font-size:11px;color:#9a8870;letter-spacing:.08em;">PRODUCTO</th>
                <th style="padding:8px 12px;text-align:center;font-size:11px;color:#9a8870;letter-spacing:.08em;">CANT.</th>
                <th style="padding:8px 12px;text-align:right;font-size:11px;color:#9a8870;letter-spacing:.08em;">SUBTOTAL</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px;">
            <tr>
              <td style="padding:4px 0;color:#9a8870;font-size:13px;">Cliente</td>
              <td style="padding:4px 0;text-align:right;font-size:13px;">${order.customerName || '—'}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#9a8870;font-size:13px;">Email</td>
              <td style="padding:4px 0;text-align:right;font-size:13px;">${order.customerEmail || '—'}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#9a8870;font-size:13px;">Teléfono</td>
              <td style="padding:4px 0;text-align:right;font-size:13px;">${order.customerPhone || '—'}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top:12px;border-top:1px solid #2a2318;"></td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:15px;font-weight:700;">Total</td>
              <td style="padding:6px 0;text-align:right;font-size:18px;font-weight:700;color:#c8a96a;">${this.fmt(order.total)}</td>
            </tr>
          </table>

          <a href="http://localhost:5175/#/orders" class="btn">Ver pedido en el panel</a>
        </div>
        ${this.footer()}
      </div>
    `;

    await this.send(`🧉 Nuevo pedido #${order.id} — ${this.fmt(order.total)}`, html);
  }

  // ── Status update ────────────────────────────────────────────────────────
  async sendStatusUpdate(order: {
    id: number;
    status: string;
    total: number;
    customerName?: string;
    customerEmail?: string;
  }) {
    const STATUS_LABELS: Record<string, string> = {
      pending: 'Pendiente',
      paid: 'Pagado ✓',
      processing: 'En proceso',
      shipped: 'Enviado',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
    };

    const STATUS_COLORS: Record<string, string> = {
      paid: '#4bb98c',
      pending: '#c8a96a',
      processing: '#64a0dc',
      shipped: '#e8cb8a',
      delivered: '#4bb98c',
      cancelled: '#d94f38',
    };

    const label = STATUS_LABELS[order.status] || order.status;
    const color = STATUS_COLORS[order.status] || '#9a8870';

    const html = `
      ${this.baseStyle()}
      <div class="wrap">
        <div class="header">
          <span class="logo">MM</span>
          <p class="sub">MILÁN MATERÍA</p>
        </div>
        <div class="body">
          <h2 style="color:#c8a96a;margin:0 0 4px;">Pedido <span style="font-family:monospace;">#${order.id}</span> actualizado</h2>
          <p style="color:#9a8870;margin:0 0 24px;font-size:13px;">El estado del pedido cambió.</p>

          <div style="text-align:center;margin-bottom:28px;">
            <span style="display:inline-block;padding:10px 28px;border-radius:24px;background:${color}22;border:1px solid ${color}55;color:${color};font-size:16px;font-weight:700;letter-spacing:.06em;">
              ${label}
            </span>
          </div>

          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px;">
            <tr>
              <td style="padding:4px 0;color:#9a8870;font-size:13px;">Cliente</td>
              <td style="padding:4px 0;text-align:right;font-size:13px;">${order.customerName || '—'}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#9a8870;font-size:13px;">Email</td>
              <td style="padding:4px 0;text-align:right;font-size:13px;">${order.customerEmail || '—'}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top:12px;border-top:1px solid #2a2318;"></td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:15px;font-weight:700;">Total</td>
              <td style="padding:6px 0;text-align:right;font-size:18px;font-weight:700;color:#c8a96a;">${this.fmt(order.total)}</td>
            </tr>
          </table>

          <a href="http://localhost:5175/#/orders" class="btn">Ver en el panel</a>
        </div>
        ${this.footer()}
      </div>
    `;

    await this.send(`📦 Pedido #${order.id} → ${label}`, html);
  }

  // ── Customer status update ───────────────────────────────────────────────
  async sendCustomerStatusUpdate(order: {
    id: number;
    status: string;
    total: number;
    customerName?: string;
    customerEmail: string;
    trackingNumber?: string;
    adminNotes?: string;
    items: { name: string; quantity: number; unitPrice: number }[];
  }) {
    const STATUS_LABELS: Record<string, string> = {
      pending: 'Pendiente',
      paid: 'Pago confirmado',
      processing: 'En preparación',
      shipped: 'Enviado',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
    };

    const STATUS_COLORS: Record<string, string> = {
      paid: '#4bb98c',
      pending: '#c8a96a',
      processing: '#64a0dc',
      shipped: '#e8cb8a',
      delivered: '#4bb98c',
      cancelled: '#d94f38',
    };

    const label = STATUS_LABELS[order.status] || order.status;
    const color = STATUS_COLORS[order.status] || '#9a8870';

    const itemRows = order.items
      .map(
        (i) =>
          `<tr>
            <td style="padding:6px 12px;border-bottom:1px solid #2a2318;">${i.name}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #2a2318;text-align:center;">${i.quantity}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #2a2318;text-align:right;color:#c8a96a;">${this.fmt(i.unitPrice * i.quantity)}</td>
          </tr>`,
      )
      .join('');

    const trackingBlock = order.trackingNumber
      ? `<div style="background:#0a0804;border:1px solid #2a2318;border-radius:8px;padding:14px 18px;margin-bottom:20px;">
           <p style="margin:0 0 4px;font-size:11px;color:#9a8870;letter-spacing:.1em;text-transform:uppercase;">Número de seguimiento</p>
           <p style="margin:0;font-size:18px;font-family:monospace;color:#c8a96a;font-weight:700;">${order.trackingNumber}</p>
         </div>`
      : '';

    const notesBlock = order.adminNotes
      ? `<div style="background:#0a0804;border:1px solid #2a2318;border-radius:8px;padding:14px 18px;margin-bottom:20px;">
           <p style="margin:0 0 6px;font-size:11px;color:#9a8870;letter-spacing:.1em;text-transform:uppercase;">Mensaje del vendedor</p>
           <p style="margin:0;font-size:14px;color:#fff;line-height:1.5;">${order.adminNotes}</p>
         </div>`
      : '';

    const greeting = order.customerName
      ? `<p style="font-size:15px;color:#9a8870;margin:0 0 20px;">Hola <strong style="color:#fff;">${order.customerName}</strong>, te informamos que tu pedido fue actualizado.</p>`
      : `<p style="font-size:15px;color:#9a8870;margin:0 0 20px;">Tu pedido fue actualizado.</p>`;

    const html = `
      ${this.baseStyle()}
      <div class="wrap">
        <div class="header">
          <span class="logo">MM</span>
          <p class="sub">MILÁN MATERÍA</p>
        </div>
        <div class="body">
          <h2 style="color:#c8a96a;margin:0 0 8px;">Pedido <span style="font-family:monospace;">#${String(order.id).padStart(6, '0')}</span></h2>
          ${greeting}

          <div style="text-align:center;margin-bottom:24px;">
            <span style="display:inline-block;padding:10px 28px;border-radius:24px;background:${color}22;border:1px solid ${color}55;color:${color};font-size:16px;font-weight:700;letter-spacing:.06em;">
              ${label}
            </span>
          </div>

          ${trackingBlock}
          ${notesBlock}

          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
            <thead>
              <tr style="background:#1a1510;">
                <th style="padding:8px 12px;text-align:left;font-size:11px;color:#9a8870;letter-spacing:.08em;">PRODUCTO</th>
                <th style="padding:8px 12px;text-align:center;font-size:11px;color:#9a8870;letter-spacing:.08em;">CANT.</th>
                <th style="padding:8px 12px;text-align:right;font-size:11px;color:#9a8870;letter-spacing:.08em;">SUBTOTAL</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px;">
            <tr>
              <td colspan="2" style="padding-top:12px;border-top:1px solid #2a2318;"></td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:15px;font-weight:700;">Total</td>
              <td style="padding:6px 0;text-align:right;font-size:18px;font-weight:700;color:#c8a96a;">${this.fmt(order.total)}</td>
            </tr>
          </table>

          <p style="text-align:center;font-size:12px;color:#9a8870;margin:0 0 16px;">Ante cualquier consulta, no dudes en contactarnos.</p>
          <a href="${this.config.get<string>('FRONTEND_URL') || 'http://localhost:5174'}" class="btn">Ir a la tienda</a>
        </div>
        ${this.footer()}
      </div>
    `;

    await this.send(`📦 Tu pedido #${String(order.id).padStart(6, '0')} — ${label}`, html, order.customerEmail);
  }

  // ── Email verification ───────────────────────────────────────────────────
  async sendEmailVerification(data: { email: string; name: string; code: string }) {
    const html = `
      ${this.baseStyle()}
      <div class="wrap">
        <div class="header">
          <span class="logo">MM</span>
          <p class="sub">MILÁN MATERÍA</p>
        </div>
        <div class="body">
          <h2 style="color:#c8a96a;margin:0 0 8px;">Verificá tu cuenta</h2>
          <p style="font-size:15px;color:#9a8870;margin:0 0 28px;">
            Hola <strong style="color:#fff;">${data.name}</strong>, usá este código para verificar tu cuenta:
          </p>

          <div style="text-align:center;margin-bottom:28px;">
            <div style="display:inline-block;padding:20px 36px;background:#0a0804;border:2px solid #c8a96a;border-radius:12px;">
              <p style="margin:0 0 4px;font-size:11px;color:#9a8870;letter-spacing:.12em;text-transform:uppercase;">Tu código de verificación</p>
              <p style="margin:0;font-size:36px;font-weight:900;font-family:monospace;letter-spacing:.18em;color:#c8a96a;">${data.code}</p>
            </div>
          </div>

          <p style="font-size:12px;color:#9a8870;text-align:center;margin:0;">
            El código expira en 24 horas. Si no creaste esta cuenta, ignorá este mensaje.
          </p>
        </div>
        ${this.footer()}
      </div>
    `;

    await this.send(`🧉 Tu código de verificación: ${data.code}`, html, data.email);
  }

  // ── Buyer order confirmation (sent after MercadoPago payment approved) ────
  async sendBuyerOrderConfirmation(order: {
    id: number;
    total: number;
    subtotal: number;
    discountAmt: number;
    shippingCost?: number;
    customerName?: string;
    customerEmail: string;
    shippingAddress?: string;
    items: { name: string; quantity: number; unitPrice: number }[];
  }) {
    const orderNum = String(order.id).padStart(6, '0');
    const firstName = order.customerName?.split(' ')[0] || '';

    const itemRows = order.items
      .map(
        (i) =>
          `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #2a2318;font-size:14px;">${i.name}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #2a2318;text-align:center;font-size:14px;">${i.quantity}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #2a2318;text-align:right;color:#c8a96a;font-size:14px;">${this.fmt(i.unitPrice * i.quantity)}</td>
          </tr>`,
      )
      .join('');

    const discountRow = order.discountAmt > 0
      ? `<tr>
           <td style="padding:4px 0;color:#9a8870;font-size:13px;">Descuento</td>
           <td style="padding:4px 0;text-align:right;font-size:13px;color:#4bb98c;">− ${this.fmt(order.discountAmt)}</td>
         </tr>`
      : '';

    const shippingRow = (order.shippingCost ?? 0) > 0
      ? `<tr>
           <td style="padding:4px 0;color:#9a8870;font-size:13px;">Envío (Andreani)</td>
           <td style="padding:4px 0;text-align:right;font-size:13px;color:#c8a96a;">${this.fmt(order.shippingCost)}</td>
         </tr>`
      : '';

    const addressBlock = order.shippingAddress
      ? `<div style="background:#0a0804;border:1px solid #2a2318;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
           <p style="margin:0 0 4px;font-size:11px;color:#9a8870;letter-spacing:.1em;text-transform:uppercase;">📍 Dirección de envío</p>
           <p style="margin:0;font-size:14px;color:#e0d4be;line-height:1.5;">${order.shippingAddress}</p>
         </div>`
      : '';

    const html = `
      ${this.baseStyle()}
      <div class="wrap">
        <div class="header">
          <span class="logo">MM</span>
          <p class="sub">MILÁN MATERÍA</p>
        </div>

        <div class="body">

          <!-- Warm greeting -->
          <h2 style="color:#c8a96a;margin:0 0 16px;font-size:22px;">
            ¡Gracias por tu compra${firstName ? `, ${firstName}` : ''}! 🧉
          </h2>

          <p style="font-size:15px;color:#c8d4c0;margin:0 0 12px;line-height:1.7;">
            Nos llena de alegría saber que un mate Milán Matería va a encontrar su lugar en tu ronda.
            Cada pieza que hacemos lleva tiempo, cariño y mucho mate de por medio —
            y es un honor que hayas elegido la nuestra.
          </p>

          <p style="font-size:14px;color:#9a8870;margin:0 0 28px;line-height:1.6;">
            Tu pago fue acreditado y ya estamos preparando tu pedido con el mismo cuidado
            con el que lo hicimos. En breve nos ponemos en contacto para coordinar la entrega. 🤝
          </p>

          <!-- Confirmed badge -->
          <div style="text-align:center;margin-bottom:28px;">
            <span style="display:inline-block;padding:10px 28px;border-radius:24px;background:#4bb98c22;border:1px solid #4bb98c55;color:#4bb98c;font-size:15px;font-weight:700;letter-spacing:.06em;">
              ✓ Pago confirmado
            </span>
          </div>

          <!-- Order number -->
          <div style="background:#0a0804;border:1px solid #2a2318;border-radius:8px;padding:12px 18px;margin-bottom:24px;text-align:center;">
            <p style="margin:0 0 2px;font-size:11px;color:#9a8870;letter-spacing:.12em;text-transform:uppercase;">Número de orden</p>
            <p style="margin:0;font-size:26px;font-weight:900;font-family:monospace;color:#c8a96a;letter-spacing:.1em;">#${orderNum}</p>
            <p style="margin:4px 0 0;font-size:11px;color:#9a8870;">Guardá este número para cualquier consulta</p>
          </div>

          <!-- Items table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
            <thead>
              <tr style="background:#1a1510;">
                <th style="padding:8px 12px;text-align:left;font-size:11px;color:#9a8870;letter-spacing:.08em;">PRODUCTO</th>
                <th style="padding:8px 12px;text-align:center;font-size:11px;color:#9a8870;letter-spacing:.08em;">CANT.</th>
                <th style="padding:8px 12px;text-align:right;font-size:11px;color:#9a8870;letter-spacing:.08em;">SUBTOTAL</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>

          <!-- Totals -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px;">
            ${discountRow}
            ${shippingRow}
            <tr>
              <td colspan="2" style="padding-top:8px;border-top:1px solid #2a2318;"></td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:15px;font-weight:700;color:#fff;">Total pagado</td>
              <td style="padding:6px 0;text-align:right;font-size:20px;font-weight:900;color:#c8a96a;">${this.fmt(order.total)}</td>
            </tr>
          </table>

          <!-- Shipping address -->
          ${addressBlock}

          <!-- What's next -->
          <div style="background:#0a0804;border-left:3px solid #c8a96a;padding:14px 18px;margin-bottom:24px;border-radius:0 8px 8px 0;">
            <p style="margin:0 0 8px;font-size:12px;color:#c8a96a;letter-spacing:.08em;text-transform:uppercase;font-weight:700;">¿Qué sigue ahora?</p>
            <p style="margin:0;font-size:13px;color:#9a8870;line-height:1.7;">
              📦 Vamos a preparar tu pedido con dedicación.<br>
              📬 Te avisamos cuando salga para entrega.<br>
              💬 Si tenés alguna duda, escribinos sin problema.
            </p>
          </div>

          <!-- Contact buttons -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td style="padding-right:8px;">
                <a href="https://wa.me/5492236667793" style="display:block;text-align:center;padding:10px 0;background:#25d36622;border:1px solid #25d36655;border-radius:8px;color:#25d366;font-size:13px;font-weight:700;text-decoration:none;">
                  💬 WhatsApp
                </a>
              </td>
              <td style="padding-left:8px;">
                <a href="https://instagram.com/milan.materia" style="display:block;text-align:center;padding:10px 0;background:#e1306c22;border:1px solid #e1306c55;border-radius:8px;color:#e1306c;font-size:13px;font-weight:700;text-decoration:none;">
                  📷 Instagram
                </a>
              </td>
            </tr>
          </table>

          <!-- Closing -->
          <p style="font-size:14px;color:#9a8870;text-align:center;margin:0 0 20px;line-height:1.7;font-style:italic;">
            "Un mate compartido vale más que mil palabras." 🧉<br>
            <span style="color:#c8a96a;font-style:normal;">— El equipo de Milán Matería</span>
          </p>

          <div style="text-align:center;">
            <a href="${this.config.get<string>('FRONTEND_URL') || 'http://localhost:5174'}" class="btn">Ver más productos</a>
          </div>
        </div>

        ${this.footer()}
      </div>
    `;

    await this.send(
      `🧉 ¡Gracias por tu compra! Pedido #${orderNum} confirmado`,
      html,
      order.customerEmail,
    );
  }

  // ── Password reset ───────────────────────────────────────────────────────
  async sendPasswordReset(data: { email: string; name: string; code: string }) {
    const html = `
      ${this.baseStyle()}
      <div class="wrap">
        <div class="header">
          <span class="logo">MM</span>
          <p class="sub">MILÁN MATERÍA</p>
        </div>
        <div class="body">
          <h2 style="color:#c8a96a;margin:0 0 8px;">Recuperar contraseña</h2>
          <p style="font-size:15px;color:#9a8870;margin:0 0 28px;">
            Hola <strong style="color:#fff;">${data.name}</strong>, recibimos una solicitud para restablecer tu contraseña.<br>
            Usá este código (válido por 1 hora):
          </p>

          <div style="text-align:center;margin-bottom:28px;">
            <div style="display:inline-block;padding:20px 36px;background:#0a0804;border:2px solid #c8a96a;border-radius:12px;">
              <p style="margin:0 0 4px;font-size:11px;color:#9a8870;letter-spacing:.12em;text-transform:uppercase;">Código de recuperación</p>
              <p style="margin:0;font-size:36px;font-weight:900;font-family:monospace;letter-spacing:.18em;color:#c8a96a;">${data.code}</p>
            </div>
          </div>

          <p style="font-size:12px;color:#9a8870;text-align:center;margin:0;">
            Si no solicitaste este cambio, ignorá este mensaje. Tu contraseña no será modificada.
          </p>
        </div>
        ${this.footer()}
      </div>
    `;

    await this.send(`🔑 Recuperar contraseña — código: ${data.code}`, html, data.email);
  }

  // ── Shared styles ────────────────────────────────────────────────────────
  private baseStyle() {
    return `
      <style>
        body { margin:0; padding:0; background:#080706; font-family:'Helvetica Neue',Arial,sans-serif; color:#fff; }
        .wrap { max-width:560px; margin:32px auto; background:#0e0c0a; border:1px solid #2a2318; border-radius:12px; overflow:hidden; }
        .header { background:#0a0804; border-bottom:1px solid #2a2318; padding:28px 32px; text-align:center; }
        .logo { font-size:38px; font-weight:900; background:linear-gradient(135deg,#c8a96a,#e8cb8a); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; letter-spacing:.06em; }
        .sub { margin:4px 0 0; font-size:10px; color:#9a8870; letter-spacing:.18em; text-transform:uppercase; }
        .body { padding:32px; }
        .btn { display:inline-block; padding:12px 28px; background:linear-gradient(135deg,#c8a96a,#e8cb8a); color:#080706; font-weight:700; font-size:13px; letter-spacing:.06em; text-transform:uppercase; text-decoration:none; border-radius:8px; }
      </style>
    `;
  }

  private footer() {
    return `
      <div style="padding:20px 32px;border-top:1px solid #2a2318;text-align:center;font-size:11px;color:#4a3f30;">
        Milán Matería · Mar del Plata, Argentina · Este es un correo automático.
      </div>
    `;
  }
}
