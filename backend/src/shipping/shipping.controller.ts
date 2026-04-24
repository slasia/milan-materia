import { Body, Controller, Post } from '@nestjs/common';
import { ShippingService } from './shipping.service';

@Controller('shipping')
export class ShippingController {
  constructor(private shippingService: ShippingService) {}

  /** POST /shipping/quote — called by frontend to show estimated cost */
  @Post('quote')
  quote(@Body('postalCode') postalCode: string) {
    return this.shippingService.quote(postalCode || '');
  }
}
