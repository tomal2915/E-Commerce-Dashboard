// src/main.ts
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(cookieParser()); // lets us read tokens from cookies

  // Must specify the exact frontend origin (not just credentials: true)
  // when using cookies cross-origin — "*" is not allowed with credentials.
  app.enableCors({
    origin: 'http://localhost:3001',
    credentials: true,
  });

  // Serves uploaded media files (from your Media module) at /uploads/...
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads' });

  await app.listen(3000);
}
bootstrap();
