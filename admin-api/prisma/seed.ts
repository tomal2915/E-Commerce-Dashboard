// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PERMISSION_GROUPS: Record<string, string[]> = {
  dashboard: ['watch'],
  permission: ['watch', 'create', 'read', 'update', 'delete'],
  role: ['watch', 'create', 'read', 'update', 'delete'],
  user: ['watch', 'create', 'read', 'update', 'delete'],
  media: ['watch', 'read', 'upload', 'write', 'delete'],
  category: ['watch', 'create', 'read', 'update', 'delete'],
  brand: ['watch', 'create', 'read', 'update', 'delete'],
  attribute: ['watch', 'create', 'read', 'update', 'delete'],
  product: ['watch', 'create', 'read', 'update', 'delete'],
};

// The limited user gets ONLY these modules — explicitly excludes
// permission, role, and user, so calling those endpoints returns 403.
const CATALOG_ONLY_GROUPS = [
  'dashboard',
  'product',
  'category',
  'brand',
  'attribute',
  'media',
];

async function main() {
  console.log('Seeding started...');

  const permissionMap = new Map<string, string>();

  for (const [groupName, actions] of Object.entries(PERMISSION_GROUPS)) {
    const group = await prisma.permissionGroup.upsert({
      where: { name: groupName },
      update: {},
      create: {
        name: groupName,
        description: `Permissions related to ${groupName}`,
      },
    });

    for (const action of actions) {
      const permissionName = `${groupName}:${action}`;
      const permission = await prisma.permission.upsert({
        where: { name: permissionName },
        update: {},
        create: {
          name: permissionName,
          description: `Allows "${action}" on ${groupName}`,
          parentGroupId: group.id,
        },
      });
      permissionMap.set(permissionName, permission.id)
    }
  }
  console.log(`Seeded ${permissionMap.size} permissions.`);

  // ---- Super Administrator: every permission ----
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'Super Administrator' },
    update: {},
    create: {
      name: 'Super Administrator',
      description: 'Full system access',
      status: true,
    },
  });

  await prisma.rolePermission.createMany({
    data: Array.from(permissionMap.values()).map((permissionId) => ({
      roleId: superAdminRole.id,
      permissionId,
    })),
    skipDuplicates: true,
  });
  console.log('Seeded "Super Administrator" role with all permissions.');

  // ---- Catalog Viewer: deliberately limited, no permission/role/user access ----
  const catalogRole = await prisma.role.upsert({
    where: { name: 'Catalog Manager' },
    update: {},
    create: {
      name: 'Catalog Manager',
      description:
        'Catalog access only — no permission, role, or user management',
      status: true,
    },
  });

  const catalogPermissionIds = Array.from(permissionMap.entries())
    .filter(([name]) =>
      CATALOG_ONLY_GROUPS.some((group) => name.startsWith(`${group}:`)),
    )
    .map(([, id]) => id);

  // Explicitly clear any old links first, in case this role previously had
  // broader permissions from an earlier seed run under the old permission set.
  await prisma.rolePermission.deleteMany({ where: { roleId: catalogRole.id } });
  await prisma.rolePermission.createMany({
    data: catalogPermissionIds.map((permissionId) => ({
      roleId: catalogRole.id,
      permissionId,
    })),
    skipDuplicates: true,
  });
  console.log(
    `Seeded "Catalog Manager" role with ${catalogPermissionIds.length} catalog-only permissions.`,
  );

  // ---- Users ----
  const superAdminPasswordHash = await bcrypt.hash('AdminPassword123!', 10);
  await prisma.user.upsert({
    where: { email: 'admin@dashboard.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@dashboard.com',
      password: superAdminPasswordHash,
      isActive: true,
      roleId: superAdminRole.id,
    },
  });
  console.log('Seeded Super Admin user (admin@dashboard.com).');

  const catalogPasswordHash = await bcrypt.hash('CatalogPassword123!', 10);
  await prisma.user.upsert({
    where: { email: 'catalog@dashboard.com' },
    update: {},
    create: {
      name: 'Catalog Manager',
      email: 'catalog@dashboard.com',
      password: catalogPasswordHash,
      isActive: true,
      roleId: catalogRole.id,
    },
  });
  console.log('Seeded Catalog Manager user (catalog@dashboard.com).');

  console.log('Seeding completed successfully.');
}

main()
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
