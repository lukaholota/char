import type { NumberPart } from "@/lib/logic/bonus-calculator";
import { formatModifier } from "@/lib/logic/utils";

type Props = {
  title: string;
  parts: NumberPart[];
};

export function NumberBreakdown({ title, parts }: Props) {
  if (parts.length === 0) return null;
  const total = parts.reduce((sum, part) => sum + part.value, 0);

  return (
    <div className="rounded-lg border border-slate-700/30 bg-slate-800/20 p-3 text-sm">
      <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-300">
        <span>{title}</span>
        <span className="text-emerald-400">{total}</span>
      </div>
      {parts.map((part, index) => (
        <div key={`${part.label}-${index}`} className="flex items-center justify-between text-slate-400">
          <span>{part.label}</span>
          <span className="tabular-nums text-slate-200">{index === 0 ? part.value : formatModifier(part.value)}</span>
        </div>
      ))}
    </div>
  );
}
