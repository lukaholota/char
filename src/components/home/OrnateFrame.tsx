import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";
import { HOME_ACCENTS, type HomeAccentName } from "./homeTokens";

type OrnateFrameProps = {
  accent: HomeAccentName;
  notchSize: number;
  className?: string;
  children: ReactNode;
};

export function OrnateFrame({ accent, notchSize, className, children }: OrnateFrameProps) {
  const { frameClassName, glowClassName } = HOME_ACCENTS[accent];

  return (
    <div
      style={buildBevelStyle(notchSize)}
      className={cn(
        "relative h-full w-full p-[1.5px] shadow-[0_18px_40px_-28px_rgba(0,0,0,0.95)] transition-shadow duration-300",
        frameClassName,
        glowClassName,
        className,
      )}
    >
      <div
        style={buildBevelStyle(Math.max(notchSize - 2, 0))}
        className="relative h-full w-full overflow-hidden bg-[#0b0a11]"
      >
        {children}
      </div>
      <FrameCorners accent={accent} />
    </div>
  );
}

type StarDividerProps = {
  accent: HomeAccentName;
  className?: string;
};

export function StarDivider({ accent, className }: StarDividerProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("flex items-center gap-1", HOME_ACCENTS[accent].textClassName, className)}
    >
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
    <svg
      viewBox="0 0 6 8"
      fill="none"
      className={cn("h-2 w-1.5 shrink-0 opacity-70", className)}
    >
      <path d="M0.8 1 L5 4 L0.8 7" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

function FrameCorners({ accent }: { accent: HomeAccentName }) {
  const { textClassName } = HOME_ACCENTS[accent];

  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", textClassName)}>
      {CORNER_PLACEMENTS.map((placement) => (
        <svg
          key={placement}
          viewBox="0 0 14 14"
          fill="none"
          className={cn("absolute h-3.5 w-3.5 opacity-70", placement)}
        >
          <path d="M1 13 L1 4 L4 1 L13 1" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      ))}
    </div>
  );
}

const CORNER_PLACEMENTS = [
  "left-[3px] top-[3px]",
  "right-[3px] top-[3px] rotate-90",
  "bottom-[3px] right-[3px] rotate-180",
  "bottom-[3px] left-[3px] -rotate-90",
] as const;

function buildBevelStyle(notch: number): CSSProperties {
  const corner = `${notch}px`;
  const inset = `calc(100% - ${notch}px)`;

  return {
    clipPath: `polygon(${corner} 0, ${inset} 0, 100% ${corner}, 100% ${inset}, ${inset} 100%, ${corner} 100%, 0 ${inset}, 0 ${corner})`,
  };
}
