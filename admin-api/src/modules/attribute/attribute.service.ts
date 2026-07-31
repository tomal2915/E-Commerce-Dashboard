// src/modules/attribute/attribute.service.ts — full replacement
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import slugify from 'slugify';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';
import { CreateAttributeValueDto } from './dto/create-attribute-value.dto';

@Injectable()
export class AttributeService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAttributeDto) {
    const existing = await this.prisma.attribute.findUnique({
      where: { name: dto.name },
    });
    if (existing)
      throw new ConflictException('An attribute with this name already exists');

    const slug = slugify(dto.name, { lower: true, strict: true });

    return this.prisma.attribute.create({
      data: {
        name: dto.name,
        slug,
        type: dto.type,
        values: {
          create: (dto.values ?? []).map((value) => ({
            value,
            slug: slugify(value, { lower: true, strict: true }),
          })),
        },
      },
      include: { values: true },
    });
  }

  async findAll() {
    return this.prisma.attribute.findMany({
      include: { values: { include: { referenceMedia: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const attribute = await this.prisma.attribute.findUnique({
      where: { id },
      include: { values: { include: { referenceMedia: true } } },
    });
    if (!attribute) throw new NotFoundException('Attribute not found');
    return attribute;
  }

  async update(id: string, dto: UpdateAttributeDto) {
    await this.findOne(id);
    if (dto.name) {
      const existing = await this.prisma.attribute.findUnique({
        where: { name: dto.name },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          'An attribute with this name already exists',
        );
      }
    }
    return this.prisma.attribute.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.name
          ? slugify(dto.name, { lower: true, strict: true })
          : undefined,
        type: dto.type,
      },
    });
  }

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

  async addValue(attributeId: string, dto: CreateAttributeValueDto) {
    const attribute = await this.findOne(attributeId);

    if (attribute.type === 'colour_swatch' && !dto.referenceValue) {
      throw new BadRequestException(
        'referenceValue (hex code) is required for a colour_swatch attribute',
      );
    }
    if (attribute.type === 'image_swatch' && !dto.referenceMediaId) {
      throw new BadRequestException(
        'referenceMediaId is required for an image_swatch attribute',
      );
    }

    try {
      return await this.prisma.attributeValue.create({
        data: {
          value: dto.value,
          slug: slugify(dto.value, { lower: true, strict: true }),
          referenceValue: dto.referenceValue,
          referenceMediaId: dto.referenceMediaId,
          attributeId,
        },
      });
    } catch (err) {
      // DB-enforced @@unique([attributeId, value]) — catch and convert to 409
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'This value already exists for this attribute',
        );
      }
      throw err;
    }
  }

  async updateValue(valueId: string, dto: CreateAttributeValueDto) {
    const value = await this.prisma.attributeValue.findUnique({
      where: { id: valueId },
    });
    if (!value) throw new NotFoundException('Attribute value not found');

    try {
      return await this.prisma.attributeValue.update({
        where: { id: valueId },
        data: {
          value: dto.value,
          slug: dto.value
            ? slugify(dto.value, { lower: true, strict: true })
            : undefined,
          referenceValue: dto.referenceValue,
          referenceMediaId: dto.referenceMediaId,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'This value already exists for this attribute',
        );
      }
      throw err;
    }
  }

  async removeValue(valueId: string) {
    const value = await this.prisma.attributeValue.findUnique({
      where: { id: valueId },
    });
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
