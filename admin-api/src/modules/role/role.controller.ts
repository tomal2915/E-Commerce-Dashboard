// src/modules/role/role.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RequirePermission } from '../../common/decorators/permissions.decorator';

@Controller('roles')
export class RoleController {
  constructor(private roleService: RoleService) {}

  @RequirePermission('role:create')
  @Post()
  create(@Body() dto: CreateRoleDto) {
    return this.roleService.create(dto);
  }

  @RequirePermission('role:read')
  @Get()
  findAll() {
    return this.roleService.findAll();
  }

  @RequirePermission('role:read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roleService.findOne(id);
  }

  @RequirePermission('role:update')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.roleService.update(id, dto);
  }

  @RequirePermission('role:update')
  @Post(':id/grant-all')
  grantAll(@Param('id') id: string) {
    return this.roleService.grantAll(id);
  }

  @RequirePermission('role:delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.roleService.remove(id);
  }
}
