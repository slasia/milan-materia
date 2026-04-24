import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ShippingQuote {
  available: boolean;
  costCents: number;   // cost in cents (ARS × 100)
  estimatedDays: string | null;
  provider: string;
}

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);
  private cachedToken: string | null = null;
  private tokenCachedAt = 0;
  private readonly TOKEN_TTL = 50 * 60 * 1000; // 50 minutes

  constructor(private config: ConfigService) {}

  private get isConfigured(): boolean {
    return !!(
      this.config.get('ANDREANI_USER') &&
      this.config.get('ANDREANI_PASS') &&
      this.config.get('ANDREANI_CLIENTE') &&
      this.config.get('ANDREANI_CONTRATO')
    );
  }

  private get apiBase(): string {
    return this.config.get<string>('ANDREANI_API_URL') || 'https://api.qa.andreani.com';
  }

  /** Public quote — called by the frontend when postal code is entered */
  async quote(destZip: string): Promise<ShippingQuote> {
    const cleanZip = (destZip || '').replace(/\D/g, '');
    if (!cleanZip || !this.isConfigured) {
      return { available: false, costCents: 0, estimatedDays: null, provider: 'none' };
    }
    return this.fetchQuote(cleanZip);
  }

  /** Internal quote — called by PaymentsService at checkout time */
  async quoteForCheckout(destZip: string): Promise<ShippingQuote> {
    const cleanZip = (destZip || '').replace(/\D/g, '');
    if (!cleanZip || !this.isConfigured) {
      return { available: false, costCents: 0, estimatedDays: null, provider: 'none' };
    }
    return this.fetchQuote(cleanZip);
  }

  private async fetchQuote(cleanZip: string): Promise<ShippingQuote> {
    try {
      const token = await this.getToken();
      const contrato = this.config.get<string>('ANDREANI_CONTRATO');
      const cliente = this.config.get<string>('ANDREANI_CLIENTE');
      const originZip = this.config.get<string>('ANDREANI_ORIGIN_ZIP') || '7600'; // Mar del Plata

      const params = new URLSearchParams({
        cpDestino: cleanZip,
        cpOrigen: originZip,
        contrato,
        cliente,
        'bultos[0][kilos]': '1',
        'bultos[0][volumen]': '1000',
        'bultos[0][valorDeclarado]': '0',
      });

      const res = await fetch(`${this.apiBase}/v1/tarifas?${params}`, {
        headers: { 'x-authorization-token': token },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        this.logger.warn(`Andreani quote HTTP ${res.status} for zip ${cleanZip}`);
        return { available: false, costCents: 0, estimatedDays: null, provider: 'none' };
      }

      const data: any = await res.json();

      // Response field: tarifaConIva.total is a string like "1234.56"
      const totalStr: string =
        data?.tarifaConIva?.total ??
        data?.tarifaSinIva?.total ??
        data?.tarifa ??
        '0';
      const totalARS = parseFloat(String(totalStr).replace(',', '.')) || 0;

      return {
        available: true,
        costCents: Math.round(totalARS * 100),
        estimatedDays: '3–5 días hábiles',
        provider: 'Andreani',
      };
    } catch (e) {
      this.logger.error(`Andreani API error: ${e.message}`);
      return { available: false, costCents: 0, estimatedDays: null, provider: 'none' };
    }
  }

  private async getToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && now - this.tokenCachedAt < this.TOKEN_TTL) {
      return this.cachedToken;
    }

    const user = this.config.get<string>('ANDREANI_USER');
    const pass = this.config.get<string>('ANDREANI_PASS');
    const credentials = Buffer.from(`${user}:${pass}`).toString('base64');

    const res = await fetch(`${this.apiBase}/login`, {
      headers: { Authorization: `Basic ${credentials}` },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`Andreani login failed: ${res.status}`);

    const token = res.headers.get('x-authorization-token');
    if (!token) throw new Error('No x-authorization-token in Andreani response');

    this.cachedToken = token;
    this.tokenCachedAt = now;
    this.logger.log('Andreani token refreshed');
    return token;
  }
}
