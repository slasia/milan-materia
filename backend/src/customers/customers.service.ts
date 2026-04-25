import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Customer } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  CustomerRepository,
  SafeCustomer,
  PaginatedCustomers,
  CustomerDetail,
} from './repositories/customer.repository';
import { OrderRepository } from '../orders/repositories/order.repository';
import { MailService } from '../mail/mail.service';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

const CODE_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    private customerRepo: CustomerRepository,
    private orderRepo: OrderRepository,
    private jwtService: JwtService,
    private mail: MailService,
  ) {}

  private generateCode(): string {
    return Math.floor(10000 + Math.random() * 90000).toString();
  }

  private signToken(id: number, email: string): string {
    return this.jwtService.sign({ sub: id, email, role: 'customer' });
  }

  private safeCustomer(c: Customer): SafeCustomer {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, verificationCode, verificationCodeExpires, ...safe } = c;
    return safe;
  }

  async register(dto: RegisterCustomerDto) {
    this.logger.log(`Customer register attempt — email: ${dto.email}`);
    const existing = await this.customerRepo.findByEmail(dto.email);
    if (existing) {
      this.logger.warn(`Register failed — email already exists: ${dto.email}`);
      throw new ConflictException('El email ya está registrado');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    const verificationCode        = this.generateCode();
    const verificationCodeExpires = new Date(Date.now() + CODE_TTL_MS);

    const customer = await this.customerRepo.create({
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
    });

    this.logger.log(`Customer registered — id: ${customer.id}, email: ${customer.email}`);
    this.mail.sendEmailVerification({
      email: customer.email,
      name: customer.name,
      code: verificationCode,
    }).catch(() => {});

    const token = this.signToken(customer.id, customer.email);
    return { access_token: token, customer: this.safeCustomer(customer), requiresVerification: true };
  }

  async login(email: string, password: string) {
    this.logger.log(`Customer login attempt — email: ${email}`);
    const customer = await this.customerRepo.findByEmail(email);
    if (!customer) {
      this.logger.warn(`Login failed — customer not found: ${email}`);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(password, customer.password);
    if (!valid) {
      this.logger.warn(`Login failed — wrong password for: ${email}`);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    this.logger.log(`Customer login successful — id: ${customer.id}, email: ${customer.email}`);
    const token = this.signToken(customer.id, customer.email);
    return { access_token: token, customer: this.safeCustomer(customer) };
  }

  async verifyEmail(customerId: number, code: string) {
    this.logger.log(`Email verification attempt — customer #${customerId}`);
    const customer = await this.customerRepo.findById(customerId);
    if (!customer) throw new NotFoundException('Usuario no encontrado');

    if (customer.emailVerified) {
      this.logger.log(`Email already verified — customer #${customerId}`);
      return { message: 'Email ya verificado', emailVerified: true };
    }
    if (!customer.verificationCodeExpires || customer.verificationCodeExpires < new Date()) {
      this.logger.warn(`Verification code expired — customer #${customerId}`);
      throw new BadRequestException('El código expiró. Solicitá uno nuevo.');
    }
    if (customer.verificationCode !== code) {
      this.logger.warn(`Wrong verification code — customer #${customerId}`);
      throw new BadRequestException('Código incorrecto');
    }

    const updated = await this.customerRepo.update(customerId, {
      emailVerified: true,
      verificationCode: null,
      verificationCodeExpires: null,
    });

    this.logger.log(`Email verified successfully — customer #${customerId}`);
    return { message: 'Email verificado correctamente', emailVerified: true, customer: this.safeCustomer(updated) };
  }

  async resendVerification(customerId: number) {
    this.logger.log(`Resend verification — customer #${customerId}`);
    const customer = await this.customerRepo.findById(customerId);
    if (!customer) throw new NotFoundException('Usuario no encontrado');
    if (customer.emailVerified) return { message: 'Email ya verificado' };

    const code    = this.generateCode();
    const expires = new Date(Date.now() + CODE_TTL_MS);

    await this.customerRepo.update(customerId, { verificationCode: code, verificationCodeExpires: expires });
    this.mail.sendEmailVerification({ email: customer.email, name: customer.name, code }).catch(() => {});

    this.logger.log(`Verification code resent to ${customer.email}`);
    return { message: 'Código reenviado a ' + customer.email };
  }

  async getProfile(customerId: number): Promise<SafeCustomer> {
    this.logger.log(`Fetching profile — customer #${customerId}`);
    const customer = await this.customerRepo.findById(customerId);
    if (!customer) throw new NotFoundException('Usuario no encontrado');
    return this.safeCustomer(customer);
  }

  async updateProfile(customerId: number, dto: UpdateCustomerDto): Promise<SafeCustomer> {
    this.logger.log(`Updating profile — customer #${customerId}, fields: ${Object.keys(dto).join(', ')}`);
    const data: Record<string, string | undefined> = {};
    if (dto.name     !== undefined) data.name     = dto.name;
    if (dto.phone    !== undefined) data.phone    = dto.phone;
    if (dto.address  !== undefined) data.address  = dto.address;
    if (dto.city     !== undefined) data.city     = dto.city;
    if (dto.province !== undefined) data.province = dto.province;
    if (dto.zip      !== undefined) data.zip      = dto.zip;
    if (dto.password !== undefined) data.password = await bcrypt.hash(dto.password, 10);

    const updated = await this.customerRepo.update(customerId, data);
    this.logger.log(`Profile updated — customer #${customerId}`);
    return this.safeCustomer(updated);
  }

  async getOrders(customerId: number) {
    this.logger.log(`Fetching orders — customer #${customerId}`);
    const orders = await this.orderRepo.findByCustomerId(customerId);
    this.logger.log(`Returned ${orders.length} orders for customer #${customerId}`);
    return orders;
  }

  async findAllAdmin(params: { page?: number; limit?: number; search?: string }): Promise<PaginatedCustomers> {
    this.logger.log(`Fetching customers — page: ${params.page ?? 1}, search: "${params.search ?? ''}"`);
    const result = await this.customerRepo.findAllAdmin(params);
    this.logger.log(`Returned ${result.data.length} customers (total: ${result.meta.total})`);
    return result;
  }

  async findOneAdmin(id: number): Promise<CustomerDetail> {
    this.logger.log(`Fetching customer detail — id: ${id}`);
    const customer = await this.customerRepo.findDetailAdmin(id);
    if (!customer) {
      this.logger.warn(`Customer #${id} not found`);
      throw new NotFoundException('Cliente no encontrado');
    }
    this.logger.log(`Customer #${id} found — email: ${customer.email}`);
    return customer;
  }

  async forgotPassword(email: string) {
    this.logger.log(`Forgot password request — email: ${email}`);
    const customer = await this.customerRepo.findByEmail(email);
    if (!customer) {
      this.logger.log(`Forgot password — email not found (silenced): ${email}`);
      return { message: 'Si el email está registrado, recibirás un código.' };
    }

    const code    = this.generateCode();
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await this.customerRepo.update(customer.id, { passwordResetCode: code, passwordResetExpires: expires });
    this.mail.sendPasswordReset({ email: customer.email, name: customer.name, code }).catch(() => {});

    this.logger.log(`Password reset code sent to ${email}`);
    return { message: 'Si el email está registrado, recibirás un código.' };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    this.logger.log(`Reset password attempt — email: ${email}`);
    const customer = await this.customerRepo.findByEmail(email);
    if (!customer || customer.passwordResetCode !== code) {
      this.logger.warn(`Reset password failed — invalid code for: ${email}`);
      throw new BadRequestException('Código inválido o expirado');
    }
    if (!customer.passwordResetExpires || customer.passwordResetExpires < new Date()) {
      this.logger.warn(`Reset password failed — code expired for: ${email}`);
      throw new BadRequestException('El código expiró. Solicitá uno nuevo.');
    }

    const hashed  = await bcrypt.hash(newPassword, 10);
    const updated = await this.customerRepo.update(customer.id, {
      password: hashed,
      passwordResetCode: null,
      passwordResetExpires: null,
    });

    this.logger.log(`Password reset successful — customer #${customer.id}`);
    const token = this.signToken(updated.id, updated.email);
    return {
      message: 'Contraseña actualizada correctamente',
      access_token: token,
      customer: this.safeCustomer(updated),
    };
  }

  async findById(id: number): Promise<Customer | null> {
    return this.customerRepo.findById(id);
  }
}
