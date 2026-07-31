// src/lib/media.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

// Media paths from the backend are relative (e.g. "/uploads/media/thumb-x.png").
// Prefix them with the API origin so the browser fetches from the backend,
// not the frontend's own origin.
export function resolveMediaUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_URL}${path}`;
}
