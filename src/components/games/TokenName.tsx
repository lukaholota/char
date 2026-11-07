"use client";

import { cn } from "@/lib/utils";
import { TOKEN_NAME_MODES, type TokenNameMode } from "@/rules/game-map-creatures";

const MODE_LABELS: Record<TokenNameMode, string> = { short: "Скорочено", wrap: "2 рядки", full: "1 рядок" };

const MODE_CLASSES: Record<TokenNameMode, string> = {
  short: "truncate",
  wrap: "line-clamp-2 break-words text-center",
  full: "whitespace-nowrap",
};

export function TokenName({ name, mode, tokenSize }: { name: string; mode: TokenNameMode; tokenSize: number }) {
  return (
    <span className={cn("mt-0.5 rounded bg-slate-950/80 px-1 text-xs leading-4 text-slate-100", MODE_CLASSES[mode])} style={mode === "full" ? undefined : { maxWidth: Math.max(64, tokenSize + 16) }}>
      {name}
    </span>
  );
}

export function TokenNameModePicker({ label, mode, onChange, isBusy = false, className }: { label: string; mode: TokenNameMode; onChange: (mode: TokenNameMode) => void; isBusy?: boolean; className?: string }) {
  return (
    <div role="group" aria-label={label} className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-400", className)}>
      <span className="shrink-0">{label}</span>
      <div className="flex rounded-xl border border-white/10 p-0.5">
        {TOKEN_NAME_MODES.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={mode === option}
            disabled={isBusy}
            onClick={() => onChange(option)}
            className={cn("h-9 whitespace-nowrap rounded-lg px-2 text-sm disabled:opacity-60", mode === option ? "bg-white/10 text-slate-100" : "text-slate-400 hover:text-slate-200")}
          >
            {MODE_LABELS[option]}
          </button>
        ))}
      </div>
    </div>
  );
}
