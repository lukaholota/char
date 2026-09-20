"use client";

import { CheckSquare, Pin, Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FramedIllustration } from "@/components/ui/FramedIllustration";
import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import { buildMediaImageUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";
import type { PersHomeItem } from "./CharHomeClient";

type Props = { pers: PersHomeItem; selectionMode: boolean; isSelected: boolean; contextLabel?: string | null };

export function PersCardBody({ pers, selectionMode, isSelected, contextLabel }: Props) {
  return (
    <CardHeader className="relative flex-row items-center gap-4 space-y-0">
      {selectionMode ? (
        <div className="absolute left-4 top-4 z-10">
          {isSelected ? <CheckSquare className="h-5 w-5 text-arcane-300" /> : <Square className="h-5 w-5 text-slate-500" />}
        </div>
      ) : null}
      {pers.portraitKey ? (
        <div className={cn("aspect-square w-24 shrink-0 sm:w-28", selectionMode && "ml-6")}>
          <FramedIllustration src={buildMediaImageUrl(pers.portraitKey, "full")} alt={`Портрет: ${pers.name}`} provenance="drawn" sizes="112px" chamfer="sm" vignette="sm" />
        </div>
      ) : null}
      <div className={cn("min-w-0 flex-1 space-y-1.5 pr-10", selectionMode && !pers.portraitKey && "pl-6")}>
        <CardTitle className="flex items-start gap-2 text-xl leading-tight">
          <span className="line-clamp-3 min-w-0 break-words">{pers.name}</span>
          {pers.ruleset === "RULES_2024" ? (
            <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 px-1.5 py-0 text-[10px] font-normal text-amber-300">
              2024
            </Badge>
          ) : null}
          {pers.isPinned ? <Pin className="h-4 w-4 shrink-0 text-amber-300" /> : null}
        </CardTitle>
        <CardDescription>
          {translateValue(pers.raceName)} {translateValue(pers.className)} {pers.level}
        </CardDescription>
        {contextLabel ? <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{contextLabel}</div> : null}
      </div>
    </CardHeader>
  );
}
