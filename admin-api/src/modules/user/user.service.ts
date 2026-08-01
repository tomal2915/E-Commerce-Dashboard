// src/modules/user/user.service.ts — full corrected version
import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email is already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        phone: dto.phone,
        gender: dto.gender,
        roleId: dto.roleId,
      },
    });

    return this.sanitize(user);
  }

  async findAll(query: UserQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where = {
      roleId: query.roleId || undefined,
      isActive:
        query.isActive !== undefined ? query.isActive === 'true' : undefined,
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' as const } },
          { email: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        include: { role: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: users.map((u) => this.sanitize(u)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.sanitize(user);
  }

  async update(id: string, dto: UpdateUserDto, requestingUserId: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) {
      throw new NotFoundException('User not found');
    }

    if (requestingUserId === id && dto.roleId && dto.roleId !== target.roleId) {
      throw new ForbiddenException('You cannot change your own role');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone,
        gender: dto.gender,
        roleId: dto.roleId,
        isActive: dto.isActive,
      },
    });

    return this.sanitize(updated);
  }

  async remove(id: string, requestingUserId: string) {
    if (requestingUserId === id) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) {
      throw new NotFoundException('User not found');
    }

    // Hard delete — the record is permanently removed. RefreshToken rows
    // cascade automatically (onDelete: Cascade in schema).
    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted successfully' };
  }

  private sanitize(user: any) {
    const { password, ...rest } = user;
    return rest;
  }
}
