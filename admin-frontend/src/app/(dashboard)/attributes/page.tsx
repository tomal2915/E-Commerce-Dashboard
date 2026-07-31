// src/app/(dashboard)/attributes/page.tsx
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/axios";
import { getErrorMessage } from "@/lib/apiError";
import { useToast } from "@/hooks/use-toast";
import {
  TableSkeleton,
  EmptyState,
  ErrorState,
} from "@/components/shared/DataStates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AttributeType =
  | "dropdown"
  | "radio"
  | "checkbox"
  | "colour_swatch"
  | "image_swatch";

interface AttributeValue {
  id: string;
  value: string;
  referenceValue?: string;
}
interface Attribute {
  id: string;
  name: string;
  type: AttributeType;
  values: AttributeValue[];
}

interface ValueDraft {
  value: string;
  referenceValue: string;
}

export default function AttributesPage() {
  const [attributes, setAttributes] = useState<Attribute[] | null>(null);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [newValueDraft, setNewValueDraft] = useState<
    Record<string, ValueDraft>
  >({});
  const { toast } = useToast();

  async function loadAttributes() {
    setError("");
    setAttributes(null);
    try {
      const res = await api.get("/attributes");
      setAttributes(res.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    loadAttributes();
  }, []);

  function updateDraft(attributeId: string, patch: Partial<ValueDraft>) {
    setNewValueDraft((prev) => ({
      ...prev,
      [attributeId]: {
        value: prev[attributeId]?.value ?? "",
        referenceValue: prev[attributeId]?.referenceValue ?? "#000000",
        ...patch,
      },
    }));
  }

  async function handleAddValue(attributeId: string) {
    const draft = newValueDraft[attributeId];
    const value = draft?.value?.trim();
    if (!value) return;

    const attr = attributes?.find((a) => a.id === attributeId);
    const payload =
      attr?.type === "colour_swatch"
        ? { value, referenceValue: draft.referenceValue }
        : { value };

    try {
      await api.post(`/attributes/${attributeId}/values`, payload);
      setNewValueDraft((prev) => ({
        ...prev,
        [attributeId]: { value: "", referenceValue: "#000000" },
      }));
      loadAttributes();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: getErrorMessage(err),
      });
    }
  }

  async function handleRemoveValue(valueId: string) {
    try {
      await api.delete(`/attributes/values/${valueId}`);
      loadAttributes();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: getErrorMessage(err),
      });
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">Attributes</h1>
        <Button onClick={() => setModalOpen(true)}>+ New Attribute</Button>
      </div>

      {attributes === null && !error && <TableSkeleton />}
      {error && <ErrorState message={error} onRetry={loadAttributes} />}
      {attributes && attributes.length === 0 && (
        <EmptyState title="No attributes yet" />
      )}

      {attributes && attributes.length > 0 && (
        <div className="space-y-4">
          {attributes.map((attr) => {
            const draft = newValueDraft[attr.id] ?? {
              value: "",
              referenceValue: "#000000",
            };
            return (
              <div key={attr.id} className="bg-white border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">{attr.name}</h3>
                  <Badge variant="secondary" className="capitalize">
                    {attr.type}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {attr.values.map((val) => (
                    <span
                      key={val.id}
                      className="flex items-center gap-2 bg-slate-100 text-slate-700 text-sm px-2.5 py-1 rounded-md"
                    >
                      {attr.type === "colour_swatch" && (
                        <span
                          className="w-3.5 h-3.5 rounded-full border"
                          style={{ backgroundColor: val.referenceValue }}
                        />
                      )}
                      {val.value}
                      <button
                        onClick={() => handleRemoveValue(val.id)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2 items-center">
                  {attr.type === "colour_swatch" ? (
                    <>
                      <input
                        type="color"
                        value={draft.referenceValue}
                        onChange={(e) =>
                          updateDraft(attr.id, {
                            referenceValue: e.target.value,
                          })
                        }
                        className="w-9 h-9 rounded-lg border cursor-pointer"
                      />
                      <Input
                        value={draft.value}
                        onChange={(e) =>
                          updateDraft(attr.id, { value: e.target.value })
                        }
                        placeholder="Label (e.g. Red)"
                        className="w-40 h-9"
                      />
                    </>
                  ) : (
                    <Input
                      value={draft.value}
                      onChange={(e) =>
                        updateDraft(attr.id, { value: e.target.value })
                      }
                      placeholder="Add value (e.g. Red, XL)"
                      className="w-48 h-9"
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAddValue(attr.id)}
                  >
                    + Add
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AttributeFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          loadAttributes();
        }}
      />
    </div>
  );
}

function AttributeFormModal({
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
  const [type, setType] = useState<AttributeType>("dropdown");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setType("dropdown");
    setError("");
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      await api.post("/attributes", { name, type });
      toast({ title: "Attribute created" });
      onSaved();
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
          <DialogTitle>New Attribute</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Color"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as AttributeType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dropdown">Dropdown</SelectItem>
                <SelectItem value="radio">Radio</SelectItem>
                <SelectItem value="checkbox">Checkbox</SelectItem>
                <SelectItem value="colour_swatch">Colour Swatch</SelectItem>
                <SelectItem value="image_swatch">Image Swatch</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}