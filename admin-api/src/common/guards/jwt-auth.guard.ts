// src/common/guards/jwt-auth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Step 1: Check if this route is marked @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true; // skip auth entirely, e.g. login/refresh routes
    }

    const request = context.switchToHttp().getRequest();

    // Step 2: Get the token from header OR cookie
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    // Step 3: Verify the token is valid and not expired
    let payload: any;
    try {
      payload = this.jwtService.verify(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Step 4: Load the fresh user + role + permissions from DB
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Step 5: Block inactive users even if their token is still valid
    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Step 6: Attach the user to the request for later guards/controllers
    request.user = user;

    return true;
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }
    if (request.cookies?.['access_token']) {
      return request.cookies['access_token'];
    }
    return null;
  }
}
