"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { D20Icon } from "@/lib/components/icons/D20Icon";
import type { D20Mode } from "@/rules/dice-roll";
import type { ExtraDie } from "@/lib/stores/diceUIStore";
import { ExtraDiceMark } from "./ExtraDiceMark";

type PillSize = "sm" | "md";

const SIZE_CLASS: Record<PillSize, string> = { sm: "h-7 text-sm", md: "h-8 text-lg" };

type Props = {
  value: string;
  label: string;
  onRoll: () => void;
  size?: PillSize;
  caption?: string;
  className?: string;
  valueClassName?: string;
  children?: ReactNode;
  /// Кидок піде з перевагою чи перешкодою через стан — маленька стрілка біля числа.
  mode?: D20Mode;
  extraDice?: readonly ExtraDie[];
};

const MODE_MARKS: Record<Exclude<D20Mode, "NORMAL">, { symbol: string; className: string; spoken: string }> = {
  ADVANTAGE: { symbol: "▲", className: "text-emerald-400", spoken: "з перевагою" },
  DISADVANTAGE: { symbol: "▼", className: "text-rose-400", spoken: "з перешкодою" },
};

/// Підписана кнопка (ряткидок біля перевірки) стоїть у половині вузької картки: підпис іде над
/// числом, а іконку d20 несе сусідня кнопка — в один рядок «іконка, підпис, число» не влазили.
export function RollPill({ value, label, onRoll, size = "md", caption, className, valueClassName, children, mode = "NORMAL", extraDice }: Props) {
  const mark = mode === "NORMAL" ? null : MODE_MARKS[mode];
  const spokenLabel = mark ? `${label}, ${mark.spoken}` : label;
  return (
    <button
      type="button"
      aria-label={spokenLabel}
      title={spokenLabel}
      onClick={(event) => {
        event.stopPropagation();
        onRoll();
      }}
      className={cn(
        "swiper-no-swiping group inline-flex min-w-0 shrink-0 items-center justify-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-1.5 font-bold leading-none text-slate-100 transition hover:border-white/20 hover:bg-white/10 active:scale-95",
        SIZE_CLASS[size],
        className,
      )}
    >
      {caption ? (
        <span className="flex flex-col items-center">
          <span className="text-[9px] font-semibold leading-none text-slate-400">{caption}</span>
          <PillValue value={value} mark={mark} extraDice={extraDice} className={valueClassName}>{children}</PillValue>
        </span>
      ) : (
        <>
          <D20Icon className="h-3.5 w-3.5 shrink-0 text-slate-500 transition group-hover:text-slate-300" />
          <PillValue value={value} mark={mark} extraDice={extraDice} className={valueClassName}>{children}</PillValue>
        </>
      )}
    </button>
  );
}

function PillValue({
  value,
  mark,
  extraDice,
  className,
  children,
}: {
  value: string;
  mark: { symbol: string; className: string } | null;
  extraDice?: readonly ExtraDie[];
  className?: string;
  children?: ReactNode;
}) {
  return (
    <span className={cn("flex shrink-0 items-center gap-1 tabular-nums", className)}>
      {value}
      {mark ? <span className={cn("text-[9px] leading-none", mark.className)} aria-hidden>{mark.symbol}</span> : null}
      <ExtraDiceMark dice={extraDice} className="text-[10px] leading-none" />
      {children}
    </span>
  );
}
