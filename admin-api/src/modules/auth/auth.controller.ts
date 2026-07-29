// src/modules/auth/auth.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/auth', // only sent on auth routes (login/refresh/logout)
};

const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 15 * 60 * 1000, // 15 minutes
};

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.login(dto);

    res.cookie('access_token', accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);

    return { accessToken }; // also returned in body in case client wants it directly
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefreshToken = req.cookies?.['refresh_token'];
    if (!rawRefreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const { accessToken, refreshToken } =
      await this.authService.refresh(rawRefreshToken);

    res.cookie('access_token', accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);

    return { accessToken };
  }

  @Get('me')
  async me(@Req() req: Request) {
    return this.authService.getMe((req as any).user.id);
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawRefreshToken = req.cookies?.['refresh_token'];
    await this.authService.logout((req as any).user.id, rawRefreshToken);

    res.clearCookie('access_token');
    res.clearCookie('refresh_token', { path: '/auth' });

    return { message: 'Logged out successfully' };
  }
}
