// src/modules/attribute/attribute.service.ts
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import slugify from 'slugify';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';
import { CreateAttributeValueDto } from './dto/create-attribute-value.dto';

@Injectable()
export class AttributeService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAttributeDto) {
    const existing = await this.prisma.attribute.findUnique({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException('An attribute with this name already exists');
    }

    const slug = slugify(dto.name, { lower: true, strict: true });

    return this.prisma.attribute.create({
      data: {
        name: dto.name,
        slug,
        type: dto.type,
        // If initial values were provided (e.g. ["Red", "Blue"]), create them too
        values: {
          create: (dto.values ?? []).map((value) => ({ value })),
        },
      },
      include: { values: true },
    });
  }

  async findAll() {
    return this.prisma.attribute.findMany({
      include: { values: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const attribute = await this.prisma.attribute.findUnique({
      where: { id },
      include: { values: true },
    });
    if (!attribute) throw new NotFoundException('Attribute not found');
    return attribute;
  }

  async update(id: string, dto: UpdateAttributeDto) {
    await this.findOne(id);

    if (dto.name) {
      const existing = await this.prisma.attribute.findUnique({ where: { name: dto.name } });
      if (existing && existing.id !== id) {
        throw new ConflictException('An attribute with this name already exists');
      }
    }

    return this.prisma.attribute.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.name ? slugify(dto.name, { lower: true, strict: true }) : undefined,
        type: dto.type,
      },
    });
  }

  /**
   * Blocks deleting an attribute if any of its values are still used by
   * product variants — deleting it would silently break those variants.
   */
  async remove(id: string) {
    await this.findOne(id);

    const usageCount = await this.prisma.productVariantAttribute.count({
      where: { attributeValue: { attributeId: id } },
    });
    if (usageCount > 0) {
      throw new ConflictException(
        'Cannot delete this attribute: one or more of its values are used in product variants.',
      );
    }

    await this.prisma.attribute.delete({ where: { id } });
    return { message: 'Attribute deleted successfully' };
  }

  // ---------- Attribute Values ----------

  async addValue(attributeId: string, dto: CreateAttributeValueDto) {
    await this.findOne(attributeId); // ensures attribute exists

    const existing = await this.prisma.attributeValue.findFirst({
      where: { attributeId, value: dto.value },
    });
    if (existing) {
      throw new ConflictException('This value already exists for this attribute');
    }

    return this.prisma.attributeValue.create({
      data: { value: dto.value, attributeId },
    });
  }

  async removeValue(valueId: string) {
    const value = await this.prisma.attributeValue.findUnique({ where: { id: valueId } });
    if (!value) throw new NotFoundException('Attribute value not found');

    const usageCount = await this.prisma.productVariantAttribute.count({
      where: { attributeValueId: valueId },
    });
    if (usageCount > 0) {
      throw new ConflictException(
        `Cannot delete this value: it is used by ${usageCount} product variant(s).`,
      );
    }

    await this.prisma.attributeValue.delete({ where: { id: valueId } });
    return { message: 'Attribute value deleted successfully' };
  }
}
