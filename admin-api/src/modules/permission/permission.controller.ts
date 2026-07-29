// src/modules/permission/permission.controller.ts
import { Controller, Post, Get, Body } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { CreatePermissionGroupDto } from './dto/create-permission-group.dto';
import { RequirePermission } from '../../common/decorators/permissions.decorator';

@Controller('permissions')
export class PermissionController {
  constructor(private permissionService: PermissionService) {}

  @RequirePermission('permission:create')
  @Post('groups')
  createGroup(@Body() dto: CreatePermissionGroupDto) {
    return this.permissionService.createGroupWithPermissions(dto);
  }

  @RequirePermission('permission:read')
  @Get('groups')
  getGroups() {
    return this.permissionService.getGroupedPermissions();
  }
}
