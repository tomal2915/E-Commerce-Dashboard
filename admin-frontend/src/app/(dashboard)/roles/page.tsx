// src/app/(dashboard)/role/page.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/axios";
import { getErrorMessage } from "@/lib/apiError";
import { useToast } from "@/hooks/use-toast";
import { Role } from "@/types";
import {
  TableSkeleton,
  EmptyState,
  ErrorState,
} from "@/components/shared/DataStates";
import { TablePagination } from "@/components/shared/TablePagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PAGE_SIZE = 10;

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const { toast } = useToast();

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

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/roles/${deleteTarget.id}`);
      toast({ title: "Role deleted" });
      setDeleteTarget(null);
      load();
    } catch (err) {
      // Surfaces the "users still assigned" 409 conflict from your backend
      toast({
        variant: "destructive",
        title: "Cannot delete role",
        description: getErrorMessage(err),
      });
      setDeleteTarget(null);
    }
  }

  const filtered = useMemo(
    () =>
      (roles ?? []).filter((r) =>
        r.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [roles, search],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-xl font-semibold">Role</h1>
          <p className="text-sm text-muted-foreground">Role</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search..."
            className="w-56"
          />
          <Button asChild>
            <Link href="/role/new">+ New</Link>
          </Button>
        </div>
      </div>

      {roles === null && !error && <TableSkeleton />}
      {error && <ErrorState message={error} onRetry={load} />}
      {roles && filtered.length === 0 && <EmptyState title="No roles found" />}

      {roles && filtered.length > 0 && (
        <div className="border rounded-xl overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox />
                </TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((role, i) => (
                <TableRow key={role.id}>
                  <TableCell>
                    <Checkbox />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {(page - 1) * PAGE_SIZE + i + 1}
                  </TableCell>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell>
                    <Badge variant={role.status ? "default" : "secondary"}>
                      {role.status ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" title="View" asChild>
                      <Link href={`/role/${role.id}`}>👁</Link>
                    </Button>
                    <Button variant="ghost" size="icon" title="Edit" asChild>
                      <Link href={`/role/${role.id}`}>✎</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Delete"
                      className="text-destructive"
                      onClick={() => setDeleteTarget(role)}
                    >
                      🗑
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete role "{deleteTarget?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Roles with users still assigned cannot be
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
