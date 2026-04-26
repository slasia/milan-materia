import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  // ── Security headers ────────────────────────────────────────────────────────
  app.use(helmet());

  // ── CORS — explicit whitelist, never wildcard with credentials ──────────────
  const frontendUrl = process.env.VITE_FRONTEND_URL || 'http://localhost:5174';
  const adminUrl    = process.env.ADMIN_URL    || 'http://localhost:5175';
  const allowedOrigins = [frontendUrl, adminUrl].filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── Input validation ────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Milán Matería backend running on http://localhost:${port}`);
}

bootstrap();
