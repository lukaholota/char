"use client";

import { cn } from "@/lib/utils";
import { findSchoolVisual } from "@/lib/refs/spell-school-visual";

type Props = {
  school: string | null | undefined;
  className?: string;
  iconClassName?: string;
};

export function SpellSchoolPlate({ school, className, iconClassName }: Props) {
  const visual = findSchoolVisual(school);
  const Icon = visual.icon;

  return (
    <div className={cn("flex items-center justify-center rounded-md border", visual.iconWrap, className)}>
      <Icon className={cn("h-1/2 w-1/2", visual.iconColor, iconClassName)} />
    </div>
  );
}
