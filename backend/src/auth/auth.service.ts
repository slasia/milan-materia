import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Admin } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AdminRepository } from './repositories/admin.repository';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private adminRepo: AdminRepository,
    private jwtService: JwtService,
  ) {}

  async validateAdmin(email: string, password: string): Promise<Admin> {
    this.logger.log(`Login attempt — email: ${email}`);
    const admin = await this.adminRepo.findByEmail(email);
    if (!admin) {
      this.logger.warn(`Login failed — admin not found: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      this.logger.warn(`Login failed — wrong password for: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }
    this.logger.log(`Login successful — admin: ${email}`);
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
