import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CustomersService } from './customers.service';
import { CustomersController, AdminCustomersController } from './customers.controller';
import { RequireCustomerJwtGuard, OptionalCustomerJwtGuard } from './customer-jwt.guard';
import { MailModule } from '../mail/mail.module';
import { CustomerRepository } from './repositories/customer.repository';
import { PrismaCustomerRepository } from './repositories/prisma-customer.repository';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    MailModule,
    OrdersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'fallback-secret',
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN') || '7d' },
      }),
    }),
  ],
  providers: [
    CustomersService,
    RequireCustomerJwtGuard,
    OptionalCustomerJwtGuard,
    { provide: CustomerRepository, useClass: PrismaCustomerRepository },
  ],
  controllers: [CustomersController, AdminCustomersController],
  exports: [CustomersService, JwtModule, RequireCustomerJwtGuard, OptionalCustomerJwtGuard, CustomerRepository],
})
export class CustomersModule {}
