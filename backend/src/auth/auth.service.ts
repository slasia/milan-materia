import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateAdmin(email: string, password: string) {
    console.log(`[ADMIN] Login attempt — email: ${email}`);
    const admin = await this.prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      console.warn(`[ADMIN] Login failed — admin not found: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      console.warn(`[ADMIN] Login failed — wrong password for: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }
    console.log(`[ADMIN] Login successful — admin: ${email}`);
    return admin;
  }

  async login(loginDto: LoginDto) {
    const admin = await this.validateAdmin(loginDto.email, loginDto.password);
    const payload = { sub: admin.id, email: admin.email, role: 'admin' };
    return {
      access_token: this.jwtService.sign(payload),
      admin: { id: admin.id, email: admin.email, name: admin.name },
    };
  }
}
