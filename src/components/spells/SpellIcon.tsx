"use client";

import { cn } from "@/lib/utils";
import sprite from "@/lib/generated/spell-icon-sprite.json";
import { SpellSchoolPlate } from "./SpellSchoolPlate";

type Props = {
  engName: string | null | undefined;
  school?: string | null;
  className?: string;
};

const INDEX = new Map(sprite.names.map((engName, position) => [engName, position]));

export function SpellIcon({ engName, school, className }: Props) {
  const position = engName ? INDEX.get(engName) : undefined;

  if (position === undefined) {
    return <SpellSchoolPlate school={school} className={className} />;
  }

  const column = position % sprite.columns;
  const row = Math.floor(position / sprite.columns);

  return (
    <div
      role="presentation"
      className={cn("rounded-md border border-white/10 bg-slate-950/40", className)}
      style={{
        backgroundImage: `url(${sprite.file})`,
        backgroundSize: `${sprite.columns * 100}% ${sprite.rows * 100}%`,
        backgroundPosition: `${(column / (sprite.columns - 1)) * 100}% ${(row / (sprite.rows - 1)) * 100}%`,
        imageRendering: "auto",
      }}
    />
  );
}
