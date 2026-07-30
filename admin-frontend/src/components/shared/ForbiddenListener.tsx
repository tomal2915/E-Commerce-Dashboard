// src/components/shared/ForbiddenListener.tsx
"use client";
import { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";

export function ForbiddenListener() {
  const { toast } = useToast();

  useEffect(() => {
    function handleForbidden(e: Event) {
      const detail = (e as CustomEvent).detail;
      toast({
        variant: "destructive",
        title: "Access Denied",
        description:
          detail?.message ?? "You do not have permission for this action.",
      });
    }
    window.addEventListener("app:forbidden", handleForbidden);
    return () => window.removeEventListener("app:forbidden", handleForbidden);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
