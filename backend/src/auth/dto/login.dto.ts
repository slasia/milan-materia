import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  // BUG-11 fix: no MinLength — wrong password should give 401 Unauthorized, not 400 Bad Request
  @IsString()
  password: string;
}
