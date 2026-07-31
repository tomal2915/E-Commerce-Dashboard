// src/components/permission/PermissionGroupModal.tsx
"use client";
import { useState } from "react";
import { api } from "@/lib/axios";
import { getErrorMessage } from "@/lib/apiError";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const STANDARD_ACTIONS = ["create", "read", "update", "delete", "watch"];

export function PermissionGroupModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
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

  function addCustomAction() {
    const trimmed = customAction.trim().toLowerCase();
    if (!trimmed) return;
    setSelected((prev) => new Set(prev).add(trimmed));
    setCustomAction("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      await api.post("/permissions/groups", {
        name,
        description,
        actions: Array.from(selected),
      });
      toast({ title: "Permission group created" });
      setName("");
      setDescription("");
      setSelected(new Set());
      onSaved();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Permission Group</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-1.5">
            <Label>Module Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. shipment"
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
          <div className="space-y-2">
            <Label>Standard Actions</Label>
            <div className="flex flex-wrap gap-4">
              {STANDARD_ACTIONS.map((action) => (
                <label
                  key={action}
                  className="flex items-center gap-2 text-sm capitalize"
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
          <div className="space-y-1.5">
            <Label>Custom Action</Label>
            <div className="flex gap-2">
              <Input
                value={customAction}
                onChange={(e) => setCustomAction(e.target.value)}
                placeholder="e.g. export"
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addCustomAction())
                }
              />
              <Button type="button" variant="outline" onClick={addCustomAction}>
                Add
              </Button>
            </div>
            {selected.size > 0 && (
              <p className="text-xs text-muted-foreground">
                Selected: {Array.from(selected).join(", ")}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || selected.size === 0}>
              {isSaving ? "Creating..." : "Create Group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
