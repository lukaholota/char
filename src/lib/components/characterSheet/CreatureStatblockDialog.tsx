"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreatureStatblockCard } from "@/components/bestiary/CreatureStatblockCard";
import type { CreatureData } from "@/lib/bestiaryData";

export function CreatureStatblockDialog({
  creature,
  is2024,
  open,
  onOpenChange,
}: {
  creature: CreatureData;
  is2024: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{creature.name}</DialogTitle>
        </DialogHeader>
        <CreatureStatblockCard creature={creature} is2024={is2024} />
      </DialogContent>
    </Dialog>
  );
}
