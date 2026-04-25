import { Injectable } from '@nestjs/common';
import type { Customer, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CustomerRepository,
  CustomerAdminRow,
  CustomerDetail,
  PaginatedCustomers,
} from './customer.repository';

@Injectable()
export class PrismaCustomerRepository extends CustomerRepository {
  constructor(private prisma: PrismaService) {
    super();
  }

  async findByEmail(email: string): Promise<Customer | null> {
    return this.prisma.customer.findUnique({ where: { email } });
  }

  async findById(id: number): Promise<Customer | null> {
    return this.prisma.customer.findUnique({ where: { id } });
  }

  async create(data: Prisma.CustomerCreateInput): Promise<Customer> {
    return this.prisma.customer.create({ data });
  }

  async update(id: number, data: Prisma.CustomerUpdateInput): Promise<Customer> {
    return this.prisma.customer.update({ where: { id }, data });
  }

  async findAllAdmin(params: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedCustomers> {
    const page  = params.page  || 1;
    const limit = params.limit || 20;
    const skip  = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {};
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

    return {
      data: customers as CustomerAdminRow[],
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findDetailAdmin(id: number): Promise<CustomerDetail | null> {
    return this.prisma.customer.findUnique({
      where: { id },
      select: {
        id: true, email: true, name: true, phone: true,
        address: true, city: true, province: true, zip: true,
        country: true, emailVerified: true, createdAt: true, updatedAt: true,
        orders: {
          select: {
            id: true, status: true, total: true, createdAt: true,
            items: {
              select: {
                quantity: true, unitPrice: true,
                product: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }
}
