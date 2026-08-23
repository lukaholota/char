"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getSpellById } from "@/lib/spellsData";
import { SpellModalCard } from "@/components/spells/SpellModalCard";

// Render the modal with spell
function SpellModalRenderer({ spellId }: { spellId: string }) {
  const router = useRouter();
  const spell = getSpellById(Number(spellId));

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  // Handle escape key
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
    // If spell not found, close modal and go back
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
        <SpellModalCard spell={spell} onClose={handleClose} />
      </DialogContent>
    </Dialog>
  );
}

// Page component with async params (Next.js 15)
export default function SpellModalPage({
  params,
}: {
  params: Promise<{ spellId: string }>;
}) {
  const resolvedParams = use(params);
  return <SpellModalRenderer spellId={resolvedParams.spellId} />;
}
