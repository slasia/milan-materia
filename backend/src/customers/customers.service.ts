import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { LoginCustomerDto } from './dto/login-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterCustomerDto) {
    const existing = await this.prisma.customer.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con ese email');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const customer = await this.prisma.customer.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        province: dto.province,
        zip: dto.zip,
      },
    });

    const token = this.signToken(customer);
    return { access_token: token, customer: this.sanitize(customer) };
  }

  async login(dto: LoginCustomerDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { email: dto.email },
    });
    if (!customer) {
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }

    const valid = await bcrypt.compare(dto.password, customer.password);
    if (!valid) {
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }

    const token = this.signToken(customer);
    return { access_token: token, customer: this.sanitize(customer) };
  }

  async findById(id: number) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('Cliente no encontrado');
    return this.sanitize(customer);
  }

  async update(id: number, dto: UpdateCustomerDto) {
    const data: any = { ...dto };
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    const updated = await this.prisma.customer.update({
      where: { id },
      data,
    });
    return this.sanitize(updated);
  }

  async getOrders(customerId: number) {
    return this.prisma.order.findMany({
      where: { customerId },
      include: {
        items: {
          include: { product: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async adminFindAll(filters?: { page?: number; limit?: number; search?: string }) {
    const page  = filters?.page  || 1;
    const limit = filters?.limit || 25;
    const skip  = (page - 1) * limit;

    const where: any = {};
    if (filters?.search) {
      const s = filters.search.trim();
      where.OR = [
        { name:  { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        select: {
          id: true, email: true, name: true, phone: true,
          city: true, province: true, country: true,
          createdAt: true,
          _count: { select: { orders: true } },
          orders: {
            where: { status: 'paid' },
            select: { total: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.customer.count({ where }),
    ]);

    const data = customers.map(c => ({
      ...c,
      orderCount: c._count.orders,
      totalSpent: c.orders.reduce((s, o) => s + o.total, 0),
      orders: undefined,
      _count: undefined,
    }));

    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async adminFindOne(id: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          include: {
            items: { include: { product: { select: { id: true, name: true } } } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!customer) throw new Error('Cliente no encontrado');
    const { password, ...safe } = customer as any;
    return safe;
  }

  private signToken(customer: { id: number; email: string }) {
    return this.jwtService.sign({
      sub: customer.id,
      email: customer.email,
      role: 'customer',
    });
  }

  private sanitize(customer: any) {
    const { password, ...safe } = customer;
    return safe;
  }
}
