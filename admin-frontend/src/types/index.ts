// src/types/index.ts
export interface Permission { id: string; name: string; }
export interface PermissionGroup {
  id: string; name: string; description: string | null; permissions: Permission[];
}
export interface Role {
  id: string; name: string; description: string | null; status: boolean;
  permissions: Permission[]; userCount?: number;
}
export interface SessionUser {
  id: string; name: string; email: string; phone: string | null;
  isActive: boolean; role: { id: string; name: string }; permissions: string[];
}