import { Injectable } from '@nestjs/common';
import type { Admin } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminRepository } from './admin.repository';

@Injectable()
export class PrismaAdminRepository extends AdminRepository {
  constructor(private prisma: PrismaService) {
    super();
  }

  async findByEmail(email: string): Promise<Admin | null> {
    return this.prisma.admin.findUnique({ where: { email } });
  }
}
