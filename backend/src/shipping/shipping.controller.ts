import { Body, Controller, Post } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { QuoteDto } from './dto/quote.dto';

@Controller('shipping')
export class ShippingController {
  constructor(private shippingService: ShippingService) {}

  /** POST /shipping/quote — called by frontend to show estimated cost */
  @Post('quote')
  quote(@Body() dto: QuoteDto) {
    return this.shippingService.quote(dto.postalCode);
  }
}
