// src/components/MediaPicker.tsx
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/axios";

interface MediaItem {
  id: string;
  publicUrl: string;
  thumbnail: string | null;
  fileName: string;
}

interface MediaPickerProps {
  onSelect: (media: MediaItem) => void;
  onClose: () => void;
}

export function MediaPicker({ onSelect, onClose }: MediaPickerProps) {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    api.get("/media").then((res) => setMediaItems(res.data.data));
  }, []);

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
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-medium text-slate-900">Select an Image</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm"
          >
            Close
          </button>
        </div>

        <label className="mb-3 inline-block text-sm text-slate-700 border border-dashed border-slate-300 rounded-lg px-3 py-2 cursor-pointer hover:border-slate-400 w-fit">
          {isUploading ? "Uploading..." : "+ Upload New Image"}
          <input type="file" accept="image/*" hidden onChange={handleUpload} />
        </label>

        <div className="grid grid-cols-5 gap-2 overflow-y-auto">
          {mediaItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              className="aspect-square rounded-lg overflow-hidden border border-slate-200 hover:ring-2 hover:ring-slate-900"
            >
              <img
                src={item.thumbnail ?? item.publicUrl}
                alt={item.fileName}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
