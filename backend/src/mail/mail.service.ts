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

  private async send(subject: string, html: string) {
    if (!this.transporter || !this.notifyTo) {
      this.logger.debug(`Email skipped (not configured): ${subject}`);
      return;
    }
    try {
      await this.transporter.sendMail({ from: this.from, to: this.notifyTo, subject, html });
      this.logger.log(`Email sent → ${this.notifyTo}: ${subject}`);
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
