// src/modules/product/product.service.ts

import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import slugify from 'slugify';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const LOW_STOCK_DEFAULT_THRESHOLD = 5;

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    this.validatePricing(dto);
    this.validateSingleThumbnail(dto.media ?? []);
    if (dto.hasVariants)
      this.validateVariantMediaThumbnails(dto.variants ?? []);
    if (dto.hasVariants)
      this.validateNoDuplicateCombinations(dto.variants ?? []);

    const slug = await this.generateUniqueSlug(dto.name);

    const incomingSkus = dto.hasVariants
      ? dto.variants!.map((v) => v.sku)
      : [dto.sku!];
    if (new Set(incomingSkus).size !== incomingSkus.length) {
      throw new BadRequestException('Duplicate SKUs found within the request');
    }
    await this.assertSkusAreFree(incomingSkus);

    if (dto.hasVariants) {
      await this.assertAttributeValuesExist(dto.variants!);
    }

    try {
      const product = await this.prisma.$transaction(async (tx) => {
        const created = await tx.product.create({
          data: {
            name: dto.name,
            slug,
            shortDescription: dto.shortDescription,
            longDescription: dto.longDescription,
            hasVariants: dto.hasVariants,
            brandId: dto.brandId,
            weight: dto.weight,
            activeFlag: dto.activeFlag ?? true,
            featuredFlag: dto.featuredFlag ?? false,
            sortOrder: dto.sortOrder ?? 0,

            price: dto.hasVariants ? undefined : dto.price,
            salePrice: dto.hasVariants ? undefined : dto.salePrice,
            stock: dto.hasVariants ? undefined : dto.stock,
            sku: dto.hasVariants ? undefined : dto.sku,
            stockStatus: dto.hasVariants
              ? undefined
              : this.deriveStockStatus(dto.stock, LOW_STOCK_DEFAULT_THRESHOLD),

            categories: {
              create: dto.categoryIds.map((categoryId) => ({ categoryId })),
            },

            media: {
              create: (dto.media ?? []).map((m) => ({
                mediaId: m.mediaId,
                isThumbnail: m.isThumbnail ?? false,
                isGallery: m.isGallery ?? true,
                sortOrder: m.sortOrder ?? 0,
              })),
            },

            variants: dto.hasVariants
              ? {
                  create: dto.variants!.map((v) => ({
                    sku: v.sku,
                    price: v.price,
                    salePrice: v.salePrice,
                    stock: v.stock,
                    lowStockThreshold:
                      v.lowStockThreshold ?? LOW_STOCK_DEFAULT_THRESHOLD,
                    weight: v.weight,
                    activeFlag: v.activeFlag ?? true,
                    stockStatus: this.deriveStockStatus(
                      v.stock,
                      v.lowStockThreshold ?? LOW_STOCK_DEFAULT_THRESHOLD,
                    ),
                    attributes: {
                      create: v.attributeValueIds.map((attributeValueId) => ({
                        attributeValueId,
                      })),
                    },
                    media: {
                      create: (v.media ?? []).map((m) => ({
                        mediaId: m.mediaId,
                        isThumbnail: m.isThumbnail ?? false,
                        sortOrder: m.sortOrder ?? 0,
                      })),
                    },
                  })),
                }
              : undefined,
          },
          include: {
            categories: { include: { category: true } },
            media: { include: { media: true } },
            variants: {
              include: {
                attributes: { include: { attributeValue: true } },
                media: { include: { media: true } },
              },
            },
            brand: true,
          },
        });

        // Attribute-value-level media (e.g. "Red" swatch photos) — attached once,
        // shared across every variant using that value, per spec.
        if (dto.attributeValueMedia?.length) {
          await tx.productMedia.createMany({
            data: dto.attributeValueMedia.map((m) => ({
              mediaId: m.mediaId,
              attributeValueId: m.attributeValueId,
              isGallery: true,
            })),
          });
        }

        return created;
      });

      return product;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Product slug or SKU already exists');
      }
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2003'
      ) {
        throw new BadRequestException(
          'A referenced category, brand, media item, or attribute value does not exist',
        );
      }
      throw err;
    }
  }

  async findAll(query: ProductQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.ProductWhereInput = {
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { sku: { contains: query.search, mode: 'insensitive' } },
          {
            variants: {
              some: { sku: { contains: query.search, mode: 'insensitive' } },
            },
          },
        ],
      }),
      ...(query.categoryId && {
        categories: { some: { categoryId: query.categoryId } },
      }),
      ...(query.brandId && { brandId: query.brandId }),
      ...(query.status && { activeFlag: query.status === 'active' }),
    };

    const orderBy = query.sortBy
      ? { [query.sortBy]: query.sortDir ?? 'asc' }
      : { createdAt: 'desc' as const };

    const [total, products] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: {
          brand: true,
          categories: { include: { category: true } },
          media: {
            where: { isThumbnail: true },
            include: { media: true },
            take: 1,
          },
          variants: { select: { price: true, salePrice: true, stock: true } },
        },
      }),
    ]);

    return {
      data: products.map((p) => this.attachPriceSummary(p)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        brand: true,
        categories: { include: { category: true } },
        media: { include: { media: true } },
        variants: {
          include: {
            attributes: {
              include: {
                attributeValue: { include: { referenceMedia: true } },
              },
            },
            media: { include: { media: true } },
          },
        },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return this.attachPriceSummary(product);
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    // Variants and ProductMedia attachment rows cascade via onDelete: Cascade —
    // the underlying Media assets themselves are untouched, since other
    // products may still reference them.
    await this.prisma.product.delete({ where: { id } });
    return { message: 'Product deleted successfully' };
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product not found');

    this.validatePricing(dto);
    this.validateSingleThumbnail(dto.media ?? []);
    if (dto.hasVariants)
      this.validateVariantMediaThumbnails(dto.variants ?? []);
    if (dto.hasVariants)
      this.validateNoDuplicateCombinations(dto.variants ?? []);

    // Only regenerate the slug if the name actually changed
    let slug = existing.slug;
    if (dto.name !== existing.name) {
      slug = await this.generateUniqueSlugForUpdate(dto.name, id);
    }

    const incomingSkus = dto.hasVariants
      ? dto.variants!.map((v) => v.sku)
      : [dto.sku!];
    if (new Set(incomingSkus).size !== incomingSkus.length) {
      throw new BadRequestException('Duplicate SKUs found within the request');
    }
    // Excludes this product's own current SKUs, so keeping an unchanged SKU
    // doesn't falsely trigger a "SKU already in use" conflict against itself.
    await this.assertSkusAreFreeForUpdate(incomingSkus, id);

    if (dto.hasVariants) {
      await this.assertAttributeValuesExist(dto.variants!);
    }

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id },
          data: {
            name: dto.name,
            slug,
            shortDescription: dto.shortDescription,
            longDescription: dto.longDescription,
            hasVariants: dto.hasVariants,
            brandId: dto.brandId,
            weight: dto.weight,
            activeFlag: dto.activeFlag ?? true,
            featuredFlag: dto.featuredFlag ?? false,
            sortOrder: dto.sortOrder ?? 0,
            // Switching product type clears out fields that belong to the other type
            price: dto.hasVariants ? null : dto.price,
            salePrice: dto.hasVariants ? null : dto.salePrice,
            stock: dto.hasVariants ? null : dto.stock,
            sku: dto.hasVariants ? null : dto.sku,
            stockStatus: dto.hasVariants
              ? null
              : this.deriveStockStatus(dto.stock, LOW_STOCK_DEFAULT_THRESHOLD),
          },
        });

        // ---- Categories: full replace ----
        await tx.productCategory.deleteMany({ where: { productId: id } });
        await tx.productCategory.createMany({
          data: dto.categoryIds.map((categoryId) => ({
            productId: id,
            categoryId,
          })),
        });

        // ---- Product-level media: full replace (handles thumbnail swap + reorder) ----
        await tx.productMedia.deleteMany({ where: { productId: id } });
        await tx.productMedia.createMany({
          data: (dto.media ?? []).map((m) => ({
            productId: id,
            mediaId: m.mediaId,
            isThumbnail: m.isThumbnail ?? false,
            isGallery: m.isGallery ?? true,
            sortOrder: m.sortOrder ?? 0,
          })),
        });

        // ---- Variants: full replace ----
        // Deleting existing variants cascades their attribute links and
        // variant-level media (onDelete: Cascade in schema) — then we
        // recreate exactly what was submitted, which naturally handles
        // adding new variants and removing ones no longer present.
        await tx.productVariant.deleteMany({ where: { productId: id } });

        if (dto.hasVariants) {
          for (const v of dto.variants!) {
            await tx.productVariant.create({
              data: {
                productId: id,
                sku: v.sku,
                price: v.price,
                salePrice: v.salePrice,
                stock: v.stock,
                lowStockThreshold:
                  v.lowStockThreshold ?? LOW_STOCK_DEFAULT_THRESHOLD,
                weight: v.weight,
                activeFlag: v.activeFlag ?? true,
                stockStatus: this.deriveStockStatus(
                  v.stock,
                  v.lowStockThreshold ?? LOW_STOCK_DEFAULT_THRESHOLD,
                ),
                attributes: {
                  create: v.attributeValueIds.map((attributeValueId) => ({
                    attributeValueId,
                  })),
                },
                media: {
                  create: (v.media ?? []).map((m) => ({
                    mediaId: m.mediaId,
                    isThumbnail: m.isThumbnail ?? false,
                    sortOrder: m.sortOrder ?? 0,
                  })),
                },
              },
            });
          }
        }

        // ---- Attribute-value-level media: add any newly provided ones ----
        // Not deleted here, since these attachments conceptually belong to the
        // attribute value (e.g. "Red" swatch photos), not exclusively to this product.
        if (dto.attributeValueMedia?.length) {
          await tx.productMedia.createMany({
            data: dto.attributeValueMedia.map((m) => ({
              mediaId: m.mediaId,
              attributeValueId: m.attributeValueId,
              isGallery: true,
            })),
          });
        }

        return tx.product.findUnique({
          where: { id },
          include: {
            categories: { include: { category: true } },
            media: { include: { media: true } },
            variants: {
              include: {
                attributes: { include: { attributeValue: true } },
                media: { include: { media: true } },
              },
            },
            brand: true,
          },
        });
      });

      return this.attachPriceSummary(updated);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Product slug or SKU already exists');
      }
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2003'
      ) {
        throw new BadRequestException(
          'A referenced category, brand, media item, or attribute value does not exist',
        );
      }
      throw err;
    }
  }

  // ---------- Validation helpers ----------

  private validatePricing(dto: CreateProductDto) {
    if (!dto.hasVariants) {
      if (dto.salePrice && Number(dto.salePrice) > Number(dto.price)) {
        throw new BadRequestException(
          'Sale price cannot exceed the normal price',
        );
      }
      if (Number(dto.price) < 0 || (dto.stock ?? 0) < 0) {
        throw new BadRequestException('Price and stock cannot be negative');
      }
      return;
    }
    for (const variant of dto.variants ?? []) {
      if (
        variant.salePrice &&
        Number(variant.salePrice) > Number(variant.price)
      ) {
        throw new BadRequestException(
          `Sale price cannot exceed the normal price for SKU "${variant.sku}"`,
        );
      }
      if (Number(variant.price) < 0 || variant.stock < 0) {
        throw new BadRequestException(
          `Price and stock cannot be negative for SKU "${variant.sku}"`,
        );
      }
    }
  }

  private validateSingleThumbnail(media: { isThumbnail?: boolean }[]) {
    if (media.filter((m) => m.isThumbnail).length > 1) {
      throw new BadRequestException(
        'Only one media item can be marked as the product thumbnail',
      );
    }
  }

  private validateVariantMediaThumbnails(
    variants: { sku: string; media?: { isThumbnail?: boolean }[] }[],
  ) {
    for (const v of variants) {
      if ((v.media ?? []).filter((m) => m.isThumbnail).length > 1) {
        throw new BadRequestException(
          `Only one media item can be marked as the thumbnail for variant "${v.sku}"`,
        );
      }
    }
  }

  private validateNoDuplicateCombinations(
    variants: { attributeValueIds: string[] }[],
  ) {
    const keys = variants.map((v) => [...v.attributeValueIds].sort().join('-'));
    if (new Set(keys).size !== keys.length) {
      throw new BadRequestException(
        'Two variants cannot share the identical attribute combination',
      );
    }
  }

  private async assertAttributeValuesExist(
    variants: { attributeValueIds: string[] }[],
  ) {
    const allIds = Array.from(
      new Set(variants.flatMap((v) => v.attributeValueIds)),
    );
    if (allIds.length === 0) return;
    const found = await this.prisma.attributeValue.findMany({
      where: { id: { in: allIds } },
    });
    if (found.length !== allIds.length) {
      throw new BadRequestException(
        'One or more variants reference an attribute value that does not exist',
      );
    }
  }

  private async assertSkusAreFree(skus: string[]) {
    const [existingProduct, existingVariant] = await Promise.all([
      this.prisma.product.findFirst({ where: { sku: { in: skus } } }),
      this.prisma.productVariant.findFirst({ where: { sku: { in: skus } } }),
    ]);
    if (existingProduct || existingVariant) {
      const clashingSku = existingProduct?.sku ?? existingVariant?.sku;
      throw new ConflictException(`SKU "${clashingSku}" is already in use`);
    }
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = slugify(name, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const existing = await this.prisma.product.findUnique({
        where: { slug },
      });
      if (!existing) return slug;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  private async generateUniqueSlugForUpdate(
    name: string,
    productId: string,
  ): Promise<string> {
    const baseSlug = slugify(name, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const existing = await this.prisma.product.findUnique({
        where: { slug },
      });
      if (!existing || existing.id === productId) return slug;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  private async assertSkusAreFreeForUpdate(skus: string[], productId: string) {
    const [existingProduct, existingVariant] = await Promise.all([
      this.prisma.product.findFirst({
        where: { sku: { in: skus }, id: { not: productId } },
      }),
      this.prisma.productVariant.findFirst({
        where: { sku: { in: skus }, productId: { not: productId } },
      }),
    ]);
    if (existingProduct || existingVariant) {
      const clashingSku = existingProduct?.sku ?? existingVariant?.sku;
      throw new ConflictException(`SKU "${clashingSku}" is already in use`);
    }
  }

  private deriveStockStatus(
    stock: number | undefined,
    lowStockThreshold: number,
  ): string {
    const s = stock ?? 0;
    if (s <= 0) return 'out_of_stock';
    if (s <= lowStockThreshold) return 'low_stock';
    return 'in_stock';
  }

  private attachPriceSummary(product: any) {
    if (!product.hasVariants) {
      return {
        ...product,
        priceInfo: {
          price: product.price,
          salePrice: product.salePrice,
          minPrice: Number(product.salePrice ?? product.price),
          maxPrice: Number(product.salePrice ?? product.price),
        },
      };
    }
    const effectivePrices = (product.variants ?? []).map((v: any) =>
      Number(v.salePrice ?? v.price),
    );
    const minPrice = effectivePrices.length ? Math.min(...effectivePrices) : 0;
    const maxPrice = effectivePrices.length ? Math.max(...effectivePrices) : 0;
    return { ...product, priceInfo: { minPrice, maxPrice } };
  }
}
