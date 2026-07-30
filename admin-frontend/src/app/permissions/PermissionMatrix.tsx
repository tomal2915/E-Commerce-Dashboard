// src/components/permission/PermissionMatrix.tsx
"use client";
import { PermissionGroup } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";

const ACTIONS = ["create", "read", "update", "delete", "watch"];

export function PermissionMatrix({
  groups,
  selectedIds,
  onChange,
}: {
  groups: PermissionGroup[];
  selectedIds: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  function toggleOne(id: string) {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange(next);
  }

  function toggleGroup(group: PermissionGroup) {
    const ids = group.permissions.map((p) => p.id);
    const allSelected = ids.every((id) => selectedIds.has(id));
    const next = new Set(selectedIds);
    ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
    onChange(next);
  }

  function toggleAll() {
    const allIds = groups.flatMap((g) => g.permissions.map((p) => p.id));
    const allSelected = allIds.every((id) => selectedIds.has(id));
    onChange(allSelected ? new Set() : new Set(allIds));
  }

  const allIds = groups.flatMap((g) => g.permissions.map((p) => p.id));
  const everythingSelected =
    allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

  return (
    <div className="border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="text-left px-4 py-2 font-medium">Module</th>
            {ACTIONS.map((a) => (
              <th
                key={a}
                className="text-center px-3 py-2 font-medium capitalize"
              >
                {a}
              </th>
            ))}
            <th className="text-center px-3 py-2 font-medium">
              <div className="flex items-center justify-center gap-1.5">
                All
                <Checkbox
                  checked={everythingSelected}
                  onCheckedChange={toggleAll}
                />
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const groupIds = group.permissions.map((p) => p.id);
            const groupAllSelected = groupIds.every((id) =>
              selectedIds.has(id),
            );
            return (
              <tr key={group.id} className="border-t">
                <td className="px-4 py-2 font-medium capitalize">
                  {group.name}
                </td>
                {ACTIONS.map((action) => {
                  const permission = group.permissions.find(
                    (p) => p.name === `${group.name}:${action}`,
                  );
                  return (
                    <td key={action} className="text-center px-3 py-2">
                      {permission ? (
                        <Checkbox
                          checked={selectedIds.has(permission.id)}
                          onCheckedChange={() => toggleOne(permission.id)}
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="text-center px-3 py-2">
                  <Checkbox
                    checked={groupAllSelected}
                    onCheckedChange={() => toggleGroup(group)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
