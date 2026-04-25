import { IsString, MaxLength, Matches } from 'class-validator';

export class QuoteDto {
  @IsString()
  @MaxLength(10)
  @Matches(/^\d{4,8}$/, { message: 'postalCode must be 4-8 digits' })
  postalCode: string;
}
