// src/main.ts
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser()); // lets us read tokens from cookies
  app.enableCors({ credentials: true });
  await app.listen(3000);
}
bootstrap();
