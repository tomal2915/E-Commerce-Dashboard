// src/components/shared/TablePagination.tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TablePagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const [goToValue, setGoToValue] = useState("");

  function handleGoTo() {
    const target = Number(goToValue);
    if (target >= 1 && target <= totalPages) onPageChange(target);
    setGoToValue("");
  }

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).slice(
    0,
    7,
  );

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t bg-white text-sm">
      <Button
        variant="ghost"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        ← Previous
      </Button>
      <div className="flex items-center gap-1">
        {pageNumbers.map((n) => (
          <Button
            key={n}
            size="sm"
            variant={n === page ? "default" : "ghost"}
            className="w-8 h-8 p-0"
            onClick={() => onPageChange(n)}
          >
            {n}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next →
        </Button>
        <span className="text-muted-foreground ml-2">Go To</span>
        <Input
          value={goToValue}
          onChange={(e) => setGoToValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleGoTo()}
          className="w-14 h-8 text-center"
          placeholder={String(page)}
        />
        <Button size="sm" variant="outline" onClick={handleGoTo}>
          Go
        </Button>
      </div>
    </div>
  );
}
