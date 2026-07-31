// src/components/media/MediaPicker.tsx
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/axios";
import { getErrorMessage } from "@/lib/apiError";
import { resolveMediaUrl } from "@/lib/media";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MediaItem {
  id: string;
  fileName: string;
  publicUrl: string;
  thumbnail: string | null;
}

interface MediaPickerProps {
  onSelect: (media: MediaItem) => void;
  onClose: () => void;
}

export function MediaPicker({ onSelect, onClose }: MediaPickerProps) {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  async function loadMedia() {
    setIsLoading(true);
    try {
      const res = await api.get("/media", {
        params: { limit: 100, search: search || undefined },
      });
      // Backend returns { data: [...], meta: {...} }
      setMediaItems(res.data.data.data);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: getErrorMessage(err),
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timeout = setTimeout(loadMedia, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);
    try {
      const res = await api.post("/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMediaItems((prev) => [res.data.data, ...prev]);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: getErrorMessage(err),
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select an Image</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 items-center mb-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search media..."
            className="flex-1"
          />
          <label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              asChild
            >
              <span className="cursor-pointer">
                {isUploading ? "Uploading..." : "+ Upload New"}
              </span>
            </Button>
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={handleUpload}
              disabled={isUploading}
            />
          </label>
        </div>

        <div className="grid grid-cols-5 gap-2 overflow-y-auto flex-1">
          {isLoading && (
            <p className="col-span-5 text-sm text-muted-foreground py-8 text-center">
              Loading...
            </p>
          )}
          {!isLoading && mediaItems.length === 0 && (
            <p className="col-span-5 text-sm text-muted-foreground py-8 text-center">
              No media found
            </p>
          )}
          {!isLoading &&
            mediaItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item)}
                className="aspect-square rounded-lg overflow-hidden border hover:ring-2 hover:ring-slate-900"
              >
                <img
                  src={resolveMediaUrl(item.thumbnail ?? item.publicUrl)}
                  alt={item.fileName}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
