import { Card, CardContent } from "@/components/ui/card";

const MOVEMENT_ROWS = [["FLY", "Політ"], ["SWIM", "Плавання"], ["CLIMB", "Лазіння"]] as const;

type SensesAndResistancesProps = {
  darkvisionRange: number | null;
  damageResistances: string[];
  damageImmunities: string[];
  movementSpeeds: Partial<Record<(typeof MOVEMENT_ROWS)[number][0], number>>;
};

export function SensesAndResistancesCard({ darkvisionRange, damageResistances, damageImmunities, movementSpeeds }: SensesAndResistancesProps) {
  const rows = [
    ...(darkvisionRange !== null ? [["Темнозір", `${darkvisionRange} футів`]] : []),
    ...MOVEMENT_ROWS.flatMap(([mode, label]) => (movementSpeeds[mode] ? [[label, `${movementSpeeds[mode]} футів`]] : [])),
    ...(damageResistances.length > 0 ? [["Опори", damageResistances.join(", ")]] : []),
    ...(damageImmunities.length > 0 ? [["Імунітети", damageImmunities.join(", ")]] : []),
  ];
  if (rows.length === 0) return null;

  return (
    <Card className="glass-card bg-slate-900/60 border border-white/10">
      <CardContent className="p-2 flex flex-col gap-1 text-sm text-slate-100">
        {rows.map(([label, value]) => (
          <div key={label}>
            <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</span> {value}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
