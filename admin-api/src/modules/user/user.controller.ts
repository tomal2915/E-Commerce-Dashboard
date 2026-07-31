// src/modules/user/user.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { UserQueryDto } from './dto/user-query.dto';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @RequirePermission('user:create')
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @RequirePermission('user:watch')
  @Get()
  findAll(@Query() query: UserQueryDto) {
    return this.userService.findAll(query);
  }

  @RequirePermission('user:read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @RequirePermission('user:update')
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: Request,
  ) {
    return this.userService.update(id, dto, (req as any).user.id);
  }

  @RequirePermission('user:delete')
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.userService.remove(id, (req as any).user.id);
  }
}
