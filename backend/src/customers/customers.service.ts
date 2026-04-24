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

const CODE_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mail: MailService,
  ) {}

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

  async register(dto: RegisterCustomerDto) {
    console.log(`[SHOP] Customer register attempt — email: ${dto.email}`);
    const existing = await this.prisma.customer.findUnique({ where: { email: dto.email } });
    if (existing) {
      console.warn(`[SHOP] Register failed — email already exists: ${dto.email}`);
      throw new ConflictException('El email ya está registrado');
    }

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

    console.log(`[SHOP] Customer registered — id: ${customer.id}, email: ${customer.email}`);
    this.mail.sendEmailVerification({ email: customer.email, name: customer.name, code: verificationCode }).catch(() => {});

    const token = this.signToken(customer.id, customer.email);
    return { access_token: token, customer: this.safeCustomer(customer), requiresVerification: true };
  }

  async login(email: string, password: string) {
    console.log(`[SHOP] Customer login attempt — email: ${email}`);
    const customer = await this.prisma.customer.findUnique({ where: { email } });
    if (!customer) {
      console.warn(`[SHOP] Login failed — customer not found: ${email}`);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(password, customer.password);
    if (!valid) {
      console.warn(`[SHOP] Login failed — wrong password for: ${email}`);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    console.log(`[SHOP] Customer login successful — id: ${customer.id}, email: ${customer.email}`);
    const token = this.signToken(customer.id, customer.email);
    return { access_token: token, customer: this.safeCustomer(customer) };
  }

  async verifyEmail(customerId: number, code: string) {
    console.log(`[SHOP] Email verification attempt — customer #${customerId}`);
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Usuario no encontrado');
    if (customer.emailVerified) {
      console.log(`[SHOP] Email already verified — customer #${customerId}`);
      return { message: 'Email ya verificado', emailVerified: true };
    }

    if (!customer.verificationCodeExpires || customer.verificationCodeExpires < new Date()) {
      console.warn(`[SHOP] Verification code expired — customer #${customerId}`);
      throw new BadRequestException('El código expiró. Solicitá uno nuevo.');
    }

    if (customer.verificationCode !== code) {
      console.warn(`[SHOP] Wrong verification code — customer #${customerId}`);
      throw new BadRequestException('Código incorrecto');
    }

    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: { emailVerified: true, verificationCode: null, verificationCodeExpires: null },
    });

    console.log(`[SHOP] Email verified successfully — customer #${customerId}`);
    return { message: 'Email verificado correctamente', emailVerified: true, customer: this.safeCustomer(updated) };
  }

  async resendVerification(customerId: number) {
    console.log(`[SHOP] Resend verification — customer #${customerId}`);
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
    console.log(`[SHOP] Verification code resent to ${customer.email}`);
    return { message: 'Código reenviado a ' + customer.email };
  }

  async getProfile(customerId: number) {
    console.log(`[SHOP] Fetching profile — customer #${customerId}`);
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Usuario no encontrado');
    return this.safeCustomer(customer);
  }

  async updateProfile(customerId: number, dto: UpdateCustomerDto) {
    console.log(`[SHOP] Updating profile — customer #${customerId}, fields: ${Object.keys(dto).join(', ')}`);
    const data: any = {};
    if (dto.name     !== undefined) data.name     = dto.name;
    if (dto.phone    !== undefined) data.phone    = dto.phone;
    if (dto.address  !== undefined) data.address  = dto.address;
    if (dto.city     !== undefined) data.city     = dto.city;
    if (dto.province !== undefined) data.province = dto.province;
    if (dto.zip      !== undefined) data.zip      = dto.zip;
    if (dto.password !== undefined) data.password = await bcrypt.hash(dto.password, 10);

    const updated = await this.prisma.customer.update({ where: { id: customerId }, data });
    console.log(`[SHOP] Profile updated — customer #${customerId}`);
    return this.safeCustomer(updated);
  }

  async getOrders(customerId: number) {
    console.log(`[SHOP] Fetching orders — customer #${customerId}`);
    const orders = await this.prisma.order.findMany({
      where: { customerId },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, imageUrl: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    console.log(`[SHOP] Returned ${orders.length} orders for customer #${customerId}`);
    return orders;
  }

  async findAllAdmin(params: { page?: number; limit?: number; search?: string }) {
    const page  = params.page  || 1;
    const limit = params.limit || 20;
    const skip  = (page - 1) * limit;
    console.log(`[ADMIN] Fetching customers — page: ${page}, search: "${params.search ?? ''}"`);

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

    console.log(`[ADMIN] Returned ${customers.length} customers (total: ${total})`);
    return { data: customers, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async findOneAdmin(id: number) {
    console.log(`[ADMIN] Fetching customer detail — id: ${id}`);
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
    if (!customer) {
      console.warn(`[ADMIN] Customer #${id} not found`);
      throw new NotFoundException('Cliente no encontrado');
    }
    console.log(`[ADMIN] Customer #${id} found — email: ${customer.email}`);
    return customer;
  }

  async forgotPassword(email: string) {
    console.log(`[SHOP] Forgot password request — email: ${email}`);
    const customer = await this.prisma.customer.findUnique({ where: { email } });
    if (!customer) {
      console.log(`[SHOP] Forgot password — email not found (silenced): ${email}`);
      return { message: 'Si el email está registrado, recibirás un código.' };
    }

    const code = this.generateCode();
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { passwordResetCode: code, passwordResetExpires: expires },
    });

    this.mail.sendPasswordReset({ email: customer.email, name: customer.name, code }).catch(() => {});
    console.log(`[SHOP] Password reset code sent to ${email}`);
    return { message: 'Si el email está registrado, recibirás un código.' };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    console.log(`[SHOP] Reset password attempt — email: ${email}`);
    const customer = await this.prisma.customer.findUnique({ where: { email } });
    if (!customer || customer.passwordResetCode !== code) {
      console.warn(`[SHOP] Reset password failed — invalid code for: ${email}`);
      throw new BadRequestException('Código inválido o expirado');
    }
    if (!customer.passwordResetExpires || customer.passwordResetExpires < new Date()) {
      console.warn(`[SHOP] Reset password failed — code expired for: ${email}`);
      throw new BadRequestException('El código expiró. Solicitá uno nuevo.');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    const updated = await this.prisma.customer.update({
      where: { id: customer.id },
      data: { password: hashed, passwordResetCode: null, passwordResetExpires: null },
    });

    console.log(`[SHOP] Password reset successful — customer #${customer.id}`);
    const token = this.signToken(updated.id, updated.email);
    return {
      message: 'Contraseña actualizada correctamente',
      access_token: token,
      customer: this.safeCustomer(updated),
    };
  }

  async findById(id: number) {
    return this.prisma.customer.findUnique({ where: { id } });
  }
}
