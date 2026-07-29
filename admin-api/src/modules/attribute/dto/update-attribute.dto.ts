// src/modules/attribute/dto/update-attribute.dto.ts
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateAttributeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsIn(['text', 'color', 'number'])
  type?: string;
}
