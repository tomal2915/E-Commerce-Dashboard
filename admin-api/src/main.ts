// src/main.ts
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(cookieParser());
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // same-origin / server-to-server / curl
      const allowed = [
        'http://localhost:3001',
        'https://e-commerce-dashboard-eight-xi.vercel.app',
        'https://e-commerce-dashboard-tomal-s-projects.vercel.app',
      ];
      const isVercelPreview =
        /^https:\/\/e-commerce-dashboard-.*\.vercel\.app$/.test(origin);
      if (allowed.includes(origin) || isVercelPreview) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  });

  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // ---- Swagger / OpenAPI documentation ----
  // Cookie-based auth means Swagger UI's "Authorize" button won't attach
  // a Bearer token automatically — but every route IS documented here,
  // and reviewers can still exercise them by logging in through the actual
  // frontend first (which sets the httpOnly cookies), then hitting these
  // same endpoints via Postman/curl with the browser's session cookie,
  // or by using the /auth/login endpoint directly from this page to get
  // an accessToken back in the response body.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('E-Commerce Admin API')
    .setDescription(
      'REST API for the E-Commerce Admin Dashboard — Auth, Permission, Role, User, Media, Category, Brand, Attribute, and Product modules. Auth uses HttpOnly cookies (access_token + refresh_token); /auth/login also returns the accessToken in the response body for direct API testing.',
    )
    .setVersion('1.0')
    .addCookieAuth('access_token')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(3000);
}
bootstrap();
