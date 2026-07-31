// src/modules/role/role.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

// The one permission we never let disappear from every single role at once.
// Without at least one role holding this, nobody could ever fix roles again.
const CRITICAL_PERMISSION_NAME = 'role:update';

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

  /**
   * Creates a role and, in the same request, attaches whichever
   * permissionIds were sent — no need for a second API call.
   */
  async create(dto: CreateRoleDto) {
    const existing = await this.prisma.role.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('A role with this name already exists');
    }

    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description,
        // Nested create: makes one RolePermission row per permissionId
        permissions: {
          create: (dto.permissionIds ?? []).map((permissionId) => ({
            permissionId,
          })),
        },
      },
      include: { permissions: { include: { permission: true } } },
    });

    return this.formatRole(role);
  }

  async findAll() {
    const roles = await this.prisma.role.findMany({
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });
    return roles.map((r) => ({
      ...this.formatRole(r),
      userCount: r._count.users,
    }));
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });
    if (!role) throw new NotFoundException('Role not found');
    return { ...this.formatRole(role), userCount: role._count.users };
  }

  /**
   * "Grant All" shortcut — attaches every permission that exists in the
   * system to this role in one go. Typically used once, for the Admin role.
   */
  async grantAll(roleId: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');

    const allPermissions = await this.prisma.permission.findMany({
      select: { id: true },
    });

    await this.prisma.rolePermission.createMany({
      data: allPermissions.map((p) => ({ roleId, permissionId: p.id })),
      skipDuplicates: true, // won't error if the role already has some of them
    });

    return this.findOne(roleId);
  }

  /**
   * Updates a role's basic info and/or replaces its entire permission list.
   * Runs a safety check first if permissions are being changed.
   */
  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { permissions: true },
    });
    if (!role) throw new NotFoundException('Role not found');

    // Only run the lockout check if the caller is actually changing permissions
    if (dto.permissionIds) {
      await this.assertNotRemovingLastRoleUpdateHolder(role, dto.permissionIds);
    }

    await this.prisma.role.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        status: dto.status,
      },
    });

    if (dto.permissionIds) {
      // Simplest safe way to "replace" a many-to-many list:
      // wipe the old links, then insert the new ones.
      await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
      await this.prisma.rolePermission.createMany({
        data: dto.permissionIds.map((permissionId) => ({
          roleId: id,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }

    return this.findOne(id);
  }

  /**
   * Deletes a role — but only if no user currently belongs to it.
   * Otherwise those users would be left with a broken/missing role.
   */
  async remove(id: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');

    const assignedUserCount = await this.prisma.user.count({
      where: { roleId: id },
    });
    if (assignedUserCount > 0) {
      throw new ConflictException(
        `Cannot delete this role: ${assignedUserCount} user(s) are still assigned to it. Reassign them first.`,
      );
    }

    await this.prisma.role.delete({ where: { id } });
    return { message: 'Role deleted successfully' };
  }

  /**
   * Safety check: stops an update if it would remove "role:update" from
   * the very last role that has it — which would lock every admin out of
   * ever managing roles/permissions again.
   */
  private async assertNotRemovingLastRoleUpdateHolder(
    role: { id: string; permissions: { permissionId: string }[] },
    newPermissionIds: string[],
  ) {
    const criticalPermission = await this.prisma.permission.findUnique({
      where: { name: CRITICAL_PERMISSION_NAME },
    });

    // If "role:update" doesn't even exist yet in the system, there's nothing to protect.
    if (!criticalPermission) return;

    const roleCurrentlyHasIt = role.permissions.some(
      (rp) => rp.permissionId === criticalPermission.id,
    );
    const roleWillStillHaveIt = newPermissionIds.includes(
      criticalPermission.id,
    );

    // If it's not being removed, there's nothing to check.
    if (!roleCurrentlyHasIt || roleWillStillHaveIt) return;

    // Count how many OTHER roles (besides this one) also hold this permission.
    const otherHoldersCount = await this.prisma.rolePermission.count({
      where: {
        permissionId: criticalPermission.id,
        roleId: { not: role.id },
      },
    });

    if (otherHoldersCount === 0) {
      throw new ForbiddenException(
        'Cannot remove "role:update" permission — this is the last role that has it, and removing it would lock everyone out of managing roles.',
      );
    }
  }

  /**
   * Flattens the nested Prisma include shape into a simple, frontend-friendly
   * object with a plain array of permission names instead of deep nesting.
   */
  private formatRole(role: any) {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      status: role.status,
      permissions: role.permissions.map((rp: any) => ({
        id: rp.permission.id,
        name: rp.permission.name,
      })),
    };
  }
}
