// src/modules/permission/dto/create-permission-group.dto.ts
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

// Restrict actions to a known, safe set of values
export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  WATCH = 'watch',
}

export class CreatePermissionGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string; // e.g. "Product" or "product" — will be normalized

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsEnum(PermissionAction, { each: true })
  actions: PermissionAction[]; // e.g. ["create", "read", "update"]
}
