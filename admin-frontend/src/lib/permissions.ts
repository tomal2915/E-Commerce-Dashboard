// src/lib/permissions.ts
// Central place mapping every nav/section to the permission that unlocks it.
// The spec says drive visibility off "watch" permissions specifically.
export const NAV_PERMISSIONS = {
  dashboard: 'dashboard:watch',
  products: 'product:watch',
  categories: 'category:watch',
  brands: 'brand:watch',
  attributes: 'attribute:watch',
  media: 'media:watch',
  users: 'user:watch',
  roles: 'role:watch',
  permissions: 'permission:watch',
} as const;