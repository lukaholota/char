import { cn } from "@/lib/utils";

/// Colour comes from the caller through `currentColor`, so one divider serves every accent.
export function StarDivider({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("flex items-center gap-1", className)}>
      <span className="h-px flex-1 bg-current opacity-45" />
      <Arrowhead />
      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 shrink-0" fill="currentColor">
        <path d="M6 0 L7.3 4.7 L12 6 L7.3 7.3 L6 12 L4.7 7.3 L0 6 L4.7 4.7 Z" />
      </svg>
      <Arrowhead className="rotate-180" />
      <span className="h-px flex-1 bg-current opacity-45" />
    </div>
  );
}

function Arrowhead({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 6 8" fill="none" className={cn("h-2 w-1.5 shrink-0 opacity-70", className)}>
      <path d="M0.8 1 L5 4 L0.8 7" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}
