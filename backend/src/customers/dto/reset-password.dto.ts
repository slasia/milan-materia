import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(4)
  @MaxLength(16)
  code: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
