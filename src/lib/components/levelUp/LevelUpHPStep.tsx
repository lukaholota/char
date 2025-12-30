"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { usePersFormStore } from "@/lib/stores/persFormStore";
import type { FeatPrisma } from "@/lib/types/model-types";

type Mode = "AVERAGE" | "RANDOM" | "MANUAL";

interface Props {
  hitDie: number; // e.g. 10 for d10
  baseStats: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  feats: FeatPrisma[];
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
}

const averageHitDie = (hitDie: number) => Math.floor(hitDie / 2) + 1;

const getAbilityMod = (score: number) => Math.floor((score - 10) / 2);

const applyAsiFromStore = (
  base: Props["baseStats"],
  customAsi: unknown
): Props["baseStats"] => {
  const next = { ...base };
  if (!Array.isArray(customAsi)) return next;

  for (const entry of customAsi as Array<{ ability?: string; value?: string }>) {
    const ability = entry?.ability;
    const val = Number(entry?.value);
    if (!ability || !Number.isFinite(val) || val === 0) continue;

    const key = ability.toLowerCase() as keyof Props["baseStats"];
    if (key in next) {
      next[key] = next[key] + val;
    }
  }

  return next;
};

const applyFeatAsi = (
  stats: Props["baseStats"],
  feat?: FeatPrisma | null
): Props["baseStats"] => {
  if (!feat?.grantedASI) return stats;

  const next = { ...stats };
  const featASI = feat.grantedASI as any;
  const simple = featASI?.basic?.simple;
  if (simple && typeof simple === "object") {
    Object.entries(simple).forEach(([ability, bonus]) => {
      const key = ability.toLowerCase() as keyof Props["baseStats"];
      const val = Number(bonus);
      if (key in next && Number.isFinite(val)) {
        next[key] = next[key] + val;
      }
    });
  }

  return next;
};

export default function LevelUpHPStep({
  hitDie,
  baseStats,
  feats,
  formId,
  onNextDisabledChange,
}: Props) {
  const { formData, updateFormData } = usePersFormStore();
  const [mode, setMode] = useState<Mode>("AVERAGE");
  const [hpInput, setHpInput] = useState<string>("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectedFeat = useMemo(() => {
    const id = formData.featId ? Number(formData.featId) : undefined;
    if (!id) return null;
    return feats.find((f) => f.featId === id) ?? null;
  }, [feats, formData.featId]);

  const effectiveStats = useMemo(() => {
    const withAsi = applyAsiFromStore(baseStats, formData.customAsi);
    return applyFeatAsi(withAsi, selectedFeat);
  }, [baseStats, formData.customAsi, selectedFeat]);

  const conMod = useMemo(() => getAbilityMod(effectiveStats.con), [effectiveStats.con]);
  const avg = useMemo(() => averageHitDie(hitDie), [hitDie]);

  const hpIncrease = useMemo(() => {
    const raw = formData.levelUpHpIncrease;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    return undefined;
  }, [formData.levelUpHpIncrease]);

  useEffect(() => {
    // Keep input in sync when value is set programmatically (average/random).
    // Do not override while user is actively typing unless value is cleared.
    if (typeof hpIncrease === "number") {
      setHpInput(String(hpIncrease));
    } else if (hpIncrease === undefined && mode === "MANUAL") {
      setHpInput("");
    }
  }, [hpIncrease, mode]);

  useEffect(() => {
    const disabled = typeof hpIncrease !== "number" || !Number.isFinite(hpIncrease) || hpIncrease < 0 || hpIncrease > 1000;
    onNextDisabledChange?.(disabled);
  }, [hpIncrease, onNextDisabledChange]);

  const setHpIncrease = (value: number) => {
    const safe = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    updateFormData({ levelUpHpIncrease: safe });
  };

  const clearHpIncrease = () => {
    updateFormData({ levelUpHpIncrease: undefined });
  };

  const applyAverage = () => {
    setMode("AVERAGE");
    setHpIncrease(avg + conMod);
  };

  const applyRandom = () => {
    setMode("RANDOM");
    const roll = Math.floor(Math.random() * hitDie) + 1;
    setHpIncrease(roll + conMod);
  };

  const enableManual = () => {
    setMode("MANUAL");
    queueMicrotask(() => inputRef.current?.focus());
  };

  // If user is in AVERAGE mode, keep value synced when CON changes (ASI/feat from previous step).
  useEffect(() => {
    if (mode !== "AVERAGE") return;
    applyAverage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conMod, avg, mode]);

  useEffect(() => {
    // Initialize default once.
    if (typeof hpIncrease === "number") return;
    applyAverage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">Приріст HP за рівень</label>
            <Input
              ref={inputRef}
              type="number"
              inputMode="numeric"
              min={0}
              value={mode === "MANUAL" ? hpInput : typeof hpIncrease === "number" ? String(hpIncrease) : ""}
              onChange={(e) => {
                setMode("MANUAL");
                const next = e.target.value;
                setHpInput(next);
                if (next.trim() === "") {
                  clearHpIncrease();
                  return;
                }
                const val = Number(next);
                if (!Number.isFinite(val)) {
                  clearHpIncrease();
                  return;
                }
                setHpIncrease(val);
              }}
              className="border-white/10 bg-white/5 text-white focus-visible:ring-cyan-400/30"
            />
            <p className="text-xs text-slate-400">
              Статура враховується автоматично й оновлюється після ASI/риси.
            </p>
            {typeof hpIncrease === "number" && hpIncrease > 1000 && (
              <p className="text-xs text-red-500 font-semibold animate-pulse">
                Максимально допустимий приріст — 1000 HP
              </p>
            )}
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
