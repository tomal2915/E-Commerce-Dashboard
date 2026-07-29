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

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    // ---- Step 1: Validate business rules BEFORE touching the database ----
    this.validatePricing(dto);
    this.validateSingleThumbnail(dto.media ?? []);

    const slug = await this.generateUniqueSlug(dto.name);

    // Collect every SKU this request would create, so we can check for
    // duplicates within the SAME request (e.g. two variants with the same SKU)
    const incomingSkus = dto.hasVariants
      ? dto.variants!.map((v) => v.sku)
      : [dto.sku!];

    const hasDuplicateSkuInRequest =
      new Set(incomingSkus).size !== incomingSkus.length;
    if (hasDuplicateSkuInRequest) {
      throw new BadRequestException('Duplicate SKUs found within the request');
    }

    await this.assertSkusAreFree(incomingSkus);

    // ---- Step 2: Run everything inside a single transaction ----
    // If ANY step fails (e.g. a variant insert fails), Prisma rolls back
    // EVERYTHING — so we never end up with a half-created product.
    try {
      const product = await this.prisma.$transaction(async (tx) => {
        const created = await tx.product.create({
          data: {
            name: dto.name,
            slug,
            description: dto.description,
            hasVariants: dto.hasVariants,
            brandId: dto.brandId,

            // Simple product fields — undefined values are simply skipped by Prisma
            price: dto.hasVariants ? undefined : dto.price,
            salePrice: dto.hasVariants ? undefined : dto.salePrice,
            stock: dto.hasVariants ? undefined : dto.stock,
            sku: dto.hasVariants ? undefined : dto.sku,

            // Category links
            categories: {
              create: dto.categoryIds.map((categoryId) => ({ categoryId })),
            },

            // Product-level media links
            media: {
              create: (dto.media ?? []).map((m) => ({
                mediaId: m.mediaId,
                isThumbnail: m.isThumbnail ?? false,
                sortOrder: m.sortOrder ?? 0,
              })),
            },

            // Variants (only relevant when hasVariants = true)
            variants: dto.hasVariants
              ? {
                  create: dto.variants!.map((v) => ({
                    sku: v.sku,
                    price: v.price,
                    salePrice: v.salePrice,
                    stock: v.stock,
                    attributes: {
                      create: v.attributeValueIds.map((attributeValueId) => ({
                        attributeValueId,
                      })),
                    },
                  })),
                }
              : undefined,
          },
          include: {
            categories: { include: { category: true } },
            media: true,
            variants: { include: { attributes: true } },
            brand: true,
          },
        });

        return created;
      });

      return product;
    } catch (err) {
      // A race condition (two requests creating the same slug/sku at the
      // exact same time) shows up here as a Prisma "unique constraint" error.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Product slug or SKU already exists');
      }
      throw err;
    }
  }

  async findAll(query: ProductQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // Build the WHERE clause dynamically based on which filters were sent
    const where: Prisma.ProductWhereInput = {
      status: true,
      ...(query.search && {
        name: { contains: query.search, mode: 'insensitive' },
      }),
      ...(query.categoryId && {
        categories: { some: { categoryId: query.categoryId } },
      }),
      ...(query.brandId && { brandId: query.brandId }),
    };

    const [total, products] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          brand: true,
          categories: { include: { category: true } },
          media: { where: { isThumbnail: true }, take: 1 },
          variants: { select: { price: true, salePrice: true, stock: true } },
        },
      }),
    ]);

    return {
      data: products.map((p) => this.attachPriceSummary(p)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        brand: true,
        categories: { include: { category: true } },
        media: true,
        variants: {
          include: { attributes: { include: { attributeValue: true } } },
        },
      },
    });

    if (!product) throw new NotFoundException('Product not found');
    return this.attachPriceSummary(product);
  }

  // ---------- Helpers ----------

  private validatePricing(dto: CreateProductDto) {
    if (!dto.hasVariants) {
      // Simple product: check its single price/salePrice pair
      if (dto.salePrice && Number(dto.salePrice) > Number(dto.price)) {
        throw new BadRequestException('Sale price cannot exceed the normal price');
      }
      return;
    }

    // Variable product: check EVERY variant individually
    for (const variant of dto.variants ?? []) {
      if (variant.salePrice && Number(variant.salePrice) > Number(variant.price)) {
        throw new BadRequestException(
          `Sale price cannot exceed the normal price for SKU "${variant.sku}"`,
        );
      }
    }
  }

  private validateSingleThumbnail(media: { isThumbnail?: boolean }[]) {
    const thumbnailCount = media.filter((m) => m.isThumbnail).length;
    if (thumbnailCount > 1) {
      throw new BadRequestException('Only one media item can be marked as the thumbnail');
    }
  }

  private async assertSkusAreFree(skus: string[]) {
    // Check both simple-product SKUs and variant SKUs, since both draw
    // from the same "namespace" of unique SKUs in your catalog.
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
      const existing = await this.prisma.product.findUnique({ where: { slug } });
      if (!existing) return slug;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  /**
   * Adds a computed `priceInfo` field to a product:
   * - Simple product: a single price + salePrice.
   * - Variable product: the min/max price range across all its variants
   *   (this is what a storefront shows as "$20 - $45").
   */
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

    // For variable products, the "effective" price per variant is its
    // salePrice if set, otherwise its regular price.
    const effectivePrices = (product.variants ?? []).map((v: any) =>
      Number(v.salePrice ?? v.price),
    );

    const minPrice = effectivePrices.length ? Math.min(...effectivePrices) : 0;
    const maxPrice = effectivePrices.length ? Math.max(...effectivePrices) : 0;

    return {
      ...product,
      priceInfo: { minPrice, maxPrice },
    };
  }
}
