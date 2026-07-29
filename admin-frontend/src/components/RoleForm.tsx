// src/components/RoleForm.tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';

interface Permission {
  id: string;
  name: string; // e.g. "product:create"
}

interface PermissionGroup {
  id: string;
  name: string; // e.g. "product"
  permissions: Permission[];
}

interface RoleFormProps {
  initialData?: { name: string; description?: string; permissionIds: string[] };
  onSubmit: (data: { name: string; description: string; permissionIds: string[] }) => Promise<void>;
}

const ACTIONS = ['create', 'read', 'update', 'delete', 'watch'];

export function RoleForm({ initialData, onSubmit }: RoleFormProps) {
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(initialData?.permissionIds ?? []),
  );
  const [isSaving, setIsSaving] = useState(false);

  // Load all available permission groups to build the grid
  useEffect(() => {
    api.get('/permissions/groups').then((res) => setGroups(res.data.data));
  }, []);

  function togglePermission(permissionId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(permissionId) ? next.delete(permissionId) : next.add(permissionId);
      return next;
    });
  }

  // Toggles every permission in a single row (e.g. all of "product"'s actions at once)
  function toggleEntireGroup(group: PermissionGroup) {
    const groupPermissionIds = group.permissions.map((p) => p.id);
    const allSelected = groupPermissionIds.every((id) => selectedIds.has(id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      groupPermissionIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSubmit({ name, description, permissionIds: Array.from(selectedIds) });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Role Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          placeholder="e.g. Catalog Manager"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      {/* ---- Permission Grid: rows = modules, columns = actions ---- */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Permissions</label>
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Module</th>
                {ACTIONS.map((action) => (
                  <th key={action} className="text-center px-3 py-2 font-medium capitalize">
                    {action}
                  </th>
                ))}
                <th className="text-center px-3 py-2 font-medium">All</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const groupPermissionIds = group.permissions.map((p) => p.id);
                const allSelected = groupPermissionIds.every((id) => selectedIds.has(id));

                return (
                  <tr key={group.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium capitalize text-slate-800">
                      {group.name}
                    </td>

                    {ACTIONS.map((action) => {
                      const permission = group.permissions.find(
                        (p) => p.name === `${group.name}:${action}`,
                      );
                      return (
                        <td key={action} className="text-center px-3 py-2">
                          {permission ? (
                            <input
                              type="checkbox"
                              checked={selectedIds.has(permission.id)}
                              onChange={() => togglePermission(permission.id)}
                              className="w-4 h-4 accent-slate-900 cursor-pointer"
                            />
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}

                    <td className="text-center px-3 py-2">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => toggleEntireGroup(group)}
                        className="w-4 h-4 accent-slate-700 cursor-pointer"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSaving}
        className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
      >
        {isSaving ? 'Saving...' : 'Save Role'}
      </button>
    </form>
  );
}