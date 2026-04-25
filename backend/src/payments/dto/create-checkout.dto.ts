import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

export class CheckoutItemDto {
  @IsInt()
  @Type(() => Number)
  productId: number;

  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  quantity: number;
}

export class CreateCheckoutDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];

  @IsEmail()
  @MaxLength(254)
  @IsOptional()
  customerEmail?: string;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  customerName?: string;

  @IsString()
  @MaxLength(30)
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  promoCode?: string;

  // Shipping fields (collected at checkout)
  @IsString()
  @MaxLength(300)
  @IsOptional()
  shippingAddress?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  shippingCity?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  shippingProvince?: string;

  @IsString()
  @MaxLength(10)
  @IsOptional()
  shippingZip?: string;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  notes?: string;
}
