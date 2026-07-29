// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ---- Define every permission group + its actions in one place ----
// This is the single source of truth for what permissions exist in the system.
const PERMISSION_GROUPS: Record<string, string[]> = {
  dashboard: ['watch'],
  product: ['create', 'read', 'update', 'delete'],
  category: ['create', 'read', 'update', 'delete'],
  brand: ['create', 'read', 'update', 'delete'],
  attribute: ['create', 'read', 'update', 'delete'],
  media: ['create', 'read', 'update', 'delete'],
  user: ['create', 'read', 'update', 'delete'],
  role: ['create', 'read', 'update', 'delete'],
  permission: ['create', 'read'],
};

// Which groups belong to the "Catalog Manager" role
const CATALOG_GROUPS = ['product', 'category', 'brand', 'attribute', 'media'];

async function main() {
  console.log('Seeding started...');

  // ============================================================
  // STEP 1: Seed Permission Groups + Permissions
  // ============================================================
  // We store every created permission in a map so we can easily
  // look up "give me the ID for product:create" later.
  const permissionMap = new Map<string, string>(); // name -> id

  for (const [groupName, actions] of Object.entries(PERMISSION_GROUPS)) {
    // upsert = "create if it doesn't exist, otherwise leave it as is"
    // This makes the script safe to run again without erroring on duplicates.
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

      permissionMap.set(permissionName, permission.id);
    }
  }

  console.log(`Seeded ${permissionMap.size} permissions.`);

  // ============================================================
  // STEP 2: Seed "Super Administrator" role with ALL permissions
  // ============================================================
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'Super Administrator' },
    update: {},
    create: {
      name: 'Super Administrator',
      description: 'Full access to every part of the system',
      status: true,
    },
  });

  const allPermissionIds = Array.from(permissionMap.values());

  await prisma.rolePermission.createMany({
    data: allPermissionIds.map((permissionId) => ({
      roleId: superAdminRole.id,
      permissionId,
    })),
    skipDuplicates: true, // avoids errors if this script runs a second time
  });

  console.log('Seeded "Super Administrator" role with all permissions.');

  // ============================================================
  // STEP 3: Seed "Catalog Manager" role with ONLY catalog permissions
  // ============================================================
  const catalogManagerRole = await prisma.role.upsert({
    where: { name: 'Catalog Manager' },
    update: {},
    create: {
      name: 'Catalog Manager',
      description:
        'Manages products, categories, brands, attributes, and media',
      status: true,
    },
  });

  // Pick out only the permissions whose name starts with one of the catalog group prefixes
  const catalogPermissionIds = Array.from(permissionMap.entries())
    .filter(([name]) =>
      CATALOG_GROUPS.some((group) => name.startsWith(`${group}:`)),
    )
    .map(([, id]) => id);

  await prisma.rolePermission.createMany({
    data: catalogPermissionIds.map((permissionId) => ({
      roleId: catalogManagerRole.id,
      permissionId,
    })),
    skipDuplicates: true,
  });

  console.log(
    `Seeded "Catalog Manager" role with ${catalogPermissionIds.length} catalog permissions.`,
  );

  // ============================================================
  // STEP 4: Seed the Super Admin user
  // ============================================================
  const superAdminPasswordHash = await bcrypt.hash('AdminPassword123!', 10);

  await prisma.user.upsert({
    where: { email: 'admin@dashboard.com' },
    update: {}, // don't overwrite an existing admin's data on re-run
    create: {
      name: 'Super Admin',
      email: 'admin@dashboard.com',
      password: superAdminPasswordHash,
      isActive: true,
      roleId: superAdminRole.id,
    },
  });

  console.log('Seeded Super Admin user (admin@dashboard.com).');

  // ============================================================
  // STEP 5: Seed the Catalog Manager user
  // ============================================================
  const catalogPasswordHash = await bcrypt.hash('CatalogPassword123!', 10);

  await prisma.user.upsert({
    where: { email: 'catalog@dashboard.com' },
    update: {},
    create: {
      name: 'Catalog Manager',
      email: 'catalog@dashboard.com',
      password: catalogPasswordHash,
      isActive: true,
      roleId: catalogManagerRole.id,
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
    // Always close the DB connection, whether seeding succeeded or failed
    await prisma.$disconnect();
  });
