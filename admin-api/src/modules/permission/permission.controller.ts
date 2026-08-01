// src/modules/permission/permission.controller.ts
import { PermissionService } from './permission.service';
import { CreatePermissionGroupDto } from './dto/create-permission-group.dto';
import { PermissionQueryDto } from './dto/permission-query.dto';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Permissions')
@Controller('permissions')
export class PermissionController {
  constructor(private permissionService: PermissionService) {}

  @RequirePermission('permission:create')
  @Post('groups')
  createGroup(@Body() dto: CreatePermissionGroupDto) {
    return this.permissionService.createGroupWithPermissions(dto);
  }

  @RequirePermission('permission:watch')
  @Get('groups')
  getGroups(@Query() query: PermissionQueryDto) {
    return this.permissionService.getGroupedPermissions(query);
  }

  @RequirePermission('permission:delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.permissionService.remove(id);
  }

  @RequirePermission('permission:delete')
  @Delete('groups/:id')
  removeGroup(@Param('id') id: string) {
    return this.permissionService.removeGroup(id);
  }
}
