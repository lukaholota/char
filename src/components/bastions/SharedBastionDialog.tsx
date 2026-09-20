"use client";

import { Shield } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { bastionOrderTranslations, bastionSpaceTranslations } from "@/lib/refs/translation";
import type { SharedBastionView } from "@/server/db/bastions";

export function SharedBastionDialog({
  bastion,
  open,
  onOpenChange,
}: {
  bastion: SharedBastionView;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{bastion.name}</DialogTitle>
          <DialogDescription>
            {bastion.isMaintaining ? "Цього ходу бастіон на Утриманні." : "Бастіон персонажа — лише перегляд."}
          </DialogDescription>
        </DialogHeader>

        {bastion.description ? <p className="whitespace-pre-line text-sm text-slate-300">{bastion.description}</p> : null}

        {bastion.facilities.length === 0 ? (
          <p className="text-sm text-slate-400">Приміщень ще немає.</p>
        ) : (
          <ul className="space-y-2">
            {bastion.facilities.map((facility) => (
              <SharedFacilityRow key={facility.facilityId} facility={facility} />
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SharedFacilityRow({ facility }: { facility: SharedBastionView["facilities"][number] }) {
  return (
    <li className="space-y-1 rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-semibold text-slate-100">{facility.name}</span>
        <span className="text-xs text-slate-400">
          {facility.isSpecial ? "Спеціальне" : "Базове"} · {bastionSpaceTranslations[facility.space]}
        </span>
      </div>
      <p className="text-xs text-slate-300">
        Наказ: {facility.currentOrder ? bastionOrderTranslations[facility.currentOrder] : "немає"}
      </p>
      {facility.defenders > 0 ? (
        <p className="flex items-center gap-1 text-xs text-slate-300">
          <Shield className="h-3 w-3" />
          Захисників: {facility.defenders}
        </p>
      ) : null}
      {facility.hirelings ? <p className="text-xs text-slate-400">Найманці: {facility.hirelings}</p> : null}
    </li>
  );
}
