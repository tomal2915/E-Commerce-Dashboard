// src/modules/attribute/dto/create-attribute.dto.ts
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

const ATTRIBUTE_TYPES = [
  'dropdown',
  'radio',
  'checkbox',
  'colour_swatch',
  'image_swatch',
];

export class CreateAttributeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIn(ATTRIBUTE_TYPES)
  type: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  values?: string[];
}
