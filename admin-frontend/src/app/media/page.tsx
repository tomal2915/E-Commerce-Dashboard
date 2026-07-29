// src/app/media/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/axios";
import { useToast } from "@/components/ToastProvider";
import { getErrorMessage } from "@/lib/apiError";
import { LoadingState, EmptyState, ErrorState } from "@/components/DataState";
import { Sidebar } from "@/components/Sidebar";

interface MediaItem {
  id: string;
  fileName: string;
  publicUrl: string;
  thumbnail: string | null;
  altText: string | null;
  title: string | null;
}

export default function MediaLibraryPage() {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  async function loadMedia() {
    setError("");
    setItems(null);
    try {
      const res = await api.get("/media");
      setItems(res.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    loadMedia();
  }, []);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    try {
      await api.post("/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (event) => {
          if (event.total) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        },
      });
      showToast("Upload complete", "success");
      loadMedia();
    } catch (err) {
      setUploadError(getErrorMessage(err));
    } finally {
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/media/${id}`);
      showToast("Media deleted", "success");
      loadMedia();
    } catch (err) {
      showToast(getErrorMessage(err));
    }
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 p-8 bg-slate-50 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold text-slate-900">
            Media Library
          </h1>
          <label className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 cursor-pointer">
            {uploadProgress !== null
              ? `Uploading ${uploadProgress}%...`
              : "+ Upload"}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleFileSelected}
              disabled={uploadProgress !== null}
            />
          </label>
        </div>

        {uploadError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg mb-4">
            {uploadError}
          </div>
        )}

        {items === null && !error && <LoadingState label="Loading media..." />}
        {error && <ErrorState message={error} onRetry={loadMedia} />}
        {items && items.length === 0 && (
          <EmptyState label="No media uploaded yet" />
        )}

        {items && items.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-lg overflow-hidden group relative"
              >
                <img
                  src={item.thumbnail ?? item.publicUrl}
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
        )}

        {editingItem && (
          <MediaEditModal
            item={editingItem}
            onClose={() => setEditingItem(null)}
            onSaved={() => {
              setEditingItem(null);
              loadMedia();
            }}
          />
        )}
      </main>
    </div>
  );
}

function MediaEditModal({
  item,
  onClose,
  onSaved,
}: {
  item: MediaItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [altText, setAltText] = useState(item.altText ?? "");
  const [title, setTitle] = useState(item.title ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.put(`/media/${item.id}`, { altText, title });
      showToast("Media updated", "success");
      onSaved();
    } catch (err) {
      showToast(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl w-full max-w-sm p-6 space-y-4"
      >
        <h2 className="font-semibold text-slate-900">Edit Media</h2>
        <img
          src={item.thumbnail ?? item.publicUrl}
          className="w-full rounded-lg"
        />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Alt Text
          </label>
          <input
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
