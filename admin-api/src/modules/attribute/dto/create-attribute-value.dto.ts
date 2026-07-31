// src/modules/attribute/dto/create-attribute-value.dto.ts
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAttributeValueDto {
  @IsString()
  @IsNotEmpty()
  value: string;

  // Hex code, required in practice when the parent attribute's type is colour_swatch
  @IsOptional()
  @IsString()
  referenceValue?: string;

  // Media library reference, required in practice when type is image_swatch
  @IsOptional()
  @IsString()
  referenceMediaId?: string;
}
