// src/modules/brand/brand.service.ts

import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import slugify from 'slugify';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { BrandQueryDto } from './dto/brand-query.dto';

// interface FindAllQuery {
//   search?: string;
//   status?: string;
//   page?: number;
//   limit?: number;
// }

@Injectable()
export class BrandService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBrandDto) {
    await this.assertNameIsFree(dto.name);
    const slug = await this.generateUniqueSlug(dto.name);

    return this.prisma.brand.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        logoId: dto.logoId,
        status: dto.status ?? true,
      },
    });
  }

  async findAll(query: BrandQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where = {
      name: query.search
        ? { contains: query.search, mode: 'insensitive' as const }
        : undefined,
      status: query.status !== undefined ? query.status === 'true' : undefined,
    };

    const [total, brands] = await this.prisma.$transaction([
      this.prisma.brand.count({ where }),
      this.prisma.brand.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: brands,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async update(id: string, dto: UpdateBrandDto) {
    const brand = await this.findOne(id);

    let slug = brand.slug;
    if (dto.name && dto.name !== brand.name) {
      await this.assertNameIsFree(dto.name, id);
      slug = await this.generateUniqueSlug(dto.name, id);
    }

    return this.prisma.brand.update({
      where: { id },
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        logoId: dto.logoId,
        status: dto.status,
      },
    });
  }

  /**
   * Blocks deletion if any product still references this brand — otherwise
   * those products would be left pointing at a brand that no longer exists.
   */
  async remove(id: string) {
    await this.findOne(id);

    const productCount = await this.prisma.product.count({
      where: { brandId: id },
    });
    if (productCount > 0) {
      throw new ConflictException(
        `Cannot delete this brand: ${productCount} product(s) are still linked to it.`,
      );
    }

    await this.prisma.brand.delete({ where: { id } });
    return { message: 'Brand deleted successfully' };
  }

  // ---------- Helpers ----------

  private async assertNameIsFree(name: string, excludeId?: string) {
    const existing = await this.prisma.brand.findUnique({ where: { name } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException('A brand with this name already exists');
    }
  }

  private async generateUniqueSlug(
    name: string,
    excludeId?: string,
  ): Promise<string> {
    const baseSlug = slugify(name, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.brand.findUnique({ where: { slug } });
      if (!existing || existing.id === excludeId) {
        return slug;
      }
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }
}
