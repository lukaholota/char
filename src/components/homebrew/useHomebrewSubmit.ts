"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { HomebrewFieldErrors } from "@/lib/logic/homebrew-input";
import { capturePostHogEvent } from "@/lib/monitoring/posthog-client";

type SaveResult = { success: true; entryId: number } | { success: false; error?: string; fieldErrors?: HomebrewFieldErrors };

export function useHomebrewSubmit(context: { kind: "SPELL" | "CREATURE"; ruleset: string; entryId?: number }) {
  const router = useRouter();
  const [errors, setErrors] = useState<HomebrewFieldErrors>({});
  const [isSaving, startSaving] = useTransition();
  const stage = useRef("opened");
  const abandoned = useRef(false);
  const properties = useRef({});
  properties.current = { kind: context.kind, edition: context.ruleset === "RULES_2024" ? "2024" : "2014", mode: context.entryId ? "edit" : "create" };

  useEffect(() => {
    capturePostHogEvent("homebrew_form_opened", properties.current);
    const recordExit = () => {
      if (stage.current === "saved" || abandoned.current) return;
      abandoned.current = true;
      capturePostHogEvent("homebrew_form_abandoned", { ...properties.current, stage: stage.current });
    };
    window.addEventListener("pagehide", recordExit);
    return () => {
      window.removeEventListener("pagehide", recordExit);
      recordExit();
    };
  }, []);

  const markEdited = () => {
    if (stage.current !== "opened") return;
    stage.current = "editing";
    capturePostHogEvent("homebrew_form_started", properties.current);
  };

  const submit = (save: () => Promise<SaveResult>) =>
    startSaving(async () => {
      stage.current = "submitted";
      capturePostHogEvent("homebrew_submit_attempted", properties.current);
      const result = await save();
      if (result.success) {
        stage.current = "saved";
        capturePostHogEvent("homebrew_saved", properties.current);
        toast.success("Збережено");
        router.push(`/homebrew/${result.entryId}`);
        return;
      }
      stage.current = "rejected";
      capturePostHogEvent("homebrew_submit_rejected", { ...properties.current, invalid_fields: Object.keys(result.fieldErrors ?? {}) });
      setErrors(result.fieldErrors ?? {});
      toast.error(result.error ?? "Виправте позначені поля");
    });

  return { errors, isSaving, submit, markEdited };
}
