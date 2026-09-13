"use client";

import type { Ability } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { formatModifier } from "@/lib/logic/utils";
import { attributesUkrShort } from "@/lib/refs/translation";
import type { SpellcastingStatRow } from "@/lib/logic/spellcasting-stats";

type SpellcastingSourceCardsProps = {
  rows: readonly SpellcastingStatRow[];
  isReadOnly?: boolean;
  onEdit: (field: "spellAttack" | "spellDC", ability: Ability | null) => void;
};

const cardClassName = "glass-card bg-fuchsia-500/20 border-fuchsia-400/40 transition";
const editableClassName = " cursor-pointer hover:bg-fuchsia-500/30 active:scale-[0.98]";
const valueClassName = "text-2xl font-bold text-fuchsia-50 drop-shadow-[0_0_8px_rgba(217,70,239,0.4)]";

export default function SpellcastingSourceCards({ rows, isReadOnly, onEdit }: SpellcastingSourceCardsProps) {
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <section key={row.key} aria-label={row.label || "Заклинання"} className="space-y-1">
          {rows.length > 1 || row.ability ? <SourceCaption row={row} /> : null}
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              title="Бонус атаки Заклинаннями"
              value={formatModifier(row.attackBonus)}
              isReadOnly={isReadOnly}
              onClick={() => onEdit("spellAttack", row.ability)}
            />
            <StatCard
              title="СК (Складість Ряткидка)"
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

function StatCard({ title, value, isReadOnly, onClick }: { title: string; value: string; isReadOnly?: boolean; onClick: () => void }) {
  return (
    <Card
      className={cardClassName + (!isReadOnly ? editableClassName : "")}
      onClick={(event) => {
        event.stopPropagation();
        if (!isReadOnly) onClick();
      }}
    >
      <CardContent className="p-3 text-center">
        <div className="text-[10px] h-8 font-bold uppercase tracking-wide text-fuchsia-300">{title}</div>
        <div className={valueClassName}>{value}</div>
      </CardContent>
    </Card>
  );
}
