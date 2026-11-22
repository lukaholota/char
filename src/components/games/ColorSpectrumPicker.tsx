"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { isLightColor } from "@/rules/map-colors";

const SWATCHES = [
  { hex: "#ef4444", label: "Червоний" },
  { hex: "#f97316", label: "Помаранчевий" },
  { hex: "#facc15", label: "Жовтий" },
  { hex: "#22c55e", label: "Зелений" },
  { hex: "#38bdf8", label: "Блакитний" },
  { hex: "#2563eb", label: "Синій" },
  { hex: "#8b5cf6", label: "Фіолетовий" },
  { hex: "#ec4899", label: "Рожевий" },
  { hex: "#92400e", label: "Коричневий" },
  { hex: "#ffffff", label: "Білий" },
  { hex: "#000000", label: "Чорний" },
] as const;

const SPECTRUM = "conic-gradient(#ef4444, #facc15, #22c55e, #38bdf8, #2563eb, #8b5cf6, #ec4899, #ef4444)";
export const tileLook = (isChecked: boolean) => cn("relative grid h-11 place-items-center rounded-xl border border-white/10 hover:bg-white/10", isChecked && "bg-white/10 ring-1 ring-arcane-300/60");

function CheckMark({ hex }: { hex: string }) {
  return <Check className={cn("h-4 w-4", isLightColor(hex) ? "text-slate-950" : "text-white")} aria-hidden />;
}

type PickerProps = { label: string; value: string | null; onChange: (hex: string) => void; natural?: { label: string; onChoose: () => void } };

/// Готові кольори під рукою, а будь-який інший — з системного спектру. value null — природний колір, якщо його можна вибрати.
export function ColorSpectrumPicker({ label, value, onChange, natural }: PickerProps) {
  const isCustom = value !== null && !isSwatch(value);
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-6 gap-1">
      {natural ? (
        <button type="button" role="radio" aria-checked={value === null} onClick={natural.onChoose} className={cn(tileLook(value === null), "col-span-2 px-2 text-sm text-slate-200")}>
          {natural.label}
        </button>
      ) : null}
      {SWATCHES.map(({ hex, label: name }) => (
        <button key={hex} type="button" role="radio" aria-checked={value === hex} aria-label={name} title={name} onClick={() => onChange(hex)} className={tileLook(value === hex)}>
          <span className="grid h-6 w-6 place-items-center rounded-full ring-1 ring-white/25" style={{ backgroundColor: hex }}>
            {value === hex ? <CheckMark hex={hex} /> : null}
          </span>
        </button>
      ))}
      <SpectrumTile value={value} isCustom={isCustom} onCommit={onChange} />
    </div>
  );
}

const isSwatch = (hex: string) => SWATCHES.some((swatch) => swatch.hex === hex);

/// Системний спектр шле input на кожен рух — показуємо чернетку, а зберігаємо лише на change, коли вибір підтверджено.
function SpectrumTile({ value, isCustom, onCommit }: { value: string | null; isCustom: boolean; onCommit: (hex: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const commit = () => {
      setDraft(null);
      commitRef.current(input.value);
    };
    input.addEventListener("change", commit);
    return () => input.removeEventListener("change", commit);
  }, []);

  const shown = draft ?? (isCustom ? value : null);
  return (
    <label className={cn(tileLook(isCustom || draft !== null), "cursor-pointer focus-within:ring-2 focus-within:ring-arcane-300")} title="Інший колір зі спектру">
      <span className="grid h-7 w-7 place-items-center rounded-full" style={{ background: SPECTRUM }}>
        <span className="grid h-4 w-4 place-items-center rounded-full ring-1 ring-black/30" style={{ backgroundColor: shown ?? "#0f172a" }} />
      </span>
      <input ref={inputRef} type="color" value={draft ?? value ?? "#ffffff"} onChange={(event) => setDraft(event.target.value)} aria-label="Інший колір зі спектру" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
    </label>
  );
}
