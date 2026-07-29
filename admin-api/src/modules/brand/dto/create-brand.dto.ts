// src/modules/brand/dto/create-brand.dto.ts
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBrandDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  logoId?: string;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
