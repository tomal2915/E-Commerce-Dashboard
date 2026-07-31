// src/modules/category/category.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import slugify from 'slugify';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const slug = await this.generateUniqueSlug(dto.name);

    if (dto.parentId) {
      await this.assertParentExists(dto.parentId);
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        imageId: dto.imageId,
        parentId: dto.parentId,
        activeFlag: dto.activeFlag ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async findAll() {
    return this.prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  /**
   * Returns categories as a nested tree structure instead of a flat list —
   * ready for the frontend to render directly as a collapsible menu.
   */
  async getTree() {
    const allCategories = await this.prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    // Build a lookup map first: id -> category (with an empty children array)
    const map = new Map<string, any>();
    allCategories.forEach((cat) => map.set(cat.id, { ...cat, children: [] }));

    const tree: any[] = [];

    // Walk through once, attaching each category to its parent's children array
    for (const cat of allCategories) {
      const node = map.get(cat.id);
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId).children.push(node);
      } else {
        // No parent (or parent missing) => it's a top-level/root category
        tree.push(node);
      }
    }

    return tree;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.findOne(id);

    // ---- Cycle check #1: a category cannot be its own parent ----
    if (dto.parentId && dto.parentId === id) {
      throw new BadRequestException('A category cannot be its own parent');
    }

    // ---- Cycle check #2: a category cannot be moved under one of its own descendants ----
    // (e.g. "Electronics" cannot become a child of "Phones" if "Phones" is already
    // a child of "Electronics" — that would create an infinite loop)
    if (dto.parentId) {
      await this.assertParentExists(dto.parentId);
      await this.assertNotDescendant(id, dto.parentId);
    }

    let slug = category.slug;
    if (dto.name && dto.name !== category.name) {
      slug = await this.generateUniqueSlug(dto.name, id);
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        imageId: dto.imageId,
        parentId: dto.parentId,
        activeFlag: dto.activeFlag,
        sortOrder: dto.sortOrder,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const childCount = await this.prisma.category.count({
      where: { parentId: id },
    });
    if (childCount > 0) {
      throw new ConflictException(
        'Cannot delete a category that has subcategories. Delete or move them first.',
      );
    }

    const productCount = await this.prisma.product.count({
      where: { categories: { some: { categoryId: id } } },
    });
    if (productCount > 0) {
      throw new ConflictException(
        'Cannot delete a category that has products assigned to it.',
      );
    }

    await this.prisma.category.delete({ where: { id } });
    return { message: 'Category deleted successfully' };
  }

  // ---------- Helpers ----------

  private async assertParentExists(parentId: string) {
    const parent = await this.prisma.category.findUnique({
      where: { id: parentId },
    });
    if (!parent)
      throw new BadRequestException('Parent category does not exist');
  }

  /**
   * Walks UP the tree from the proposed new parent, checking whether it
   * ever reaches `categoryId`. If it does, assigning that parent would
   * create a circular reference.
   */
  private async assertNotDescendant(
    categoryId: string,
    proposedParentId: string,
  ) {
    let currentId: string | null = proposedParentId;

    while (currentId) {
      if (currentId === categoryId) {
        throw new BadRequestException(
          'Cannot set this parent — it would create a circular category reference',
        );
      }
      const current: { parentId: string | null } | null =
        await this.prisma.category.findUnique({
          where: { id: currentId },
          select: { parentId: true },
        });
      currentId = current?.parentId ?? null;
    }
  }

  private async generateUniqueSlug(
    name: string,
    excludeId?: string,
  ): Promise<string> {
    const baseSlug = slugify(name, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;

    // Keep trying "name", "name-1", "name-2"... until we find one that's free
    while (true) {
      const existing = await this.prisma.category.findUnique({
        where: { slug },
      });
      if (!existing || existing.id === excludeId) {
        return slug;
      }
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }
}
