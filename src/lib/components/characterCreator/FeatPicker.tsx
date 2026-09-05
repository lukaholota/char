"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SourceBadge } from "@/lib/components/characterCreator/SourceBadge";
import { FeatInfoModal } from "@/lib/components/characterCreator/modals/FeatInfoModal";
import { featTranslations } from "@/lib/refs/translation";
import { Feat } from "@prisma/client";
import clsx from "clsx";
import { Search, X } from "lucide-react";
import { ReactNode } from "react";

type FeatPrerequisite = { met: boolean; reason?: string };

type Props = {
  feats: Feat[];
  selectedFeatId: number | undefined;
  search: string | undefined;
  prerequisiteByFeatId: ReadonlyMap<number, FeatPrerequisite>;
  onSearchChange: (search: string) => void;
  onSelectFeat: (feat: Feat) => void;
  emptyState?: ReactNode;
};

export function FeatPicker({
  feats,
  selectedFeatId,
  search,
  prerequisiteByFeatId,
  onSearchChange,
  onSelectFeat,
  emptyState,
}: Props) {
  return (
    <>
      <div className="glass-panel border-gradient-rpg rounded-xl p-3 sm:p-4">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            type="search"
            value={search || ""}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Пошук риси"
            className="h-10 border-white/10 bg-white/5 pl-9 pr-10 text-sm text-slate-100 placeholder:text-slate-400 focus-visible:ring-arcane-400/30"
          />
          {search && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1.5 top-1/2 h-7 w-7 -translate-y-1/2 text-slate-400 hover:text-white"
              onClick={() => onSearchChange("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {feats.map((feat) => {
          const prerequisite = prerequisiteByFeatId.get(feat.featId);
          const isMet = prerequisite?.met ?? true;
          const isSelected = feat.featId === selectedFeatId;
          const showUnavailable = !isMet && !isSelected;

          return (
            <Card
              key={feat.featId}
              className={clsx(
                "glass-card cursor-pointer transition-all duration-200 relative",
                isSelected && "glass-active",
                showUnavailable && "border-rose-500/30 opacity-70"
              )}
              onClick={(event) => {
                if ((event.target as HTMLElement | null)?.closest?.("[data-stop-card-click]")) return;
                onSelectFeat(feat);
              }}
            >
              <CardContent className="relative flex items-center justify-between p-4">
                {showUnavailable ? <div className="pointer-events-none absolute inset-0 bg-black/25" /> : null}
                <FeatInfoModal feat={feat} triggerClassName="-right-4 -top-4 sm:-right-5 sm:-top-5" />
                <div>
                  <div className="text-lg font-semibold text-white">{featTranslations[feat.name] ?? feat.name}</div>
                  <div className="text-xs text-slate-400">{feat.engName}</div>
                  {!isMet && prerequisite?.reason ? (
                    <div className="mt-2 text-[10px] text-rose-400 font-medium bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                      {prerequisite.reason}
                    </div>
                  ) : null}
                </div>
                <SourceBadge code={feat.source} active={isSelected} />
              </CardContent>
            </Card>
          );
        })}
        {feats.length === 0 ? emptyState : null}
      </div>
    </>
  );
}
