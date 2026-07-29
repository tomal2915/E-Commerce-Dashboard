// src/components/FieldError.tsx
'use client';

// Renders a validation error under a specific field, e.g. errors.name
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600 mt-1">{message}</p>;
}