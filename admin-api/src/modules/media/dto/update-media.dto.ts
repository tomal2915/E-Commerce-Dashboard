// src/modules/media/dto/update-media.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class UpdateMediaDto {
  @IsOptional()
  @IsString()
  altText?: string;

  @IsOptional()
  @IsString()
  title?: string;
}
