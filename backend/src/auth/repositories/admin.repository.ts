import type { Admin } from '@prisma/client';

export abstract class AdminRepository {
  abstract findByEmail(email: string): Promise<Admin | null>;
}
