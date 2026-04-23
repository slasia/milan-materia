import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CustomersService } from './customers.service';
import { CustomersController, AdminCustomersController } from './customers.controller';
import { RequireCustomerJwtGuard, OptionalCustomerJwtGuard } from './customer-jwt.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'fallback-secret',
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN') || '7d' },
      }),
    }),
  ],
  providers: [CustomersService, RequireCustomerJwtGuard, OptionalCustomerJwtGuard],
  controllers: [CustomersController, AdminCustomersController],
  exports: [CustomersService, JwtModule, RequireCustomerJwtGuard, OptionalCustomerJwtGuard],
})
export class CustomersModule {}
