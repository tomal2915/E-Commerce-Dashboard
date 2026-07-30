// src/app/(dashboard)/roles/[id]/page.tsx
"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import { getErrorMessage } from "@/lib/apiError";
import { useToast } from "@/components/ui/use-toast";
import { PermissionGroup } from "@/types";
import { PermissionMatrix } from "@/components/permission/PermissionMatrix";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

// Supports both /roles/new (id === 'new') and /roles/[id] (edit) in one page.
export default function RoleEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const isNew = id === "new";
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [groups, setGroups] = useState<PermissionGroup[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/permissions/groups").then((res) => setGroups(res.data.data));

    if (!isNew) {
      api.get(`/roles/${id}`).then((res) => {
        const role = res.data.data;
        setName(role.name);
        setDescription(role.description ?? "");
        setSelectedIds(new Set(role.permissions.map((p: any) => p.id)));
        setIsLoading(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      const payload = {
        name,
        description,
        permissionIds: Array.from(selectedIds),
      };
      if (isNew) {
        await api.post("/roles", payload);
        toast({ title: "Role created" });
      } else {
        await api.put(`/roles/${id}`, payload);
        toast({ title: "Role updated" });
      }
      router.push("/roles");
    } catch (err) {
      setError(getErrorMessage(err)); // surfaces the "last role:update holder" guard, etc.
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading || !groups) {
    return (
      <div className="p-8">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-xl font-semibold mb-6">
        {isNew ? "New Role" : "Edit Role"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Role Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Permissions</Label>
          <PermissionMatrix
            groups={groups}
            selectedIds={selectedIds}
            onChange={setSelectedIds}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/roles")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Role"}
          </Button>
        </div>
      </form>
    </div>
  );
}
