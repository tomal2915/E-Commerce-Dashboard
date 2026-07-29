// src/modules/user/dto/update-user.dto.ts
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

// Users can update everything except password here (handle password reset separately)
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
) {}
