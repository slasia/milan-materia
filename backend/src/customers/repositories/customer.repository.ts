import type { Customer, Prisma } from '@prisma/client';

export type SafeCustomer = Omit<Customer, 'password' | 'verificationCode' | 'verificationCodeExpires'>;

export type CustomerAdminRow = {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  city: string | null;
  province: string | null;
  emailVerified: boolean;
  createdAt: Date;
  _count: { orders: number };
};

export type CustomerDetail = Prisma.CustomerGetPayload<{
  select: {
    id: true; email: true; name: true; phone: true;
    address: true; city: true; province: true; zip: true;
    country: true; emailVerified: true; createdAt: true; updatedAt: true;
    orders: {
      select: {
        id: true; status: true; total: true; createdAt: true;
        items: { select: { quantity: true; unitPrice: true; product: { select: { name: true } } } };
      };
    };
  };
}>;

export type PaginatedCustomers = {
  data: CustomerAdminRow[];
  meta: { total: number; page: number; limit: number; pages: number };
};

export abstract class CustomerRepository {
  abstract findByEmail(email: string): Promise<Customer | null>;
  abstract findById(id: number): Promise<Customer | null>;
  abstract create(data: Prisma.CustomerCreateInput): Promise<Customer>;
  abstract update(id: number, data: Prisma.CustomerUpdateInput): Promise<Customer>;
  abstract findAllAdmin(params: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedCustomers>;
  abstract findDetailAdmin(id: number): Promise<CustomerDetail | null>;
}
