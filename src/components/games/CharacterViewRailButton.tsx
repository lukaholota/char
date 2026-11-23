"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { CharacterView } from "./use-map-sight";

export function CharacterViewRailButton({ view, className }: { view: CharacterView; className: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = view.hero ? EyeOff : Eye;
  const canToggle = Boolean(view.hero || view.findSelectedHero() || !view.heroesOnMap.length);
  const button = (
    <button type="button" title="Очима героя (Ctrl+L)" aria-pressed={view.hero !== null} onClick={canToggle ? view.toggle : undefined} className={className}>
      <Icon className="h-5 w-5" aria-hidden />
      <span className="sr-only [@container(min-width:40rem)]:not-sr-only">Очима героя</span>
    </button>
  );
  if (canToggle) return button;
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{button}</DialogTrigger>
      <DialogContent aria-describedby={undefined} className="max-w-sm">
        <DialogHeader><DialogTitle>Очима якого героя?</DialogTitle></DialogHeader>
        <div className="grid max-h-[45dvh] gap-2 overflow-y-auto overscroll-contain">
          {view.heroesOnMap.map((member) => (
            <Button key={member.heroId} type="button" variant="outline" onClick={() => { setIsOpen(false); view.start(member); }} className="min-h-11 justify-start whitespace-normal break-words text-left">
              {member.persName ?? member.name}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
