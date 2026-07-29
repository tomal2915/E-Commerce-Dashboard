// src/modules/product/dto/create-product.dto.ts
import {
  IsArray,
  IsBoolean,
  IsDecimal,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ProductMediaInputDto {
  @IsString()
  @IsNotEmpty()
  mediaId: string;

  @IsOptional()
  @IsBoolean()
  isThumbnail?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

class VariantInputDto {
  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsDecimal()
  price: string;

  @IsOptional()
  @IsDecimal()
  salePrice?: string;

  @IsInt()
  @Min(0)
  stock: number;

  // Which attribute values this variant represents, e.g. [redValueId, largeValueId]
  @IsArray()
  @IsString({ each: true })
  attributeValueIds: string[];
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsBoolean()
  hasVariants: boolean;

  // ---- Simple product fields: required only when hasVariants = false ----
  @ValidateIf((dto) => dto.hasVariants === false)
  @IsDecimal()
  price?: string;

  @ValidateIf((dto) => dto.hasVariants === false)
  @IsOptional()
  @IsDecimal()
  salePrice?: string;

  @ValidateIf((dto) => dto.hasVariants === false)
  @IsInt()
  @Min(0)
  stock?: number;

  @ValidateIf((dto) => dto.hasVariants === false)
  @IsString()
  @IsNotEmpty()
  sku?: string;

  // ---- Variable product fields: required only when hasVariants = true ----
  @ValidateIf((dto) => dto.hasVariants === true)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantInputDto)
  variants?: VariantInputDto[];

  // ---- Shared fields ----
  @IsOptional()
  @IsString()
  brandId?: string;

  @IsArray()
  @IsString({ each: true })
  categoryIds: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductMediaInputDto)
  media?: ProductMediaInputDto[];
}
