import { cn } from "@/lib/utils";
import type { ExtraDie } from "@/lib/stores/diceUIStore";
import { formatExtraDice } from "./roll-contexts";

/// Кубик стану не складається з числом, тож біля бонусу стоїть окремо: «+6 +к4».
export function ExtraDiceMark({ dice, className }: { dice?: readonly ExtraDie[]; className?: string }) {
  if (!dice?.length) return null;
  const isPenalty = dice.every((die) => die.sign < 0);
  return (
    <span
      title={dice.map((die) => die.label).join(", ")}
      className={cn("whitespace-nowrap font-bold tabular-nums", isPenalty ? "text-rose-300" : "text-emerald-300", className)}
    >
      {formatExtraDice(dice)}
    </span>
  );
}
