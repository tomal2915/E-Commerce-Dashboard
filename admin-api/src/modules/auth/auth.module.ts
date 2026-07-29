// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [JwtModule.register({})], // secret is passed per sign/verify call
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
