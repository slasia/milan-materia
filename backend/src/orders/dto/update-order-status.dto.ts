import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsString()
  @IsIn(['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
  status: string;

  @IsString()
  @IsOptional()
  trackingNumber?: string;

  @IsString()
  @IsOptional()
  adminNotes?: string;
}
