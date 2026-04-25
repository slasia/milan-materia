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

  private get frontendUrl(): string {
    return this.config.get<string>('FRONTEND_URL') || 'http://localhost:5174';
  }

  private get adminUrl(): string {
    return this.config.get<string>('ADMIN_URL') || 'http://localhost:5175';
  }

  private fmt(cents: number): string {
    return '$ ' + Math.round(cents / 100).toLocaleString('es-AR');
  }

  /** Escape user-controlled strings before interpolation into HTML */
  private esc(s: string | null | undefined): string {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c] ?? c));
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

  // ── Shared layout helpers (100% inline styles — Gmail compatible) ─────────

  private wrap(content: string): string {
    return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f5f0e8;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f0e8;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e0d8cc;">
        ${this.header()}
        ${content}
        ${this.footer()}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  private header(): string {
    return `
      <tr><td style="background-color:#0a0804;padding:28px 32px;text-align:center;border-bottom:3px solid #c8a96a;">
        <div style="font-size:36px;font-weight:900;color:#c8a96a;letter-spacing:.06em;font-family:'Helvetica Neue',Arial,sans-serif;line-height:1;">MM</div>
        <div style="margin:6px 0 0;font-size:10px;color:#9a8870;letter-spacing:.2em;text-transform:uppercase;">MILÁN MATERÍA</div>
      </td></tr>`;
  }

  private footer(): string {
    return `
      <tr><td style="background-color:#faf7f2;padding:20px 32px;text-align:center;border-top:1px solid #e0d8cc;">
        <p style="margin:0;font-size:11px;color:#9a8870;line-height:1.6;">
          Milán Matería · Mar del Plata, Argentina<br>
          Este es un correo automático, por favor no respondas a este mensaje.
        </p>
      </td></tr>`;
  }

  private btn(label: string, url: string): string {
    return `<a href="${url}" style="display:inline-block;padding:13px 28px;background-color:#c8a96a;color:#080706;font-weight:700;font-size:13px;letter-spacing:.06em;text-transform:uppercase;text-decoration:none;border-radius:8px;">${label}</a>`;
  }

  private sectionTitle(text: string): string {
    return `<p style="margin:0 0 4px;font-size:10px;color:#9a8870;letter-spacing:.12em;text-transform:uppercase;font-weight:700;">${text}</p>`;
  }

  private itemsTable(items: { name: string; quantity: number; unitPrice: number }[]): string {
    const rows = items.map(i => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #ede8e0;font-size:13px;color:#2a1f0f;">${this.esc(i.name)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #ede8e0;text-align:center;font-size:13px;color:#6b5c44;">${i.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #ede8e0;text-align:right;font-size:13px;color:#2a1f0f;font-weight:600;">${this.fmt(i.unitPrice * i.quantity)}</td>
      </tr>`).join('');

    return `
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;border:1px solid #ede8e0;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background-color:#faf7f2;">
            <th style="padding:8px 12px;text-align:left;font-size:10px;color:#9a8870;letter-spacing:.1em;text-transform:uppercase;font-weight:700;">Producto</th>
            <th style="padding:8px 12px;text-align:center;font-size:10px;color:#9a8870;letter-spacing:.1em;text-transform:uppercase;font-weight:700;">Cant.</th>
            <th style="padding:8px 12px;text-align:right;font-size:10px;color:#9a8870;letter-spacing:.1em;text-transform:uppercase;font-weight:700;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  // ── New order (admin) ────────────────────────────────────────────────────
  async sendNewOrder(order: {
    id: number;
    status: string;
    subtotal: number;
    discountAmt: number;
    shippingCost: number;
    total: number;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    promoCode?: string;
    mpPreferenceId?: string;
    mpPaymentId?: string;
    paymentMethod?: string;
    shippingAddress?: string;
    notes?: string;
    trackingNumber?: string;
    adminNotes?: string;
    createdAt?: Date | string;
    items: { product?: { name: string }; productId?: number; quantity: number; unitPrice: number; total?: number }[];
  }) {
    const items = order.items.map(i => ({
      name: i.product?.name ?? `Producto #${i.productId ?? '?'}`,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    }));

    const row = (label: string, value: string, highlight = false) =>
      `<tr>
        <td style="padding:5px 0;font-size:13px;color:#6b5c44;vertical-align:top;">${label}</td>
        <td style="padding:5px 0;text-align:right;font-size:13px;color:${highlight ? '#c8a96a' : '#2a1f0f'};font-weight:${highlight ? '700' : '400'};vertical-align:top;">${value}</td>
      </tr>`;

    const STATUS_LABELS: Record<string, string> = {
      pending: 'Pendiente', paid: 'Pagado ✓', processing: 'En proceso',
      shipped: 'Enviado', delivered: 'Entregado', cancelled: 'Cancelado',
    };
    const STATUS_BG: Record<string, string> = {
      paid: '#d1f5e0', pending: '#fef3cd', processing: '#d1e8fa',
      shipped: '#fff3cd', delivered: '#d1f5e0', cancelled: '#fde8e8',
    };
    const STATUS_COLOR: Record<string, string> = {
      paid: '#1a7a4a', pending: '#856404', processing: '#1a5276',
      shipped: '#856404', delivered: '#1a7a4a', cancelled: '#8b1a1a',
    };
    const statusLabel = STATUS_LABELS[order.status] || order.status;
    const statusBg    = STATUS_BG[order.status]    || '#f5f0e8';
    const statusColor = STATUS_COLOR[order.status] || '#2a1f0f';

    const fmtDate = (d?: Date | string) => {
      if (!d) return '—';
      return new Date(d).toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    };

    // Totals section
    const discountRow = order.discountAmt > 0
      ? row('Descuento' + (order.promoCode ? ` (${order.promoCode})` : ''), `− ${this.fmt(order.discountAmt)}`)
      : '';
    const shippingRow = order.shippingCost > 0
      ? row('Envío (Andreani)', this.fmt(order.shippingCost))
      : '';

    // Payment section
    const paymentMethod = order.paymentMethod
      ? order.paymentMethod.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      : '—';

    // Buyer notes block
    const notesBlock = order.notes ? `
      <div style="background-color:#faf7f2;border-left:3px solid #c8a96a;padding:14px 18px;margin-bottom:20px;border-radius:0 8px 8px 0;">
        ${this.sectionTitle('Notas del comprador')}
        <p style="margin:6px 0 0;font-size:14px;color:#2a1f0f;line-height:1.6;">${this.esc(order.notes)}</p>
      </div>` : '';

    // Shipping address block
    const addressBlock = order.shippingAddress ? `
      <div style="background-color:#faf7f2;border:1px solid #e0d8cc;border-radius:8px;padding:14px 18px;margin-bottom:20px;">
        ${this.sectionTitle('📍 Dirección de envío')}
        <p style="margin:6px 0 0;font-size:14px;color:#2a1f0f;line-height:1.5;">${this.esc(order.shippingAddress)}</p>
      </div>` : '';

    const content = `
      <tr><td style="padding:32px;">
        <h2 style="margin:0 0 4px;font-size:22px;color:#1a1208;font-weight:900;">🧉 Nuevo pedido <span style="font-family:monospace;">#${order.id}</span></h2>
        <p style="margin:0 0 20px;font-size:13px;color:#6b5c44;">Se registró un nuevo pedido con pago confirmado.</p>

        <div style="text-align:center;margin-bottom:24px;">
          <span style="display:inline-block;padding:8px 24px;border-radius:24px;background-color:${statusBg};color:${statusColor};font-size:14px;font-weight:700;">${statusLabel}</span>
        </div>

        ${this.itemsTable(items)}

        <div style="margin-bottom:20px;">
          ${this.sectionTitle('Totales')}
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            ${row('Subtotal', this.fmt(order.subtotal))}
            ${discountRow}
            ${shippingRow}
            <tr><td colspan="2" style="padding-top:8px;border-top:2px solid #c8a96a;"></td></tr>
            <tr>
              <td style="padding:6px 0;font-size:16px;font-weight:700;color:#1a1208;">Total</td>
              <td style="padding:6px 0;text-align:right;font-size:22px;font-weight:900;color:#c8a96a;">${this.fmt(order.total)}</td>
            </tr>
          </table>
        </div>

        <div style="margin-bottom:20px;">
          ${this.sectionTitle('Cliente')}
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            ${row('Nombre', this.esc(order.customerName) || '—')}
            ${row('Email', this.esc(order.customerEmail) || '—')}
            ${row('Teléfono', this.esc(order.customerPhone) || '—')}
          </table>
        </div>

        ${addressBlock}
        ${notesBlock}

        <div style="margin-bottom:20px;">
          ${this.sectionTitle('Pago')}
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            ${row('Método', paymentMethod)}
            ${order.mpPaymentId ? row('ID Pago MP', `<span style="font-family:monospace;font-size:12px;">${order.mpPaymentId}</span>`) : ''}
            ${order.mpPreferenceId ? row('ID Preferencia MP', `<span style="font-family:monospace;font-size:12px;">${order.mpPreferenceId}</span>`) : ''}
          </table>
        </div>

        <div style="margin-bottom:24px;">
          ${this.sectionTitle('Información del pedido')}
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            ${row('ID Pedido', `#${order.id}`)}
            ${row('Estado', statusLabel)}
            ${row('Fecha', fmtDate(order.createdAt))}
            ${order.trackingNumber ? row('N° seguimiento', order.trackingNumber, true) : ''}
            ${order.adminNotes ? row('Notas admin', order.adminNotes) : ''}
          </table>
        </div>

        <div style="text-align:center;">${this.btn('Ver pedido en el panel', `${this.adminUrl}/#/orders`)}</div>
      </td></tr>`;

    await this.send(`🧉 Nuevo pedido #${order.id} — ${this.fmt(order.total)}`, this.wrap(content));
  }

  // ── Status update (admin) ────────────────────────────────────────────────
  async sendStatusUpdate(order: {
    id: number;
    status: string;
    total: number;
    customerName?: string;
    customerEmail?: string;
  }) {
    const STATUS_LABELS: Record<string, string> = {
      pending: 'Pendiente', paid: 'Pagado ✓', processing: 'En proceso',
      shipped: 'Enviado', delivered: 'Entregado', cancelled: 'Cancelado',
    };
    const STATUS_BG: Record<string, string> = {
      paid: '#d1f5e0', pending: '#fef3cd', processing: '#d1e8fa',
      shipped: '#fff3cd', delivered: '#d1f5e0', cancelled: '#fde8e8',
    };
    const STATUS_COLOR: Record<string, string> = {
      paid: '#1a7a4a', pending: '#856404', processing: '#1a5276',
      shipped: '#856404', delivered: '#1a7a4a', cancelled: '#8b1a1a',
    };

    const label = STATUS_LABELS[order.status] || order.status;
    const bg    = STATUS_BG[order.status]    || '#f5f0e8';
    const color = STATUS_COLOR[order.status] || '#2a1f0f';

    const content = `
      <tr><td style="padding:32px;">
        <h2 style="margin:0 0 4px;font-size:20px;color:#1a1208;font-weight:900;">Pedido <span style="font-family:monospace;">#${order.id}</span> actualizado</h2>
        <p style="margin:0 0 24px;font-size:13px;color:#6b5c44;">El estado del pedido cambió.</p>

        <div style="text-align:center;margin-bottom:28px;">
          <span style="display:inline-block;padding:10px 28px;border-radius:24px;background-color:${bg};color:${color};font-size:15px;font-weight:700;letter-spacing:.04em;">${label}</span>
        </div>

        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px;">
          <tr><td style="padding:4px 0;font-size:13px;color:#6b5c44;">Cliente</td><td style="padding:4px 0;text-align:right;font-size:13px;color:#2a1f0f;">${order.customerName || '—'}</td></tr>
          <tr><td style="padding:4px 0;font-size:13px;color:#6b5c44;">Email</td><td style="padding:4px 0;text-align:right;font-size:13px;color:#2a1f0f;">${order.customerEmail || '—'}</td></tr>
          <tr><td colspan="2" style="padding-top:12px;border-top:1px solid #ede8e0;"></td></tr>
          <tr>
            <td style="padding:6px 0;font-size:15px;font-weight:700;color:#1a1208;">Total</td>
            <td style="padding:6px 0;text-align:right;font-size:20px;font-weight:900;color:#c8a96a;">${this.fmt(order.total)}</td>
          </tr>
        </table>

        <div style="text-align:center;">${this.btn('Ver en el panel', `${this.adminUrl}/#/orders`)}</div>
      </td></tr>`;

    await this.send(`📦 Pedido #${order.id} → ${label}`, this.wrap(content));
  }

  // ── Customer status update ───────────────────────────────────────────────
  async sendCustomerStatusUpdate(order: {
    id: number; status: string; total: number;
    customerName?: string; customerEmail: string;
    trackingNumber?: string; adminNotes?: string;
    items: { name: string; quantity: number; unitPrice: number }[];
  }) {
    const STATUS_LABELS: Record<string, string> = {
      pending: 'Pendiente', paid: 'Pago confirmado', processing: 'En preparación',
      shipped: 'Enviado', delivered: 'Entregado', cancelled: 'Cancelado',
    };
    const STATUS_BG: Record<string, string> = {
      paid: '#d1f5e0', pending: '#fef3cd', processing: '#d1e8fa',
      shipped: '#fff3cd', delivered: '#d1f5e0', cancelled: '#fde8e8',
    };
    const STATUS_COLOR: Record<string, string> = {
      paid: '#1a7a4a', pending: '#856404', processing: '#1a5276',
      shipped: '#856404', delivered: '#1a7a4a', cancelled: '#8b1a1a',
    };

    const label = STATUS_LABELS[order.status] || order.status;
    const bg    = STATUS_BG[order.status]    || '#f5f0e8';
    const color = STATUS_COLOR[order.status] || '#2a1f0f';
    const orderNum = String(order.id).padStart(6, '0');

    const trackingBlock = order.trackingNumber ? `
      <div style="background-color:#faf7f2;border:1px solid #e0d8cc;border-radius:8px;padding:14px 18px;margin-bottom:20px;">
        ${this.sectionTitle('📦 Número de seguimiento')}
        <p style="margin:6px 0 0;font-size:22px;font-family:monospace;color:#c8a96a;font-weight:700;letter-spacing:.08em;">${this.esc(order.trackingNumber)}</p>
      </div>` : '';

    const notesBlock = order.adminNotes ? `
      <div style="background-color:#faf7f2;border-left:3px solid #c8a96a;padding:14px 18px;margin-bottom:20px;border-radius:0 8px 8px 0;">
        ${this.sectionTitle('Mensaje del vendedor')}
        <p style="margin:6px 0 0;font-size:14px;color:#2a1f0f;line-height:1.6;">${this.esc(order.adminNotes)}</p>
      </div>` : '';

    const content = `
      <tr><td style="padding:32px;">
        <h2 style="margin:0 0 8px;font-size:20px;color:#1a1208;font-weight:900;">Pedido <span style="font-family:monospace;">#${orderNum}</span></h2>
        <p style="font-size:14px;color:#6b5c44;margin:0 0 20px;">
          Hola <strong style="color:#1a1208;">${this.esc(order.customerName) || 'cliente'}</strong>, tu pedido fue actualizado.
        </p>

        <div style="text-align:center;margin-bottom:24px;">
          <span style="display:inline-block;padding:10px 28px;border-radius:24px;background-color:${bg};color:${color};font-size:15px;font-weight:700;">${label}</span>
        </div>

        ${trackingBlock}
        ${notesBlock}
        ${this.itemsTable(order.items)}

        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px;">
          <tr><td colspan="2" style="padding-top:8px;border-top:1px solid #ede8e0;"></td></tr>
          <tr>
            <td style="padding:6px 0;font-size:15px;font-weight:700;color:#1a1208;">Total</td>
            <td style="padding:6px 0;text-align:right;font-size:20px;font-weight:900;color:#c8a96a;">${this.fmt(order.total)}</td>
          </tr>
        </table>

        <p style="text-align:center;font-size:13px;color:#6b5c44;margin:0 0 20px;">Ante cualquier consulta, no dudes en contactarnos.</p>
        <div style="text-align:center;">${this.btn('Ir a la tienda', this.frontendUrl)}</div>
      </td></tr>`;

    await this.send(`📦 Tu pedido #${orderNum} — ${label}`, this.wrap(content), order.customerEmail);
  }

  // ── Email verification ───────────────────────────────────────────────────
  async sendEmailVerification(data: { email: string; name: string; code: string }) {
    const content = `
      <tr><td style="padding:32px;">
        <h2 style="margin:0 0 8px;font-size:20px;color:#1a1208;font-weight:900;">Verificá tu cuenta</h2>
        <p style="font-size:14px;color:#6b5c44;margin:0 0 28px;line-height:1.6;">
          Hola <strong style="color:#1a1208;">${this.esc(data.name)}</strong>, usá este código para verificar tu cuenta en Milán Matería:
        </p>

        <div style="text-align:center;margin-bottom:28px;">
          <div style="display:inline-block;padding:20px 36px;background-color:#faf7f2;border:2px solid #c8a96a;border-radius:12px;">
            ${this.sectionTitle('Tu código de verificación')}
            <p style="margin:8px 0 0;font-size:40px;font-weight:900;font-family:monospace;letter-spacing:.2em;color:#c8a96a;">${data.code}</p>
          </div>
        </div>

        <p style="font-size:12px;color:#9a8870;text-align:center;margin:0;line-height:1.6;">
          El código expira en 24 horas.<br>Si no creaste esta cuenta, ignorá este mensaje.
        </p>
      </td></tr>`;

    await this.send(`🧉 Tu código de verificación: ${data.code}`, this.wrap(content), data.email);
  }

  // ── Buyer order confirmation ─────────────────────────────────────────────
  async sendBuyerOrderConfirmation(order: {
    id: number; total: number; subtotal: number; discountAmt: number;
    shippingCost?: number; customerName?: string; customerEmail: string;
    shippingAddress?: string;
    items: { name: string; quantity: number; unitPrice: number }[];
  }) {
    const orderNum  = String(order.id).padStart(6, '0');
    const firstName = order.customerName?.split(' ')[0] || '';

    const discountRow = order.discountAmt > 0 ? `
      <tr>
        <td style="padding:4px 0;font-size:13px;color:#6b5c44;">Descuento</td>
        <td style="padding:4px 0;text-align:right;font-size:13px;color:#1a7a4a;font-weight:600;">− ${this.fmt(order.discountAmt)}</td>
      </tr>` : '';

    const shippingRow = (order.shippingCost ?? 0) > 0 ? `
      <tr>
        <td style="padding:4px 0;font-size:13px;color:#6b5c44;">Envío (Andreani)</td>
        <td style="padding:4px 0;text-align:right;font-size:13px;color:#2a1f0f;">${this.fmt(order.shippingCost)}</td>
      </tr>` : '';

    const addressBlock = order.shippingAddress ? `
      <div style="background-color:#faf7f2;border:1px solid #e0d8cc;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
        ${this.sectionTitle('📍 Dirección de envío')}
        <p style="margin:6px 0 0;font-size:14px;color:#2a1f0f;line-height:1.5;">${this.esc(order.shippingAddress)}</p>
      </div>` : '';

    const content = `
      <tr><td style="padding:32px;">
        <h2 style="margin:0 0 16px;font-size:22px;color:#1a1208;font-weight:900;">
          ¡Gracias por tu compra${firstName ? `, ${this.esc(firstName)}` : ''}! 🧉
        </h2>

        <p style="font-size:15px;color:#2a1f0f;margin:0 0 12px;line-height:1.7;">
          Nos llena de alegría saber que un mate Milán Matería va a encontrar su lugar en tu ronda.
          Cada pieza que hacemos lleva tiempo, cariño y mucho mate de por medio — y es un honor que hayas elegido la nuestra.
        </p>
        <p style="font-size:14px;color:#6b5c44;margin:0 0 28px;line-height:1.6;">
          Tu pago fue acreditado y ya estamos preparando tu pedido. En breve nos ponemos en contacto para coordinar la entrega. 🤝
        </p>

        <div style="text-align:center;margin-bottom:24px;">
          <span style="display:inline-block;padding:10px 28px;border-radius:24px;background-color:#d1f5e0;color:#1a7a4a;font-size:15px;font-weight:700;">✓ Pago confirmado</span>
        </div>

        <div style="background-color:#faf7f2;border:1px solid #e0d8cc;border-radius:8px;padding:16px;margin-bottom:24px;text-align:center;">
          ${this.sectionTitle('Número de orden')}
          <p style="margin:8px 0 4px;font-size:30px;font-weight:900;font-family:monospace;color:#c8a96a;letter-spacing:.1em;">#${orderNum}</p>
          <p style="margin:0;font-size:11px;color:#9a8870;">Guardá este número para cualquier consulta</p>
        </div>

        ${this.itemsTable(order.items)}

        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px;">
          ${discountRow}
          ${shippingRow}
          <tr><td colspan="2" style="padding-top:8px;border-top:2px solid #c8a96a;"></td></tr>
          <tr>
            <td style="padding:6px 0;font-size:15px;font-weight:700;color:#1a1208;">Total pagado</td>
            <td style="padding:6px 0;text-align:right;font-size:22px;font-weight:900;color:#c8a96a;">${this.fmt(order.total)}</td>
          </tr>
        </table>

        ${addressBlock}

        <div style="background-color:#faf7f2;border-left:3px solid #c8a96a;padding:14px 18px;margin-bottom:24px;border-radius:0 8px 8px 0;">
          <p style="margin:0 0 6px;font-size:11px;color:#9a8870;letter-spacing:.1em;text-transform:uppercase;font-weight:700;">¿Qué sigue ahora?</p>
          <p style="margin:0;font-size:13px;color:#6b5c44;line-height:1.7;">
            📦 Vamos a preparar tu pedido con dedicación.<br>
            📬 Te avisamos cuando salga para entrega.<br>
            💬 Si tenés alguna duda, escribinos sin problema.
          </p>
        </div>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr>
            <td style="padding-right:8px;">
              <a href="https://wa.me/5492236667793" style="display:block;text-align:center;padding:11px 0;background-color:#e8f8ef;border:1px solid #a8e6c0;border-radius:8px;color:#1a7a4a;font-size:13px;font-weight:700;text-decoration:none;">💬 WhatsApp</a>
            </td>
            <td style="padding-left:8px;">
              <a href="https://instagram.com/milan.materia" style="display:block;text-align:center;padding:11px 0;background-color:#fde8f0;border:1px solid #f4a6c0;border-radius:8px;color:#8b1a4a;font-size:13px;font-weight:700;text-decoration:none;">📷 Instagram</a>
            </td>
          </tr>
        </table>

        <p style="font-size:14px;color:#6b5c44;text-align:center;margin:0 0 24px;line-height:1.7;font-style:italic;">
          "Un mate compartido vale más que mil palabras." 🧉<br>
          <span style="color:#c8a96a;font-style:normal;">— El equipo de Milán Matería</span>
        </p>

        <div style="text-align:center;">${this.btn('Ver más productos', this.frontendUrl)}</div>
      </td></tr>`;

    await this.send(`🧉 ¡Gracias por tu compra! Pedido #${orderNum} confirmado`, this.wrap(content), order.customerEmail);
  }

  // ── Password reset ───────────────────────────────────────────────────────
  async sendPasswordReset(data: { email: string; name: string; code: string }) {
    const content = `
      <tr><td style="padding:32px;">
        <h2 style="margin:0 0 8px;font-size:20px;color:#1a1208;font-weight:900;">Recuperar contraseña</h2>
        <p style="font-size:14px;color:#6b5c44;margin:0 0 28px;line-height:1.6;">
          Hola <strong style="color:#1a1208;">${this.esc(data.name)}</strong>, recibimos una solicitud para restablecer tu contraseña.<br>
          Usá este código (válido por 1 hora):
        </p>

        <div style="text-align:center;margin-bottom:28px;">
          <div style="display:inline-block;padding:20px 36px;background-color:#faf7f2;border:2px solid #c8a96a;border-radius:12px;">
            ${this.sectionTitle('Código de recuperación')}
            <p style="margin:8px 0 0;font-size:40px;font-weight:900;font-family:monospace;letter-spacing:.2em;color:#c8a96a;">${data.code}</p>
          </div>
        </div>

        <p style="font-size:12px;color:#9a8870;text-align:center;margin:0;line-height:1.6;">
          Si no solicitaste este cambio, ignorá este mensaje. Tu contraseña no será modificada.
        </p>
      </td></tr>`;

    await this.send(`🔑 Recuperar contraseña — código: ${data.code}`, this.wrap(content), data.email);
  }
}
