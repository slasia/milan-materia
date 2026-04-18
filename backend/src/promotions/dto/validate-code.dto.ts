import { IsInt, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ValidateCodeDto {
  @IsString()
  code: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  cartTotal: number;
}
