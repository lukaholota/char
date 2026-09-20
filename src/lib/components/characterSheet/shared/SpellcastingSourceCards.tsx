"use client";

import type { Ability } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { formatModifier } from "@/lib/logic/utils";
import { attributesUkrShort } from "@/lib/refs/translation";
import type { SpellcastingStatRow } from "@/lib/logic/spellcasting-stats";
import { useDiceUIStore } from "@/lib/stores/diceUIStore";
import { D20Icon } from "@/lib/components/icons/D20Icon";
import { type RollStateView, buildSpellAttackRollContext, describeExtraDiceAloud } from "@/lib/components/dice/roll-contexts";
import { ExtraDiceMark } from "@/lib/components/dice/ExtraDiceMark";
import type { ExtraDie } from "@/lib/stores/diceUIStore";

type SpellcastingSourceCardsProps = {
  rows: readonly SpellcastingStatRow[];
  isReadOnly?: boolean;
  onEdit: (field: "spellAttack" | "spellDC", ability: Ability | null) => void;
  attackState?: RollStateView;
};

const cardClassName = "glass-card bg-fuchsia-500/20 border-fuchsia-400/40 transition";
const editableClassName = " cursor-pointer hover:bg-fuchsia-500/30 active:scale-[0.98]";
const valueClassName = "text-2xl font-bold text-fuchsia-50 drop-shadow-[0_0_8px_rgba(217,70,239,0.4)]";

export default function SpellcastingSourceCards({ rows, isReadOnly, onEdit, attackState }: SpellcastingSourceCardsProps) {
  const openRoll = useDiceUIStore((state) => state.openRoll);
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <section key={row.key} aria-label={row.label || "Заклинання"} className="space-y-1">
          {rows.length > 1 || row.ability ? <SourceCaption row={row} /> : null}
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              title="Бонус атаки Заклинаннями"
              value={formatModifier(row.attackBonus)}
              rolls
              extraDice={attackState?.extraDice}
              ariaLabel={`Кинути атаку заклинанням ${formatModifier(row.attackBonus)}${describeExtraDiceAloud(attackState?.extraDice ?? [])}`}
              onClick={() =>
                openRoll(buildSpellAttackRollContext(row.attackBonus, row.label, isReadOnly ? undefined : () => onEdit("spellAttack", row.ability), attackState))
              }
            />
            <StatCard
              title="СК (Складність ряткидка)"
              value={String(row.saveDC)}
              isReadOnly={isReadOnly}
              onClick={() => onEdit("spellDC", row.ability)}
            />
          </div>
        </section>
      ))}
    </div>
  );
}

function SourceCaption({ row }: { row: SpellcastingStatRow }) {
  const abilityLabel = row.ability ? attributesUkrShort[row.ability] : "без характеристики";
  return (
    <div className="px-1 text-[11px] uppercase tracking-wide text-fuchsia-200/80">
      {row.label} · {abilityLabel}
    </div>
  );
}

type StatCardProps = {
  title: string;
  value: string;
  isReadOnly?: boolean;
  rolls?: boolean;
  extraDice?: readonly ExtraDie[];
  ariaLabel?: string;
  onClick: () => void;
};

function StatCard({ title, value, isReadOnly, rolls, extraDice, ariaLabel, onClick }: StatCardProps) {
  const isClickable = rolls || !isReadOnly;
  return (
    <Card
      role={isClickable ? "button" : undefined}
      aria-label={isClickable ? ariaLabel : undefined}
      className={cardClassName + (isClickable ? editableClassName : "") + (rolls ? " swiper-no-swiping" : "")}
      onClick={(event) => {
        event.stopPropagation();
        if (isClickable) onClick();
      }}
    >
      <CardContent className="p-3 text-center">
        <div className="text-[10px] h-8 font-bold uppercase tracking-wide text-fuchsia-300">{title}</div>
        <div className={`flex items-center justify-center gap-1.5 ${valueClassName}`}>
          {rolls ? <D20Icon className="h-4 w-4 text-fuchsia-300" /> : null}
          {value}
          <ExtraDiceMark dice={extraDice} className="text-sm" />
        </div>
      </CardContent>
    </Card>
  );
}
