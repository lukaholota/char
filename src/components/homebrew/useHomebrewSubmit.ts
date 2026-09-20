"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { HomebrewFieldErrors } from "@/lib/logic/homebrew-input";

type SaveResult = { success: true; entryId: number } | { success: false; error?: string; fieldErrors?: HomebrewFieldErrors };

export function useHomebrewSubmit() {
  const router = useRouter();
  const [errors, setErrors] = useState<HomebrewFieldErrors>({});
  const [isSaving, startSaving] = useTransition();

  const submit = (save: () => Promise<SaveResult>) =>
    startSaving(async () => {
      const result = await save();
      if (result.success) {
        toast.success("Збережено");
        router.push(`/homebrew/${result.entryId}`);
        return;
      }
      setErrors(result.fieldErrors ?? {});
      toast.error(result.error ?? "Виправте позначені поля");
    });

  return { errors, isSaving, submit };
}
