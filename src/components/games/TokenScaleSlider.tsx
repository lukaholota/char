import { cn } from "@/lib/utils";
import { TOKEN_SCALE_RANGE } from "./use-token-scale";

export function TokenScaleSlider({ scale, onChange, className }: { scale: number; onChange: (scale: number) => void; className?: string }) {
  return (
    <label className={cn("flex w-full min-w-0 items-center gap-3 text-sm text-slate-400", className)}>
      <span className="shrink-0">Розмір токенів</span>
      <input
        type="range"
        min={TOKEN_SCALE_RANGE.min}
        max={TOKEN_SCALE_RANGE.max}
        step={TOKEN_SCALE_RANGE.step}
        value={scale}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 w-full accent-arcane-300"
      />
    </label>
  );
}
