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
  @IsBoolean()
  isGallery?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

class VariantMediaInputDto {
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

  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  @IsOptional()
  @IsDecimal()
  weight?: string;

  @IsOptional()
  @IsBoolean()
  activeFlag?: boolean;

  @IsArray()
  @IsString({ each: true })
  attributeValueIds: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantMediaInputDto)
  media?: VariantMediaInputDto[];
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  longDescription?: string;

  @IsBoolean()
  hasVariants: boolean;

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

  @ValidateIf((dto) => dto.hasVariants === true)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantInputDto)
  variants?: VariantInputDto[];

  @IsOptional()
  @IsDecimal()
  weight?: string;

  @IsOptional()
  @IsBoolean()
  activeFlag?: boolean;

  @IsOptional()
  @IsBoolean()
  featuredFlag?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

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

  // Media attached directly to an attribute value (e.g. "Red" swatch photos),
  // shared across every variant that uses that value — set once here.
  @IsOptional()
  @IsArray()
  attributeValueMedia?: { attributeValueId: string; mediaId: string }[];
}
