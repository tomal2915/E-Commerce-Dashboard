// src/modules/role/dto/update-role.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateRoleDto } from './create-role.dto';

export class UpdateRoleDto extends PartialType(CreateRoleDto) {
  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
