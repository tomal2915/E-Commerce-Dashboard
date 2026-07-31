// src/app/(dashboard)/brands/page.tsx
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface Brand {
  id: string;
  name: string;
  status: boolean;
  description: string | null;
}

/**
 * Normalizes whatever the API returns into a plain array. Tolerates:
 * - a bare array
 * - { data: [...] } (our documented pagination envelope)
 * - anything else -> [] rather than throwing, so the page never crashes
 *   on an unexpected response shape.
 */
function extractBrandList(payload: unknown): Brand[] {
  if (Array.isArray(payload)) return payload;
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as any).data)
  ) {
    return (payload as any).data;
  }
  return [];
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[] | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  async function loadBrands() {
    setError("");
    setBrands(null);
    try {
      const res = await api.get("/brands");
      setBrands(extractBrandList(res.data));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    loadBrands();
  }, []);

  // brands is either null (still loading) or an array (guaranteed by
  // extractBrandList) — but we guard again here so a future change to
  // loadBrands can't silently reintroduce the crash.
  const filtered = Array.isArray(brands)
    ? brands.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))
    : [];

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">Brands</h1>
        <Button
          onClick={() => {
            setEditingBrand(null);
            setModalOpen(true);
          }}
        >
          + New Brand
        </Button>
      </div>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search brands..."
        className="max-w-xs mb-4"
      />

      {brands === null && !error && <TableSkeleton />}
      {error && <ErrorState message={error} onRetry={loadBrands} />}
      {brands !== null && !error && filtered.length === 0 && (
        <EmptyState title="No brands found" />
      )}

      {brands !== null && !error && filtered.length > 0 && (
        <div className="border rounded-xl bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell className="font-medium">{brand.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {brand.description ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={brand.status ? "default" : "secondary"}>
                      {brand.status ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingBrand(brand);
                        setModalOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <BrandFormModal
        open={modalOpen}
        brand={editingBrand}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          loadBrands();
        }}
      />
    </div>
  );
}

function BrandFormModal({
  open,
  brand,
  onClose,
  onSaved,
}: {
  open: boolean;
  brand: Brand | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = !!brand;
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState(true);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(brand?.name ?? "");
    setDescription(brand?.description ?? "");
    setStatus(brand?.status ?? true);
    setError("");
  }, [open, brand]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      const payload = { name, description: description || undefined, status };
      if (isEditing) {
        await api.put(`/brands/${brand!.id}`, payload);
      } else {
        await api.post("/brands", payload);
      }
      toast({ title: isEditing ? "Brand updated" : "Brand created" });
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
          <DialogTitle>{isEditing ? "Edit Brand" : "New Brand"}</DialogTitle>
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
          <div className="flex items-center gap-2">
            <Switch checked={status} onCheckedChange={setStatus} />
            <Label>Active</Label>
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
