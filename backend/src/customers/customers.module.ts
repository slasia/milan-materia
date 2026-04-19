import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CustomersService } from './customers.service';
import { CustomersController, AdminCustomersController } from './customers.controller';
import { CustomerJwtGuard, OptionalCustomerJwtGuard } from './customer-jwt.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'super-secret-change-in-production',
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '7d',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [CustomersService, CustomerJwtGuard, OptionalCustomerJwtGuard],
  controllers: [CustomersController, AdminCustomersController],
  exports: [CustomersService, CustomerJwtGuard, OptionalCustomerJwtGuard, JwtModule],
})
export class CustomersModule {}
