// src/app/(dashboard)/permissions/page.tsx
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/axios";
import { getErrorMessage } from "@/lib/apiError";
import { PermissionGroup } from "@/types";
import { PermissionGroupModal } from "@/components/permission/PermissionGroupModal";
import {
  TableSkeleton,
  EmptyState,
  ErrorState,
} from "@/components/shared/DataStates";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Every distinct action found across all groups — used as matrix columns
function collectAllActions(groups: PermissionGroup[]): string[] {
  const actions = new Set<string>();
  groups.forEach((g) =>
    g.permissions.forEach((p) => {
      const action = p.name.split(":")[1];
      if (action) actions.add(action);
    }),
  );
  return Array.from(actions).sort();
}

export default function PermissionsPage() {
  const [groups, setGroups] = useState<PermissionGroup[] | null>(null);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    setError("");
    setGroups(null);
    try {
      const res = await api.get("/permissions/groups");
      setGroups(res.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    load();
  }, []);

  const columns = groups ? collectAllActions(groups) : [];

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">Permissions</h1>
        <Button onClick={() => setModalOpen(true)}>+ New Group</Button>
      </div>

      {groups === null && !error && <TableSkeleton />}
      {error && <ErrorState message={error} onRetry={load} />}
      {groups && groups.length === 0 && (
        <EmptyState title="No permission groups yet" />
      )}

      {groups && groups.length > 0 && (
        <div className="border rounded-xl overflow-x-auto bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                {columns.map((action) => (
                  <TableHead key={action} className="text-center capitalize">
                    {action}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium capitalize">
                    {group.name}
                  </TableCell>
                  {columns.map((action) => {
                    const has = group.permissions.some(
                      (p) => p.name === `${group.name}:${action}`,
                    );
                    return (
                      <TableCell key={action} className="text-center">
                        {has ? (
                          <Badge variant="secondary" className="text-xs">
                            ✓
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PermissionGroupModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
      />
    </div>
  );
}
