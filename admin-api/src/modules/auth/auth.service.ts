// src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // -------- LOGIN --------
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Step 1: Generic error for both "no user" and "wrong password"
    // This prevents attackers from figuring out which emails are registered.
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Step 2: Issue tokens
    const accessToken = this.signAccessToken(user.id);
    const refreshToken = await this.createRefreshToken(user.id);

    return { accessToken, refreshToken, userId: user.id };
  }

  // -------- REFRESH --------
  async refresh(rawRefreshToken: string) {
    // Step 1: Verify the JWT signature/expiry first
    let payload: any;
    try {
      payload = this.jwtService.verify(rawRefreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid refresh token or inactive user');
    }

    // Step 2: Find matching stored refresh token (we store a bcrypt hash, not the raw token)
    const storedTokens = await this.prisma.refreshToken.findMany({
      where: { userId: user.id, expiresAt: { gt: new Date() } },
    });

    let matchedTokenId: string | null = null;
    for (const stored of storedTokens) {
      const isMatch = await bcrypt.compare(rawRefreshToken, stored.token);
      if (isMatch) {
        matchedTokenId = stored.id;
        break;
      }
    }

    if (!matchedTokenId) {
      throw new UnauthorizedException('Refresh token not recognized');
    }

    // Step 3: Rotate — delete the old token, issue a brand new pair
    await this.prisma.refreshToken.delete({ where: { id: matchedTokenId } });

    const accessToken = this.signAccessToken(user.id);
    const newRefreshToken = await this.createRefreshToken(user.id);

    return { accessToken, refreshToken: newRefreshToken };
  }

  // -------- LOGOUT --------
  async logout(userId: string, rawRefreshToken?: string) {
    if (!rawRefreshToken) {
      // No token provided — just clear everything for this user to be safe
      await this.prisma.refreshToken.deleteMany({ where: { userId } });
      return;
    }

    const storedTokens = await this.prisma.refreshToken.findMany({
      where: { userId },
    });

    for (const stored of storedTokens) {
      const isMatch = await bcrypt.compare(rawRefreshToken, stored.token);
      if (isMatch) {
        await this.prisma.refreshToken.delete({ where: { id: stored.id } });
        break;
      }
    }
  }

  // -------- ME --------
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: { permissions: { include: { permission: true } } },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Flatten role.permissions into a simple string array
    const permissions = user.role.permissions.map((rp) => rp.permission.name);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      gender: user.gender,
      isActive: user.isActive,
      role: { id: user.role.id, name: user.role.name },
      permissions,
    };
  }

  // -------- HELPERS --------
  private signAccessToken(userId: string): string {
    return this.jwtService.sign(
      { sub: userId },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' },
    );
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const rawToken = this.jwtService.sign(
      { sub: userId },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' },
    );

    // Store a HASH of the token in the DB, never the raw token.
    // This way, even if the database leaks, tokens can't be reused directly.
    const hashedToken = await bcrypt.hash(rawToken, 10);

    await this.prisma.refreshToken.create({
      data: {
        token: hashedToken,
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return rawToken; // the raw token goes to the client's cookie
  }
}
