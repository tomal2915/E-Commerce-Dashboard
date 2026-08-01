// src/app/(dashboard)/permissions/page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/axios";
import { getErrorMessage } from "@/lib/apiError";
import { PermissionGroup } from "@/types";
import {
  TableSkeleton,
  EmptyState,
  ErrorState,
} from "@/components/shared/DataStates";
import { TablePagination } from "@/components/shared/TablePagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const BASE_ACTIONS = [
  "create",
  "read",
  "update",
  "delete",
  "watch",
  "upload",
  "write",
];

function collectAllActions(groups: PermissionGroup[]): string[] {
  const found = new Set(BASE_ACTIONS);
  groups.forEach((g) =>
    g.permissions.forEach((p) => {
      const action = p.name.split(":")[1];
      if (action) found.add(action);
    }),
  );
  return BASE_ACTIONS.filter((a) => found.has(a));
}

export default function PermissionsPage() {
  const [groups, setGroups] = useState<PermissionGroup[] | null>(null);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  async function load() {
    setError("");
    setGroups(null);
    try {
      const res = await api.get("/permissions/groups", {
        params: { page, limit: 10, search: search || undefined },
      });
      // Backend now returns { data: [...], meta: {...} }
      setGroups(res.data.data.data);
      setMeta(res.data.data.meta);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // Reload whenever the page changes — always via the API
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Debounce search: reset to page 1 and refetch from the API
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      load();
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const columns = groups ? collectAllActions(groups) : [];

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-xl font-semibold">Access Control</h1>
          <p className="text-sm text-muted-foreground">
            Access Control &gt; Permission
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-56"
          />
          <Button asChild>
            <Link href="/permissions/new">+ New</Link>
          </Button>
        </div>
      </div>

      {groups === null && !error && <TableSkeleton />}
      {error && <ErrorState message={error} onRetry={load} />}
      {groups && groups.length === 0 && (
        <EmptyState title="No permission groups found" />
      )}

      {groups && groups.length > 0 && (
        <div className="border rounded-xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox />
                  </TableHead>
                  <TableHead>Module Name</TableHead>
                  {columns.map((action) => (
                    <TableHead key={action} className="text-center capitalize">
                      {action}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>
                      <Checkbox />
                    </TableCell>
                    <TableCell className="font-medium capitalize">
                      {group.name}
                    </TableCell>
                    {columns.map((action) => {
                      const has = group.permissions.some(
                        (p) => p.name === `${group.name}:${action}`,
                      );
                      return (
                        <TableCell key={action} className="text-center">
                          <Checkbox checked={has} disabled />
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" title="View">
                        👁
                      </Button>
                      <Button variant="ghost" size="icon" title="Edit" asChild>
                        <Link href={`/permissions/${group.id}`}>✎</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete"
                        className="text-destructive"
                      >
                        🗑
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            page={meta.page}
            totalPages={meta.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
