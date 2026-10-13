"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeLink } from "@/components/no-ai/ModeLink";
import { forgetUnfinishedPreset, readUnfinishedPreset, type UnfinishedPreset } from "@/lib/optimization/unfinished-preset";

export function UnfinishedPresetNotice() {
  const [preset, setPreset] = useState<UnfinishedPreset | null>(null);
  useEffect(() => setPreset(readUnfinishedPreset()), []);
  if (!preset) return null;

  function hide() {
    forgetUnfinishedPreset();
    setPreset(null);
  }

  return (
    <section aria-label="Незавершений готовий персонаж" className="glass-panel border-gradient-rpg flex items-center gap-2 rounded-2xl p-3 sm:gap-3 sm:px-4">
      <p className="min-w-0 flex-1 text-sm text-slate-300">
        Ви не завершили готового персонажа: <span className="text-white">{preset.title}</span>
      </p>
      <Button asChild className="min-h-11 shrink-0">
        <ModeLink href={preset.href}>Продовжити</ModeLink>
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={hide} aria-label="Приховати" className="size-11 shrink-0 text-slate-400">
        <X aria-hidden className="size-4" />
      </Button>
    </section>
  );
}
