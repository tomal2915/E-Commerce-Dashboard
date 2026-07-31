// src/app/(dashboard)/categories/page.tsx
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
import { Switch } from "@/components/ui/switch";
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

interface CategoryNode {
  id: string;
  name: string;
  activeFlag: boolean;
  sortOrder: number;
  imageId: string | null;
  children: CategoryNode[];
}
interface CategoryOption {
  id: string;
  name: string;
}

export default function CategoriesPage() {
  const [tree, setTree] = useState<CategoryNode[] | null>(null);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryNode | null>(
    null,
  );
  const { toast } = useToast();
  const [parentId, setParentId] = useState<string | null>("");

  async function loadTree() {
    setError("");
    setTree(null);
    try {
      const res = await api.get("/categories/tree");
      setTree(res.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    loadTree();
  }, []);

  function openCreate() {
    setEditingCategory(null);
    setModalOpen(true);
  }
  function openEdit(node: CategoryNode) {
    setEditingCategory(node);
    setModalOpen(true);
  }

  function renderNode(node: CategoryNode, depth = 0) {
    return (
      <div key={node.id}>
        <div
          className="flex items-center justify-between py-2 px-2 border-b hover:bg-slate-50 rounded"
          style={{ paddingLeft: depth * 20 + 8 }}
        >
          <div className="flex items-center gap-2 text-sm">
            <span
              className={node.activeFlag ? "text-slate-800" : "text-slate-400"}
            >
              {node.name}
            </span>
            {!node.activeFlag && (
              <Badge variant="secondary" className="text-xs">
                Inactive
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => openEdit(node)}>
            Edit
          </Button>
        </div>
        {node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">Categories</h1>
        <Button onClick={openCreate}>+ New Category</Button>
      </div>

      {tree === null && !error && <TableSkeleton />}
      {error && <ErrorState message={error} onRetry={loadTree} />}
      {tree && tree.length === 0 && <EmptyState title="No categories yet" />}

      {tree && tree.length > 0 && (
        <div className="border rounded-xl bg-white p-2">
          {tree.map((node) => renderNode(node))}
        </div>
      )}

      <CategoryFormModal
        open={modalOpen}
        category={editingCategory}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          loadTree();
        }}
      />
    </div>
  );
}

function CategoryFormModal({
  open,
  category,
  onClose,
  onSaved,
}: {
  open: boolean;
  category: CategoryNode | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = !!category;
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [activeFlag, setActiveFlag] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);
  const [allCategories, setAllCategories] = useState<CategoryOption[]>([]);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    api.get("/categories").then((res) => setAllCategories(res.data.data));
    setName(category?.name ?? "");
    setActiveFlag(category?.activeFlag ?? true);
    setSortOrder(category?.sortOrder ?? 0);
    setDescription("");
    setParentId("");
    setError("");
  }, [open, category]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      const payload = {
        name,
        description: description || undefined,
        parentId: parentId || undefined,
        activeFlag,
        sortOrder,
      };
      if (isEditing) {
        await api.put(`/categories/${category!.id}`, payload);
      } else {
        await api.post("/categories", payload);
      }
      toast({ title: isEditing ? "Category updated" : "Category created" });
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
          <DialogTitle>
            {isEditing ? "Edit Category" : "New Category"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-1.5">
            <Label>Name</Label>
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
          <div className="space-y-1.5">
            <Label>Parent Category</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger>
                <SelectValue placeholder="None (top-level)" />
              </SelectTrigger>
              <SelectContent>
                {allCategories
                  .filter((c) => c.id !== category?.id)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4 items-end">
            <div className="space-y-1.5">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
              />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch checked={activeFlag} onCheckedChange={setActiveFlag} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
