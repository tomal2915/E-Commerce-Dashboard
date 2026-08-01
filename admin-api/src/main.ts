// src/main.ts
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
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

  // process.cwd() = wherever `npm run start:dev` was executed from
  // (your project root), regardless of dist/ output structure — more
  // reliable than __dirname across ts-node watch mode vs. compiled builds.
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  await app.listen(3000);
}
bootstrap();
