"use client";

import { useMemo, useState } from "react";
import { CharacterFeatureItem, CharacterFeaturesGroupedResult } from "@/lib/actions/pers";
import { FeatureDisplayType } from "@prisma/client";
import { ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/lib/components/ui/dialog";

interface FeaturesSlideProps {
  groupedFeatures: CharacterFeaturesGroupedResult | null;
}

type CategoryKind = "passive" | "action" | "bonus" | "reaction";
type Category = { title: string; items: CharacterFeatureItem[]; kind: CategoryKind };

function safeText(value: string | null | undefined) {
  return (value ?? "").trim();
}

function categoryVariant(kind: "passive" | "action" | "bonus" | "reaction") {
  switch (kind) {
    case "action":
      return {
        container: "border-l-red-500/50 from-red-950/20",
        chevron: "text-red-300",
        title: "text-red-50",
        count: "text-red-200/70",
        cardBorder: "border-red-600/30 hover:border-red-500/60",
        cardBg: "bg-red-900/25 hover:bg-red-900/45",
      };
    case "bonus":
      return {
        container: "border-l-blue-500/50 from-blue-950/20",
        chevron: "text-blue-300",
        title: "text-blue-50",
        count: "text-blue-200/70",
        cardBorder: "border-blue-600/30 hover:border-blue-500/60",
        cardBg: "bg-blue-900/25 hover:bg-blue-900/45",
      };
    case "reaction":
      return {
        container: "border-l-purple-500/50 from-purple-950/20",
        chevron: "text-purple-300",
        title: "text-purple-50",
        count: "text-purple-200/70",
        cardBorder: "border-purple-600/30 hover:border-purple-500/60",
        cardBg: "bg-purple-900/25 hover:bg-purple-900/45",
      };
    case "passive":
    default:
      return {
        container: "border-l-amber-600/50 from-amber-950/20",
        chevron: "text-amber-300",
        title: "text-amber-50",
        count: "text-amber-200/70",
        cardBorder: "border-amber-700/30 hover:border-amber-600/60",
        cardBg: "bg-amber-900/20 hover:bg-amber-900/40",
      };
  }
}

function getKindFromPrimaryType(primaryType: FeatureDisplayType): "passive" | "action" | "bonus" | "reaction" {
  switch (primaryType) {
    case FeatureDisplayType.ACTION:
      return "action";
    case FeatureDisplayType.BONUSACTION:
      return "bonus";
    case FeatureDisplayType.REACTION:
      return "reaction";
    default:
      return "passive";
  }
}

function FeatureCard({
  item,
  onClick,
}: {
  item: CharacterFeatureItem;
  onClick: () => void;
}) {
  const kind = getKindFromPrimaryType(item.primaryType);
  const variant = categoryVariant(kind);

  const description = safeText(item.description);
  const preview = description.length > 180 ? description.slice(0, 180).trimEnd() + "…" : description;

  const showUses =
    (item.primaryType === FeatureDisplayType.ACTION || item.primaryType === FeatureDisplayType.BONUSACTION) &&
    typeof item.usesRemaining === "number" &&
    typeof item.usesPer === "number";

  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "group relative w-full text-left p-3 rounded-lg border shadow-inner transition-all cursor-pointer " +
        variant.cardBorder +
        " " +
        variant.cardBg
      }
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-white/5 via-transparent to-transparent rounded-lg transition-opacity" />

      <div className="relative z-10 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-sm text-white/95 truncate">{item.name}</h4>
          {preview ? <p className="text-xs mt-1 text-slate-200/70 leading-snug line-clamp-2">{preview}</p> : null}
        </div>

        {showUses ? (
          <div className="flex-shrink-0 text-right">
            <div className="text-xs font-semibold text-amber-300">
              {item.usesRemaining}/{item.usesPer}
            </div>
            {item.restType ? <div className="text-[10px] text-slate-400 mt-0.5">{item.restType}</div> : null}
          </div>
        ) : null}
      </div>
    </button>
  );
}

export default function FeaturesSlide({ groupedFeatures }: FeaturesSlideProps) {
  const [selected, setSelected] = useState<CharacterFeatureItem | null>(null);

  const categories = useMemo<Category[]>(() => {
    if (!groupedFeatures) return [];
    return [
      { title: "Активні вміння", items: groupedFeatures.actions, kind: "action" },
      { title: "Бонусна дія", items: groupedFeatures.bonusActions, kind: "bonus" },
      { title: "Реакція", items: groupedFeatures.reactions, kind: "reaction" },
      { title: "Пасивні здібності", items: groupedFeatures.passive, kind: "passive" },
    ];
  }, [groupedFeatures]);

  return (
    <div className="h-full p-3 sm:p-4 space-y-3">
      <h2 className="text-xl sm:text-2xl font-bold text-slate-50">Здібності</h2>

      {!groupedFeatures ? (
        <div className="text-sm text-slate-400">Немає даних про фічі</div>
      ) : (
        <div className="space-y-2">
          {categories.map((category) => {
            const variant = categoryVariant(category.kind);
            const total = category.items.length;

            return (
              <Collapsible
                key={category.title}
                defaultOpen={total > 0}
                className={
                  "group border-l-2 bg-gradient-to-r to-transparent rounded-r-lg p-3 sm:p-4 transition-all duration-300 " +
                  variant.container
                }
              >
                <CollapsibleTrigger className="flex items-center gap-3 w-full">
                  <ChevronRight className={"w-5 h-5 transition-transform group-data-[state=open]:rotate-90 " + variant.chevron} />
                  <span className={"font-bold uppercase tracking-wider text-xs sm:text-sm " + variant.title}>{category.title}</span>
                  <span className={"ml-auto text-[10px] sm:text-xs " + variant.count}>[{total}]</span>
                </CollapsibleTrigger>

                <CollapsibleContent className="mt-3 sm:mt-4 pl-6 sm:pl-8">
                  {total === 0 ? (
                    <div className="text-xs text-slate-400">Немає в цій категорії</div>
                  ) : (
                    <ScrollArea className="max-h-[44vh] overflow-y-auto pr-3">
                      <div className="space-y-2">
                        {category.items.map((item) => (
                          <FeatureCard key={item.key} item={item} onClick={() => setSelected(item)} />
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl border border-white/10 bg-slate-950/95 backdrop-blur text-slate-50">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{selected?.name}</DialogTitle>
            {selected ? (
              <DialogDescription className="text-xs text-slate-300">
                {selected.sourceName} • {selected.source}
              </DialogDescription>
            ) : null}
          </DialogHeader>
          <div className="text-sm text-slate-200/90 whitespace-pre-line leading-relaxed">
            {selected?.description}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
