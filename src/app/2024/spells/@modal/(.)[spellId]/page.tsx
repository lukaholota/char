"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getSpellById } from "@/lib/spellsData";
import { SpellModalCard } from "@/components/spells/SpellModalCard";

function SpellModalRenderer({ spellId }: { spellId: string }) {
  const router = useRouter();
  const spell = getSpellById(Number(spellId), "RULES_2024");

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  if (!spell) {
    router.back();
    return null;
  }

  return (
    <Dialog enableBackButtonClose={false} open onOpenChange={(open) => !open && handleClose()}>
      <DialogContent 
        className="max-h-[90vh] w-[92vw] max-w-xl overflow-y-auto overflow-x-hidden p-0 border-0 bg-transparent" 
        showClose={false}
      >
        <DialogTitle className="sr-only">{spell.name}</DialogTitle>
        <SpellModalCard spell={spell} onClose={handleClose} is2024={true} />
      </DialogContent>
    </Dialog>
  );
}

export default function SpellModalPage({
  params,
}: {
  params: Promise<{ spellId: string }>;
}) {
  const resolvedParams = use(params);
  return <SpellModalRenderer spellId={resolvedParams.spellId} />;
}
