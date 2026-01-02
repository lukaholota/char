"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Info } from "lucide-react";

import { usePersFormStore } from "@/lib/stores/persFormStore";
import { infusionTargetTranslations } from "@/lib/refs/translation";
import { InfusionInfoModal } from "./InfusionInfoModal";

type InfusionListItem = {
  infusionId: number;
  name: string;
  engName: string;
  minArtificerLevel: number;
  targetType: string;
  requiresAttunement: boolean;
  feature?: { name: string; description: string; shortDescription?: string | null } | null;
  replicatedMagicItem?: {
    magicItemId: number;
    name: string;
    engName: string;
    itemType: string;
    rarity: string;
    requiresAttunement: boolean;
    description: string;
    shortDescription?: string | null;
    bonusToAC?: number | null;
    bonusToRangedDamage?: number | null;
    bonusToSavingThrows?: any;
    noArmorOrShieldForACBonus?: boolean | null;
    givesSpells?: { spellId: number; name: string; engName: string; level: number }[];
  } | null;
};

interface Props {
  infusions: InfusionListItem[];
  artificerLevelAfter: number;
  alreadyKnownInfusionIds: number[];
  requiredCount: number;
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
}

export default function LevelUpInfusionsStep({
  infusions,
  artificerLevelAfter,
  alreadyKnownInfusionIds,
  requiredCount,
  formId,
  onNextDisabledChange,
}: Props) {
  const { formData, updateFormData } = usePersFormStore();
  const [query, setQuery] = useState("");
  const [infoInfusion, setInfoInfusion] = useState<InfusionListItem | null>(null);
  const prevDisabledRef = useRef<boolean | undefined>(undefined);

  const selectedIds = useMemo(() => {
    const raw = (formData as any).infusionSelections;
    if (!Array.isArray(raw)) return [] as number[];
    return raw.map((v) => Number(v)).filter((v) => Number.isFinite(v));
  }, [formData]);

  const knownSet = useMemo(() => new Set(alreadyKnownInfusionIds), [alreadyKnownInfusionIds]);

  const eligibleInfusions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (infusions || [])
      .filter((inf) => Number(inf.minArtificerLevel || 0) <= artificerLevelAfter)
      .filter((inf) => !knownSet.has(inf.infusionId))
      .filter((inf) => {
        if (!q) return true;
        const name = String(inf.name || "").toLowerCase();
        const eng = String(inf.engName || "").toLowerCase();
        return name.includes(q) || eng.includes(q);
      })
      .sort((a, b) => String(a.name).localeCompare(String(b.name), "uk", { sensitivity: "base" }));
  }, [infusions, artificerLevelAfter, knownSet, query]);

  useEffect(() => {
    const disabled = selectedIds.length !== requiredCount;
    if (prevDisabledRef.current !== disabled) {
      prevDisabledRef.current = disabled;
      onNextDisabledChange?.(disabled);
    }
  }, [selectedIds.length, requiredCount, onNextDisabledChange]);

  const toggle = (infusionId: number) => {
    const nextSet = new Set(selectedIds);
    if (nextSet.has(infusionId)) {
      nextSet.delete(infusionId);
    } else {
      if (nextSet.size >= requiredCount) return;
      nextSet.add(infusionId);
    }

    updateFormData({ infusionSelections: Array.from(nextSet) } as any);
  };

  return (
    <form id={formId} className="space-y-4">
      <Card className="glass-card">
        <CardHeader className="space-y-2">
          <CardTitle>Вливання (Infusions)</CardTitle>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-300">
              Оберіть <span className="font-semibold text-slate-100">{requiredCount}</span> вливання для підготовки.
            </p>
            <Badge variant="outline" className="border-white/15 bg-white/5 text-slate-100">
              Обрано: {selectedIds.length}/{requiredCount}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Пошук (укр/eng)..."
            className="bg-white/5 border-white/10"
          />

          <div className="grid grid-cols-1 gap-3">
            {eligibleInfusions.length === 0 ? (
              <div className="text-center py-8 text-slate-400">Нічого не знайдено</div>
            ) : (
              eligibleInfusions.map((inf) => {
                const selected = selectedIds.includes(inf.infusionId);
                const disabled = !selected && selectedIds.length >= requiredCount;
                const title = inf.name || inf.engName;
                const shortDesc =
                  inf.feature?.shortDescription ||
                  inf.replicatedMagicItem?.shortDescription ||
                  (inf.feature?.description
                    ? inf.feature.description.length > 100
                      ? inf.feature.description.substring(0, 100) + "..."
                      : inf.feature.description
                    : inf.replicatedMagicItem?.description
                      ? inf.replicatedMagicItem.description.length > 100
                        ? inf.replicatedMagicItem.description.substring(0, 100) + "..."
                        : inf.replicatedMagicItem.description
                      : "");
                const targetUkr = infusionTargetTranslations[inf.targetType as keyof typeof infusionTargetTranslations] || inf.targetType;

                return (
                  <div
                    key={inf.infusionId}
                    className={
                      "glass-panel border-gradient-rpg relative overflow-hidden rounded-xl border p-4 transition cursor-pointer group " +
                      (selected
                        ? "border-gradient-rpg border-gradient-rpg-active glass-active bg-white/10"
                        : "border-white/10 bg-white/5 hover:bg-white/7") +
                      (disabled ? " opacity-60 grayscale-[0.5]" : "")
                    }
                    onClick={() => {
                      if (disabled) return;
                      toggle(inf.infusionId);
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-white group-hover:text-indigo-200 transition-colors uppercase tracking-wide">
                            {title}
                          </h4>
                          <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-white/5">
                            {targetUkr}
                          </span>
                          <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10">
                            lvl {inf.minArtificerLevel}+
                          </span>
                          {inf.requiresAttunement && (
                            <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              Налаштування
                            </span>
                          )}
                          {inf.replicatedMagicItem && (
                            <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-200 border border-indigo-500/20">
                              Репліка: {inf.replicatedMagicItem.name}
                            </span>
                          )}
                        </div>
                        {inf.engName && inf.name !== inf.engName && (
                          <p className="text-[10px] text-slate-500 font-medium tracking-wide">
                            {inf.engName}
                          </p>
                        )}
                        {shortDesc && (
                          <p className="text-xs text-slate-400 leading-relaxed pt-1">
                            {shortDesc}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInfoInfusion(inf);
                        }}
                      >
                        <Info className="w-5 h-5" />
                      </button>
                    </div>

                    {selected && (
                      <div className="absolute top-0 right-0 p-1">
                        <div className="w-0 h-0 border-t-[30px] border-l-[30px] border-r-0 border-b-0 border-t-indigo-500/80 border-l-transparent absolute top-0 right-0" />
                        <svg className="absolute top-1 right-1 w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {infoInfusion && (
        <InfusionInfoModal 
          infusion={infoInfusion as any}
          open={!!infoInfusion}
          onOpenChange={(open) => !open && setInfoInfusion(null)}
        />
      )}
    </form>
  );
}
