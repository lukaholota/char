import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

const MOVEMENT_ROWS = [["FLY", "Політ"], ["SWIM", "Плавання"], ["CLIMB", "Лазіння"]] as const;

type SensesAndResistancesProps = {
  darkvisionRange: number | null;
  damageResistances: string[];
  damageImmunities: string[];
  movementSpeeds: Partial<Record<(typeof MOVEMENT_ROWS)[number][0], number>>;
  darkvisionEditor?: ReactNode;
};

export function SensesAndResistancesCard({ darkvisionRange, damageResistances, damageImmunities, movementSpeeds, darkvisionEditor }: SensesAndResistancesProps) {
  const hasDarkvisionRow = darkvisionRange !== null || Boolean(darkvisionEditor);
  const rows = [
    ...MOVEMENT_ROWS.flatMap(([mode, label]) => (movementSpeeds[mode] ? [[label, `${movementSpeeds[mode]} футів`]] : [])),
    ...(damageResistances.length > 0 ? [["Опори", damageResistances.join(", ")]] : []),
    ...(damageImmunities.length > 0 ? [["Імунітети", damageImmunities.join(", ")]] : []),
  ];
  if (!hasDarkvisionRow && rows.length === 0) return null;

  return (
    <Card className="glass-card bg-slate-900/60 border border-white/10">
      <CardContent className="p-2 flex flex-col gap-1 text-sm text-slate-100">
        {hasDarkvisionRow ? (
          <div className="flex items-center justify-between gap-2">
            <div>
              <SenseLabel>Темнозір</SenseLabel> {darkvisionRange === null ? <span className="text-slate-400">немає</span> : `${darkvisionRange} футів`}
            </div>
            {darkvisionEditor}
          </div>
        ) : null}
        {rows.map(([label, value]) => (
          <div key={label}>
            <SenseLabel>{label}</SenseLabel> {value}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

const SenseLabel = ({ children }: { children: ReactNode }) => <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{children}</span>;
