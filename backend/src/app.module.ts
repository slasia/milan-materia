import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';
import * as Joi from 'joi';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { PromotionsModule } from './promotions/promotions.module';
import { PaymentsModule } from './payments/payments.module';
import { OrdersModule } from './orders/orders.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CustomersModule } from './customers/customers.module';
import { ShippingModule } from './shipping/shipping.module';

const envValidationSchema = Joi.object({
  DATABASE_URL:      Joi.string().required(),
  JWT_SECRET:        Joi.string().min(16).required(),
  JWT_EXPIRES_IN:    Joi.string().default('7d'),
  PORT:              Joi.number().default(3001),
  MP_ACCESS_TOKEN:   Joi.string().required(),
  MAIL_HOST:         Joi.string().required(),
  MAIL_PORT:         Joi.number().default(587),
  MAIL_USER:         Joi.string().email().required(),
  MAIL_PASS:         Joi.string().required(),
  MAIL_NOTIFY:       Joi.string().email().required(),
  FRONTEND_URL:      Joi.string().uri().default('http://localhost:5174'),
  BACKEND_URL:       Joi.string().uri().default('http://localhost:3001'),
  // Optional — Andreani integration
  ANDREANI_USER:     Joi.string().allow('').optional(),
  ANDREANI_PASS:     Joi.string().allow('').optional(),
  ANDREANI_CLIENTE:  Joi.string().allow('').optional(),
  ANDREANI_CONTRATO: Joi.string().allow('').optional(),
  ANDREANI_ORIGIN_ZIP: Joi.string().default('7600'),
  ANDREANI_API_URL:  Joi.string().uri().default('https://apis.andreani.com'),
  // Optional — MercadoPago extras
  MP_PUBLIC_KEY:     Joi.string().allow('').optional(),
  MP_WEBHOOK_SECRET: Joi.string().allow('').optional(),
  // Vite-prefixed aliases (used in some places for compat)
  VITE_BACKEND_URL:  Joi.string().uri().optional(),
  VITE_FRONTEND_URL: Joi.string().uri().optional(),
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,   // 1 minute window
        limit: 60,    // max 60 requests per minute per IP
      },
    ]),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: { fallthrough: false, index: false },
    }),
    PrismaModule,
    MailModule,
    AuthModule,
    ProductsModule,
    CategoriesModule,
    PromotionsModule,
    PaymentsModule,
    OrdersModule,
    DashboardModule,
    CustomersModule,
    ShippingModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
