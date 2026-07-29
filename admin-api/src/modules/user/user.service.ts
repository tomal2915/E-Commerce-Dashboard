// src/modules/user/user.service.ts
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

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: { role: true },
    });
    return users.map((u) => this.sanitize(u));
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

    // ---- Prevent self-escalation ----
    // If the person making the request IS the user being edited,
    // and they're trying to change their own roleId, block it.
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

    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted successfully' };
  }

  // Never send the password hash back to the client
  private sanitize(user: any) {
    const { password, ...rest } = user;
    return rest;
  }
}
