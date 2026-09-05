"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SpellModalCard } from "@/components/spells/SpellModalCard";
import type { SpellData } from "@/lib/spellsData";

/// Заклинання приходить пропом уже знайденим на сервері: коли модалка шукала його сама,
/// у браузер їхав увесь `spells.json` — 1,7 МіБ (docs/STATE.md дефект №9).
export function SpellModalShell({ spell, is2024 = false }: { spell: SpellData | null; is2024?: boolean }) {
  const router = useRouter();
  const close = useCallback(() => router.back(), [router]);

  useEffect(() => {
    if (!spell) router.back();
  }, [spell, router]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [close]);

  if (!spell) return null;

  return (
    <Dialog enableBackButtonClose={false} open onOpenChange={(open) => !open && close()}>
      <DialogContent
        className="max-h-[90vh] w-[92vw] max-w-xl overflow-y-auto overflow-x-hidden p-0 border-0 bg-transparent"
        showClose={false}
      >
        <DialogTitle className="sr-only">{spell.name}</DialogTitle>
        <SpellModalCard spell={spell} onClose={close} is2024={is2024} />
      </DialogContent>
    </Dialog>
  );
}
