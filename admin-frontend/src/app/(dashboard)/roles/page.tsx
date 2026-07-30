// src/app/(dashboard)/roles/page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/axios";
import { getErrorMessage } from "@/lib/apiError";
import { Role } from "@/types";
import {
  TableSkeleton,
  EmptyState,
  ErrorState,
} from "@/components/shared/DataStates";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    setRoles(null);
    try {
      const res = await api.get("/roles");
      setRoles(res.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">Roles</h1>
        <Button asChild>
          <Link href="/roles/new">+ New Role</Link>
        </Button>
      </div>

      {roles === null && !error && <TableSkeleton />}
      {error && <ErrorState message={error} onRetry={load} />}
      {roles && roles.length === 0 && <EmptyState title="No roles yet" />}

      {roles && roles.length > 0 && (
        <div className="border rounded-xl bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Users</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell>
                    <Badge variant={role.status ? "default" : "secondary"}>
                      {role.status ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{role.permissions.length} granted</TableCell>
                  <TableCell>{role.userCount ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/roles/${role.id}`}>Edit</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
