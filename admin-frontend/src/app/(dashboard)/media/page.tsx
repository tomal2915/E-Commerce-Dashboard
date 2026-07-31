// src/app/(dashboard)/media/page.tsx

"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/axios";
import { getErrorMessage } from "@/lib/apiError";
import { useToast } from "@/hooks/use-toast";
import {
  TableSkeleton,
  EmptyState,
  ErrorState,
} from "@/components/shared/DataStates";
import { TablePagination } from "@/components/shared/TablePagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { resolveMediaUrl } from "@/lib/media";

interface MediaItem {
  id: string;
  fileName: string;
  publicUrl: string;
  thumbnail: string | null;
  altText: string | null;
  title: string | null;
  type: string;
}

export default function MediaLibraryPage() {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "image" | "video">(
    "all",
  );
  const [page, setPage] = useState(1);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function loadMedia() {
    setError("");
    setItems(null);
    try {
      const res = await api.get("/media", {
        params: {
          page,
          limit: 24,
          search: search || undefined,
          type: typeFilter === "all" ? undefined : typeFilter,
        },
      });
      // Backend now returns { data: [...], meta: {...} } — unwrap both.
      setItems(res.data.data.data);
      setMeta(res.data.data.meta);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    loadMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, typeFilter]);

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      loadMedia();
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function uploadFile(file: File) {
    setUploadProgress(0);
    const formData = new FormData();
    formData.append("file", file);
    try {
      await api.post("/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (event) => {
          if (event.total)
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
        },
      });
      toast({ title: "Upload complete" });
      loadMedia();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: getErrorMessage(err),
      });
    } finally {
      setUploadProgress(null);
    }
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/media/${id}`);
      toast({ title: "Media deleted" });
      loadMedia();
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
        <h1 className="text-xl font-semibold">Media Library</h1>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-6 mb-4 text-center transition-colors ${
          isDragging ? "border-slate-900 bg-slate-50" : "border-slate-300"
        }`}
      >
        <p className="text-sm text-slate-500 mb-2">
          Drag and drop a file here, or
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          Browse Files
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          hidden
          onChange={handleFileSelected}
        />
        {uploadProgress !== null && (
          <div className="mt-3 max-w-xs mx-auto">
            <Progress value={uploadProgress} />
            <p className="text-xs text-slate-400 mt-1">{uploadProgress}%</p>
          </div>
        )}
      </div>

      <div className="flex gap-3 mb-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search files..."
          className="max-w-xs"
        />
        <div className="flex gap-1">
          {(["all", "image", "video"] as const).map((t) => (
            <Button
              key={t}
              size="sm"
              variant={typeFilter === t ? "default" : "outline"}
              onClick={() => {
                setTypeFilter(t);
                setPage(1);
              }}
              className="capitalize"
            >
              {t}
            </Button>
          ))}
        </div>
      </div>

      {items === null && !error && <TableSkeleton />}
      {error && <ErrorState message={error} onRetry={loadMedia} />}
      {items && items.length === 0 && <EmptyState title="No media found" />}

      {items && items.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white border rounded-lg overflow-hidden group relative"
              >
                {/* // In MediaLibraryPage's grid render: */}
                <img
                  src={resolveMediaUrl(item.thumbnail ?? item.publicUrl)}
                  alt={item.altText ?? item.fileName}
                  className="w-full aspect-square object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                  <button
                    onClick={() => setEditingItem(item)}
                    className="text-white text-xs underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-white text-xs underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="border rounded-xl bg-white">
            <TablePagination
              page={meta.page}
              totalPages={meta.totalPages}
              onPageChange={setPage}
            />
          </div>
        </>
      )}

      <MediaEditModal
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSaved={() => {
          setEditingItem(null);
          loadMedia();
        }}
      />
    </div>
  );
}

function MediaEditModal({
  item,
  onClose,
  onSaved,
}: {
  item: MediaItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [altText, setAltText] = useState("");
  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    setAltText(item.altText ?? "");
    setTitle(item.title ?? "");
  }, [item]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    setIsSaving(true);
    try {
      await api.put(`/media/${item.id}`, { altText, title });
      toast({ title: "Media updated" });
      onSaved();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: getErrorMessage(err),
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={!!item} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Media</DialogTitle>
        </DialogHeader>
        {item && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* // In MediaEditModal: */}
            <img
              src={resolveMediaUrl(item.thumbnail ?? item.publicUrl)}
              className="w-full rounded-lg"
            />
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Alt Text</Label>
              <Input
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
              />
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
        )}
      </DialogContent>
    </Dialog>
  );
}
