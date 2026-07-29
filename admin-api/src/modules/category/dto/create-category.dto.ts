// src/modules/category/dto/create-category.dto.ts
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageId?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsBoolean()
  activeFlag?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
