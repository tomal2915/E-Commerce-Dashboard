// src/modules/attribute/dto/create-attribute-value.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateAttributeValueDto {
  @IsString()
  @IsNotEmpty()
  value: string; // e.g. "Red"
}
