import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePromotionDto {
  @IsString()
  type: string;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  discountPct?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  discountAmt?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minCartAmt?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  maxUses?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @IsDateString()
  @IsOptional()
  endsAt?: string;
}
