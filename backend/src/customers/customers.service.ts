import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import * as bcrypt from 'bcrypt';

// Verification code expires in 24 hours
const CODE_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mail: MailService,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────────────────

  private generateCode(): string {
    return Math.floor(10000 + Math.random() * 90000).toString();
  }

  private signToken(id: number, email: string): string {
    return this.jwtService.sign({ sub: id, email, role: 'customer' });
  }

  private safeCustomer(c: any) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, verificationCode, verificationCodeExpires, ...safe } = c;
    return safe;
  }

  // ── Register (BUG-09 fixed: typed DTO) ──────────────────────────────────

  async register(dto: RegisterCustomerDto) {
    const existing = await this.prisma.customer.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('El email ya está registrado');

    const hashed = await bcrypt.hash(dto.password, 10);
    const verificationCode = this.generateCode();
    const verificationCodeExpires = new Date(Date.now() + CODE_TTL_MS);

    const customer = await this.prisma.customer.create({
      data: {
        email: dto.email,
        password: hashed,
        name: dto.name,
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        province: dto.province,
        zip: dto.zip,
        verificationCode,
        verificationCodeExpires,
        emailVerified: false,
      },
    });

    this.mail.sendEmailVerification({
      email: customer.email,
      name: customer.name,
      code: verificationCode,
    }).catch(() => {});

    const token = this.signToken(customer.id, customer.email);
    return {
      access_token: token,
      customer: this.safeCustomer(customer),
      requiresVerification: true,
    };
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  async login(email: string, password: string) {
    const customer = await this.prisma.customer.findUnique({ where: { email } });
    if (!customer) throw new UnauthorizedException('Credenciales inválidas');

    const valid = await bcrypt.compare(password, customer.password);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    const token = this.signToken(customer.id, customer.email);
    return {
      access_token: token,
      customer: this.safeCustomer(customer),
    };
  }

  // ── Email Verification (BUG-10 fixed: expiry check) ─────────────────────

  async verifyEmail(customerId: number, code: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Usuario no encontrado');
    if (customer.emailVerified) return { message: 'Email ya verificado', emailVerified: true };

    // Check expiry
    if (!customer.verificationCodeExpires || customer.verificationCodeExpires < new Date()) {
      throw new BadRequestException('El código expiró. Solicitá uno nuevo.');
    }

    if (customer.verificationCode !== code) throw new BadRequestException('Código incorrecto');

    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: { emailVerified: true, verificationCode: null, verificationCodeExpires: null },
    });

    return { message: 'Email verificado correctamente', emailVerified: true, customer: this.safeCustomer(updated) };
  }

  async resendVerification(customerId: number) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Usuario no encontrado');
    if (customer.emailVerified) return { message: 'Email ya verificado' };

    const code = this.generateCode();
    const expires = new Date(Date.now() + CODE_TTL_MS);

    await this.prisma.customer.update({
      where: { id: customerId },
      data: { verificationCode: code, verificationCodeExpires: expires },
    });

    this.mail.sendEmailVerification({ email: customer.email, name: customer.name, code }).catch(() => {});

    return { message: 'Código reenviado a ' + customer.email };
  }

  // ── Profile (BUG-04 fixed: email bloqueado; BUG-07 fixed: whitelist DTO) ─

  async getProfile(customerId: number) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Usuario no encontrado');
    return this.safeCustomer(customer);
  }

  async updateProfile(customerId: number, dto: UpdateCustomerDto) {
    const data: any = {};
    if (dto.name     !== undefined) data.name     = dto.name;
    if (dto.phone    !== undefined) data.phone    = dto.phone;
    if (dto.address  !== undefined) data.address  = dto.address;
    if (dto.city     !== undefined) data.city     = dto.city;
    if (dto.province !== undefined) data.province = dto.province;
    if (dto.zip      !== undefined) data.zip      = dto.zip;
    if (dto.password !== undefined) data.password = await bcrypt.hash(dto.password, 10);
    // email, emailVerified, id, createdAt, verificationCode are intentionally excluded

    const updated = await this.prisma.customer.update({ where: { id: customerId }, data });
    return this.safeCustomer(updated);
  }

  // ── Orders ────────────────────────────────────────────────────────────────

  async getOrders(customerId: number) {
    return this.prisma.order.findMany({
      where: { customerId },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, imageUrl: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Admin — list & detail (BUG-05 fixed) ────────────────────────────────

  async findAllAdmin(params: { page?: number; limit?: number; search?: string }) {
    const page  = params.page  || 1;
    const limit = params.limit || 20;
    const skip  = (page - 1) * limit;

    const where: any = {};
    if (params.search) {
      where.OR = [
        { name:  { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        select: {
          id: true, email: true, name: true, phone: true,
          city: true, province: true, emailVerified: true, createdAt: true,
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { data: customers, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async findOneAdmin(id: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      select: {
        id: true, email: true, name: true, phone: true,
        address: true, city: true, province: true, zip: true,
        country: true, emailVerified: true, createdAt: true, updatedAt: true,
        orders: {
          select: {
            id: true, status: true, total: true, createdAt: true,
            items: { select: { quantity: true, unitPrice: true, product: { select: { name: true } } } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado');
    return customer;
  }

  // ── Password recovery ─────────────────────────────────────────────────────

  async forgotPassword(email: string) {
    const customer = await this.prisma.customer.findUnique({ where: { email } });
    // Always respond OK — never reveal whether the email exists
    if (!customer) return { message: 'Si el email está registrado, recibirás un código.' };

    const code = this.generateCode();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour TTL

    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { passwordResetCode: code, passwordResetExpires: expires },
    });

    this.mail.sendPasswordReset({ email: customer.email, name: customer.name, code }).catch(() => {});

    return { message: 'Si el email está registrado, recibirás un código.' };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const customer = await this.prisma.customer.findUnique({ where: { email } });
    if (!customer || customer.passwordResetCode !== code) {
      throw new BadRequestException('Código inválido o expirado');
    }
    if (!customer.passwordResetExpires || customer.passwordResetExpires < new Date()) {
      throw new BadRequestException('El código expiró. Solicitá uno nuevo.');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    const updated = await this.prisma.customer.update({
      where: { id: customer.id },
      data: { password: hashed, passwordResetCode: null, passwordResetExpires: null },
    });

    const token = this.signToken(updated.id, updated.email);
    return {
      message: 'Contraseña actualizada correctamente',
      access_token: token,
      customer: this.safeCustomer(updated),
    };
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  async findById(id: number) {
    return this.prisma.customer.findUnique({ where: { id } });
  }
}
