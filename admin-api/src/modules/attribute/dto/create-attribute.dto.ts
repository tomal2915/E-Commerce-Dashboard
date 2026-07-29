// src/modules/attribute/dto/create-attribute.dto.ts
import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAttributeDto {
  @IsString()
  @IsNotEmpty()
  name: string; // e.g. "Color"

  @IsIn(['text', 'color', 'number'])
  type: string;

  // Optional: create some values right away, e.g. ["Red", "Blue"]
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  values?: string[];
}
