// src/app/(dashboard)/permissions/new/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import { getErrorMessage } from "@/lib/apiError";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STANDARD_ACTIONS = [
  "create",
  "read",
  "update",
  "delete",
  "watch",
  "upload",
  "write",
];

export default function NewPermissionGroupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [useCustom, setUseCustom] = useState(false);
  const [customAction, setCustomAction] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function toggle(action: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(action) ? next.delete(action) : next.add(action);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const actions = new Set(selected);
    if (useCustom && customAction.trim()) {
      actions.add(customAction.trim().toLowerCase());
    }
    if (actions.size === 0) {
      setError("Select at least one permission action.");
      return;
    }

    setIsSaving(true);
    try {
      await api.post("/permissions/groups", {
        name,
        description,
        actions: Array.from(actions),
      });
      toast({ title: "Permission group created" });
      router.push("/permissions");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-semibold">Permission</h1>
          <p className="text-sm text-muted-foreground">Permission &gt; New</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/permissions")}>
          ← Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Permission Group Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Group Name (Module Name)</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter group name"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter description"
                />
              </div>
            </div>

            <div>
              <Label className="mb-3 block">Permissions</Label>
              <div className="grid grid-cols-4 gap-3">
                {STANDARD_ACTIONS.map((action) => (
                  <label
                    key={action}
                    className="flex items-center gap-2 text-sm capitalize bg-slate-50 px-3 py-2 rounded-lg"
                  >
                    <Checkbox
                      checked={selected.has(action)}
                      onCheckedChange={() => toggle(action)}
                    />
                    {action}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 px-3 py-2 rounded-lg">
              <Checkbox
                checked={useCustom}
                onCheckedChange={(v) => setUseCustom(!!v)}
              />
              <Label className="whitespace-nowrap">Custom permission</Label>
              <Input
                value={customAction}
                onChange={(e) => setCustomAction(e.target.value)}
                placeholder="Enter permission name"
                disabled={!useCustom}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="destructive"
                onClick={() => router.push("/permissions")}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setName("");
                  setDescription("");
                  setSelected(new Set());
                  setCustomAction("");
                  setUseCustom(false);
                }}
              >
                Reset
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
