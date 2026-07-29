// src/common/guards/permission.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Step 1: Read the required permission attached by @RequirePermission()
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No permission required on this route? Let it through.
    if (!requiredPermission) {
      return true;
    }

    // Step 2: Get the user set by JwtAuthGuard (runs before this guard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.role) {
      throw new ForbiddenException('No role assigned to user');
    }

    // Step 3: Flatten the user's role permissions into a simple string array
    const userPermissions: string[] = user.role.permissions.map(
      (rp: any) => rp.permission.name,
    );

    // Step 4: Check if the required permission is in that list
    if (!userPermissions.includes(requiredPermission)) {
      throw new ForbiddenException(
        `Missing required permission: ${requiredPermission}`,
      );
    }

    return true;
  }
}
