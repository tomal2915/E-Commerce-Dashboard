// src/modules/brand/dto/brand-query.dto.ts
import { IsBooleanString, IsOptional, IsString } from 'class-validator';

export class BrandQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBooleanString()
  status?: string;
}
