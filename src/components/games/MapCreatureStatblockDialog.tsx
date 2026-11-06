"use client";

import { Trash2 } from "lucide-react";
import { CreatureStatblockCard } from "@/components/bestiary/CreatureStatblockCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useCreatureStatblock } from "@/hooks/useCreatureStatblock";
import { cn } from "@/lib/utils";
import { CREATURE_TOKEN_SIZES, CREATURE_TOKEN_SIZE_LABELS, type CreatureTokenSize, type MapCreatureView } from "@/rules/game-map-creatures";

type SizeControl = { value: CreatureTokenSize; onChange: (size: CreatureTokenSize) => void };
type Props = { creature: MapCreatureView | null; onClose: () => void; onRemove: (() => void) | null; size: SizeControl | null };

export function MapCreatureStatblockDialog({ creature, onClose, onRemove, size }: Props) {
  const { creature: statblock, loreGroup } = useCreatureStatblock(creature?.creatureKey ?? null, creature?.ruleset ?? "RULES_2014", null);
  return (
    <Dialog open={creature !== null} onOpenChange={(isOpen) => (isOpen ? undefined : onClose())}>
      <DialogContent aria-describedby={undefined} className="max-w-2xl overflow-y-auto">
        <div className="flex flex-wrap items-center gap-2 pr-10">
          <DialogTitle className="normal-case leading-8 tracking-normal">{creature?.label}</DialogTitle>
          {creature ? (
            <span className={cn("rounded-full border px-2 py-0.5 text-xs", creature.isAlly ? "border-emerald-400/50 text-emerald-200" : "border-rose-400/50 text-rose-200")}>
              {creature.isAlly ? "Союзник" : "Ворог"}
            </span>
          ) : null}
        </div>
        {creature?.statblockName ? <p className="text-sm text-slate-400">Гравці бачать це імʼя. Статблок: {creature.statblockName}</p> : null}
        {size ? <TokenSizePicker size={size} /> : null}
        <StatblockBody creature={creature} statblock={statblock} loreDescription={loreGroup?.description ?? null} />
        {onRemove ? (
          <Button type="button" variant="outline" onClick={onRemove} className="h-11 gap-2 justify-self-start">
            <Trash2 className="h-4 w-4" aria-hidden />
            Прибрати з мапи
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

type Statblock = ReturnType<typeof useCreatureStatblock>["creature"];

function StatblockBody({ creature, statblock, loreDescription }: { creature: MapCreatureView | null; statblock: Statblock; loreDescription: string | null }) {
  if (creature && !creature.creatureKey) return <p className="py-10 text-center text-sm text-slate-400">Майстер приховав статблок цієї істоти.</p>;
  if (!statblock || !creature) return <p className="py-10 text-center text-sm text-slate-400">Завантаження статблоку…</p>;
  return <CreatureStatblockCard creature={statblock} is2024={creature.ruleset === "RULES_2024"} loreGroupDescription={loreDescription} />;
}

function TokenSizePicker({ size }: { size: SizeControl }) {
  return (
    <div role="group" aria-label="Розмір на мапі" className="grid gap-2">
      <span className="text-sm text-slate-400">Розмір на мапі</span>
      <div className="grid grid-cols-3 gap-1.5">
        {CREATURE_TOKEN_SIZES.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={size.value === option}
            onClick={() => size.onChange(option)}
            className={cn("h-11 rounded-xl border text-sm", size.value === option ? "border-white/30 bg-white/10 text-slate-100" : "border-white/10 text-slate-400 hover:text-slate-200")}
          >
            {CREATURE_TOKEN_SIZE_LABELS[option]}
          </button>
        ))}
      </div>
    </div>
  );
}
