// src/modules/user/dto/user-query.dto.ts
import { IsBooleanString, IsOptional, IsString } from 'class-validator';

export class UserQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsBooleanString()
  isActive?: string;
}
