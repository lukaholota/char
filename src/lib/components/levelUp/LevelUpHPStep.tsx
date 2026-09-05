"use client";

import { useEffect, useMemo, useRef } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { usePersFormStore } from "@/lib/stores/persFormStore";
import type { FeatPrisma } from "@/lib/types/model-types";
import { findAbilityScoresAfterLevelUp } from "@/rules/levelup-ability-scores";
import type { Ruleset } from "@/rules/types";

interface Props {
  hitDie: number; // e.g. 10 for d10
  baseStats: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  feats: FeatPrisma[];
  persFeats?: any[];
  nextLevel: number;
  ruleset?: Ruleset | null;
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
}

const averageHitDie = (hitDie: number) => Math.floor(hitDie / 2) + 1;

const getAbilityMod = (score: number) => Math.floor((score - 10) / 2);

export default function LevelUpHPStep({
  hitDie,
  baseStats,
  feats,
  persFeats,
  nextLevel,
  ruleset,
  formId,
  onNextDisabledChange,
}: Props) {
  const { formData, updateFormData } = usePersFormStore();
  
  const mode = formData.levelUpHpMode || "AVERAGE";
  const hpInput = formData.levelUpHpManualInput || "";
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectedFeat = useMemo(() => {
    const id = formData.featId ? Number(formData.featId) : undefined;
    if (!id) return null;
    return feats.find((f) => f.featId === id) ?? null;
  }, [feats, formData.featId]);

  const toughBonus = useMemo(() => {
    const hasTough = (persFeats || []).some((pf: any) => pf.feat?.name === "TOUGH");
    const takingTough = selectedFeat?.name === "TOUGH";
    if (takingTough) return 2 * nextLevel;
    if (hasTough) return 2;
    return 0;
  }, [persFeats, selectedFeat, nextLevel]);

  const effectiveStats = useMemo(() => findAbilityScoresAfterLevelUp({
    scores: { STR: baseStats.str, DEX: baseStats.dex, CON: baseStats.con, INT: baseStats.int, WIS: baseStats.wis, CHA: baseStats.cha },
    ruleset,
    classIncreases: formData.customAsi,
    feat: selectedFeat,
  }), [baseStats, formData.customAsi, selectedFeat, ruleset]);

  const conMod = useMemo(() => getAbilityMod(effectiveStats.CON), [effectiveStats.CON]);
  const avg = useMemo(() => averageHitDie(hitDie), [hitDie]);

  const hpIncrease = useMemo(() => {
    const raw = formData.levelUpHpIncrease;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    return undefined;
  }, [formData.levelUpHpIncrease]);

  useEffect(() => {
    const disabled = typeof hpIncrease !== "number" || !Number.isFinite(hpIncrease) || hpIncrease < 0;
    onNextDisabledChange?.(disabled);
  }, [hpIncrease, onNextDisabledChange]);

  const applyAverage = () => {
    updateFormData({ 
        levelUpHpMode: "AVERAGE",
        levelUpHpIncrease: avg 
    });
  };

  const applyRandom = () => {
    const roll = Math.floor(Math.random() * hitDie) + 1;
    updateFormData({ 
        levelUpHpMode: "RANDOM",
        levelUpHpIncrease: roll 
    });
  };

  const enableManual = () => {
    updateFormData({ 
      levelUpHpMode: "MANUAL",
      levelUpHpManualInput: formData.levelUpHpManualInput || (typeof hpIncrease === 'number' ? String(hpIncrease) : "")
    });
    queueMicrotask(() => inputRef.current?.focus());
  };

  // If user is in AVERAGE mode, keep value synced when hitdie might change (unlikely here but good for consistency)
  useEffect(() => {
    if (mode === "AVERAGE" && hpIncrease !== avg) {
        updateFormData({ levelUpHpIncrease: avg });
    }
  }, [avg, mode, hpIncrease, updateFormData]);

  useEffect(() => {
    // Initialize default once.
    if (formData.levelUpHpMode) return;
    applyAverage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const oldConMod = useMemo(() => getAbilityMod(baseStats.con), [baseStats.con]);
  const newConMod = conMod;
  const conModDiff = newConMod - oldConMod;
  const retroactiveConHp = conModDiff > 0 ? conModDiff * (nextLevel - 1) : 0;

  const totalIncrease = typeof hpIncrease === "number" ? hpIncrease + newConMod + toughBonus + retroactiveConHp : null;

  return (
    <form id={formId} className="space-y-4">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Здоровʼя (HP)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-white/15 bg-white/5 text-slate-100">
              d{hitDie}
            </Badge>
            <Badge variant="outline" className="border-white/15 bg-white/5 text-slate-100">
              Середнє: {avg}
            </Badge>
            <Badge variant="outline" className="border-white/15 bg-white/5 text-slate-100">
              Мод. Статури: {conMod >= 0 ? `+${conMod}` : conMod}
            </Badge>
            {toughBonus > 0 && (
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                За рису Здоровань: +{toughBonus}
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">Параметр Кидка (Кістка хітів)</label>
            <Input
              ref={inputRef}
              type="number"
              inputMode="numeric"
              min={0}
              value={mode === "MANUAL" ? hpInput : typeof hpIncrease === "number" ? String(hpIncrease) : ""}
              onChange={(e) => {
                const next = e.target.value;
                const val = next.trim() === "" ? undefined : Number(next);
                updateFormData({ 
                    levelUpHpMode: "MANUAL",
                    levelUpHpManualInput: next,
                    levelUpHpIncrease: (val !== undefined && Number.isFinite(val)) ? val : undefined
                });
              }}
              className="border-white/10 bg-white/5 text-white focus-visible:ring-arcane-400/30"
            />
            <div className="mt-2 flex items-center justify-between rounded-lg bg-white/5 p-3 text-sm">
                <span className="text-slate-400">Разом приріст:</span>
                <span className="font-bold text-cyan-400 text-lg">
                    {totalIncrease !== null ? `+${totalIncrease}` : "?"}
                </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className={
                "border-white/15 bg-white/5 text-slate-200 hover:bg-white/7 hover:text-white " +
                (mode === "AVERAGE" ? "border-gradient-rpg border-gradient-rpg-active glass-active text-slate-100" : "")
              }
              onClick={applyAverage}
            >
              Середнє
            </Button>
            <Button
              type="button"
              variant="outline"
              className={
                "border-white/15 bg-white/5 text-slate-200 hover:bg-white/7 hover:text-white " +
                (mode === "RANDOM" ? "border-gradient-rpg border-gradient-rpg-active glass-active text-slate-100" : "")
              }
              onClick={applyRandom}
            >
              Рандом
            </Button>
            <Button
              type="button"
              variant="outline"
              className={
                "border-white/15 bg-white/5 text-slate-200 hover:bg-white/7 hover:text-white " +
                (mode === "MANUAL" ? "border-gradient-rpg border-gradient-rpg-active glass-active text-slate-100" : "")
              }
              onClick={enableManual}
            >
              Ручне введення
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
