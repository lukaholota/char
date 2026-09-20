import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { Edition } from "@/rules/route-helpers";
import { SHEEN_MOTION, findEditionAccent } from "@/styles/edition-accent";

/// ▼ Чим малюються дрібні рамки — бейджі й чіпи редакції. "solid" тримає їх на суцільному
/// кольорі схеми, "sheen" дає їм те саме переливання, що й картці.
const CHIP_ACCENT: "solid" | "sheen" = "sheen";

type AccentProps = {
  edition: Edition;
  className?: string;
  children: ReactNode;
};

/// Картка редакції: переливна рамка через маску плюс призматичне сяйво. Скло всередині
/// лишається тим самим — рамка малюється псевдоелементом, а не фоном.
export function EditionAccentFrame({ edition, className, children }: AccentProps) {
  const accent = findEditionAccent(edition);
  return (
    <div
      style={accent.vars}
      className={cn("group sheen-ring sheen-glow rounded-2xl", buildDriftClassName(), className)}
    >
      {children}
    </div>
  );
}

export function EditionAccentTitle({ edition, className, children }: AccentProps) {
  const accent = findEditionAccent(edition);
  return (
    <span style={accent.vars} className={cn("sheen-text", className)}>
      {children}
    </span>
  );
}

export function EditionAccentChip({ edition, className, children }: AccentProps) {
  const accent = findEditionAccent(edition);
  const isSheen = CHIP_ACCENT === "sheen";
  return (
    <span
      style={accent.vars}
      className={cn(
        "inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold",
        isSheen ? "sheen-ring bg-white/[0.03]" : cn("border", accent.solid.border, accent.solid.fill),
        accent.solid.text,
        className
      )}
    >
      {children}
    </span>
  );
}

function buildDriftClassName(): string | undefined {
  if (SHEEN_MOTION === "always") return "sheen-drift sheen-drift-always";
  if (SHEEN_MOTION === "hover") return "sheen-drift sheen-drift-hover";
  return undefined;
}
