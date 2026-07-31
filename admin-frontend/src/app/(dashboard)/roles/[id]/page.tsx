// src/app/(dashboard)/role/[id]/page.tsx
"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import { getErrorMessage } from "@/lib/apiError";
import { useToast } from "@/hooks/use-toast";
import { PermissionGroup } from "@/types";
import { PermissionMatrix } from "@/components/permission/PermissionMatrix";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [status, setStatus] = useState("active");
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
        setStatus(role.status ? "active" : "inactive");
        setSelectedIds(new Set(role.permissions.map((p: any) => p.id)));
        setIsLoading(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function save(finalStatus?: boolean) {
    setError("");
    setIsSaving(true);
    try {
      const payload = {
        name,
        description,
        status: finalStatus ?? status === "active",
        permissionIds: Array.from(selectedIds),
      };
      if (isNew) {
        await api.post("/roles", payload);
        toast({ title: "Role created" });
      } else {
        await api.put(`/roles/${id}`, payload);
        toast({ title: "Role updated" });
      }
      router.push("/role");
    } catch (err) {
      setError(getErrorMessage(err)); // surfaces the "last role:update holder" 403 guard
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading || !groups) {
    return (
      <div className="p-8">
        <Skeleton className="h-96 w-full max-w-3xl" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-semibold">Role</h1>
          <p className="text-sm text-muted-foreground">
            Role &gt; {isNew ? "New" : "Edit"}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/role")}>
          ← Back
        </Button>
      </div>

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Role Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Role Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter role name"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6">
        <Label className="mb-2 block">Permissions</Label>
        <PermissionMatrix
          groups={groups}
          selectedIds={selectedIds}
          onChange={setSelectedIds}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="destructive" onClick={() => router.push("/role")}>
          Cancel
        </Button>
        <Button
          variant="outline"
          onClick={() => save(false)}
          disabled={isSaving}
        >
          Save as Draft
        </Button>
        <Button onClick={() => save()} disabled={isSaving}>
          {isSaving ? "Saving..." : isNew ? "Create" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
