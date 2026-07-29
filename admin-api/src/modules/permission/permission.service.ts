// src/modules/permission/permission.service.ts
import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePermissionGroupDto } from './dto/create-permission-group.dto';

@Injectable()
export class PermissionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Creates a PermissionGroup (e.g. "product") and automatically generates
   * one Permission row per requested action (e.g. "product:create", "product:read").
   * This saves the admin from manually typing every permission name by hand.
   */
  async createGroupWithPermissions(dto: CreatePermissionGroupDto) {
    // Step 1: Normalize the group name so we never get duplicates like
    // "Product", "product ", "PRODUCT" existing side by side.
    const normalizedGroupName = this.normalize(dto.name);

    const existingGroup = await this.prisma.permissionGroup.findUnique({
      where: { name: normalizedGroupName },
    });
    if (existingGroup) {
      throw new ConflictException(
        'A permission group with this name already exists',
      );
    }

    // Step 2: Create the parent group first
    const group = await this.prisma.permissionGroup.create({
      data: {
        name: normalizedGroupName,
        description: dto.description,
      },
    });

    // Step 3: Remove duplicate actions in case the same one was sent twice
    const uniqueActions = [...new Set(dto.actions)];

    // Step 4: Create one Permission per action, named "group:action"
    // e.g. group "product" + action "create" => "product:create"
    const permissions = await Promise.all(
      uniqueActions.map((action) =>
        this.prisma.permission.create({
          data: {
            name: `${normalizedGroupName}:${action}`,
            description: `Allows "${action}" on ${normalizedGroupName}`,
            parentGroupId: group.id,
          },
        }),
      ),
    );

    return { group, permissions };
  }

  /**
   * Returns every PermissionGroup with its child Permissions nested inside.
   * Useful for building a checkbox-tree UI on the frontend when assigning
   * permissions to a role (grouped by "product", "category", "user", etc).
   */
  async getGroupedPermissions() {
    return this.prisma.permissionGroup.findMany({
      include: { permissions: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Turns "  Product Category  " into "product-category".
   * Lowercase + no spaces keeps permission names consistent and URL/code-safe.
   */
  private normalize(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, '-');
  }
}
