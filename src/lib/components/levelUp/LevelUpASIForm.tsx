"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Ability } from "@prisma/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

import { usePersFormStore } from "@/lib/stores/persFormStore";
import FeatsForm from "@/lib/components/characterCreator/FeatsForm";
import FeatChoiceOptionsForm from "@/lib/components/characterCreator/FeatChoiceOptionsForm";
import type { FeatPrisma, RaceI } from "@/lib/types/model-types";
import type { PersPrisma } from "@/lib/types/model-types";
import { attributesUkrShort } from "@/lib/refs/translation";
import { findAbilityScoreCeiling, raiseAbilityScore } from "@/rules/ability-score-ceiling";
import { Subrace, RaceVariant } from "@prisma/client";
import { Races } from "@prisma/client";

interface Props {
  feats: FeatPrisma[];
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
  race: RaceI;
  subrace?: Subrace | null;
  raceVariant?: RaceVariant | null;
  pers?: PersPrisma;

  /**
   * When true (default), renders feat choice options inline on the same screen.
   * For level-up wizard parity with character creation, this can be set to false
   * and rendered as a separate step.
   */
  renderFeatChoicesInline?: boolean;

  levelAfter?: number;
  /** Епічний дар дає рису й тільки рису: альтернативи «+2 до характеристики» на 19-му немає. */
  allowAbilityScoreIncrease?: boolean;
  baseStats?: Record<Ability, number>;
  hasSpellcasting?: boolean;
  raceName?: Races;
}

type ChoiceType = "ASI" | "FEAT";
type AsiMap = Partial<Record<Ability, 0 | 1 | 2>>;

const ABILITIES = Object.values(Ability);

const normalizeAsi = (customAsi: unknown): AsiMap => {
  const map: AsiMap = {};
  if (!Array.isArray(customAsi)) return map;
  for (const entry of customAsi as Array<{ ability?: string; value?: string }>) {
    const ability = entry?.ability as Ability | undefined;
    const value = Number(entry?.value);
    if (!ability || !ABILITIES.includes(ability)) continue;
    if (!Number.isFinite(value) || (value !== 1 && value !== 2)) continue;
    map[ability] = value as 1 | 2;
  }
  return map;
};

const toCustomAsi = (asi: AsiMap) => {
  return Object.entries(asi)
    .filter(([, value]) => value && value > 0)
    .map(([ability, value]) => ({ ability, value: String(value) }));
};

const abilityToPersKey: Record<Ability, "str" | "dex" | "con" | "int" | "wis" | "cha"> = {
  STR: "str",
  DEX: "dex",
  CON: "con",
  INT: "int",
  WIS: "wis",
  CHA: "cha",
};

export default function LevelUpASIForm({
  feats,
  formId,
  onNextDisabledChange,
  race,
  subrace,
  raceVariant,
  pers,
  renderFeatChoicesInline = true,
  levelAfter,
  baseStats,
  hasSpellcasting,
  raceName,
  allowAbilityScoreIncrease = true,
}: Props) {
  const { updateFormData, formData } = usePersFormStore();
  const storedChoiceType = (formData as any)?.levelUpAsiChoiceType as ChoiceType | undefined;
  const inferredChoiceType: ChoiceType = storedChoiceType
    ? storedChoiceType
    : (formData as any)?.featId
      ? "FEAT"
      : "ASI";
  const [choiceType, setChoiceType] = useState<ChoiceType>(allowAbilityScoreIncrease ? inferredChoiceType : "FEAT");
  const userChangedRef = useRef(false);
  const [featFormDisabled, setFeatFormDisabled] = useState(true);
  const [featOptionsDisabled, setFeatOptionsDisabled] = useState(true);
  const prevDisabledRef = useRef<boolean | undefined>(undefined);

  const asiMap = useMemo(() => normalizeAsi(formData.customAsi), [formData.customAsi]);
  const totalAsi = useMemo(
    () => Object.values(asiMap).reduce<number>((acc, val) => acc + (val ?? 0), 0),
    [asiMap]
  );

  useEffect(() => {
    if (!storedChoiceType) {
      userChangedRef.current = false;
    }
  }, [storedChoiceType]);

  useEffect(() => {
    if (!allowAbilityScoreIncrease) {
      if (choiceType !== "FEAT") setChoiceType("FEAT");
      updateFormData({ levelUpAsiChoiceType: "FEAT", customAsi: [] } as never);
      return;
    }

    // Sync local tab with store when it comes from persisted state.
    if (storedChoiceType && storedChoiceType !== choiceType && !userChangedRef.current) {
      setChoiceType(storedChoiceType);
      return;
    }

    updateFormData({ levelUpAsiChoiceType: choiceType } as any);

    // Keep store coherent when switching mode.
    if (choiceType === "ASI") {
      updateFormData({
        featId: undefined,
        featChoiceSelections: {},
      });
    } else {
      updateFormData({
        customAsi: [],
      });
    }
  }, [choiceType, storedChoiceType, updateFormData, allowAbilityScoreIncrease]);

  useEffect(() => {
    const asiValid = choiceType === "ASI" ? totalAsi === 2 : true;
    const featValid = choiceType === "FEAT"
      ? (!featFormDisabled && (renderFeatChoicesInline ? !featOptionsDisabled : true))
      : true;

    const disabled = !(asiValid && featValid);

    if (prevDisabledRef.current !== disabled) {
      prevDisabledRef.current = disabled;
      onNextDisabledChange?.(disabled);
    }
  }, [choiceType, totalAsi, featFormDisabled, featOptionsDisabled, renderFeatChoicesInline, onNextDisabledChange]);

  const selectedFeatId = useMemo(() => {
    const raw = (formData as { featId?: unknown }).featId;
    const id = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
    return Number.isFinite(id) ? id : undefined;
  }, [formData]);

  const selectedFeat = useMemo(() => {
    if (!selectedFeatId) return undefined;
    return feats.find((f) => f.featId === selectedFeatId);
  }, [feats, selectedFeatId]);

  const selectedFeatHasChoices = useMemo(() => {
    const choiceCount = (selectedFeat as any)?.featChoiceOptions?.length ?? 0;
    return choiceCount > 0;
  }, [selectedFeat]);

  useEffect(() => {
    // If selected feat doesn't require choice options, don't block progression.
    if (choiceType !== "FEAT") return;
    if (!selectedFeatId) {
      setFeatOptionsDisabled(true);
      return;
    }
    if (!selectedFeatHasChoices || !renderFeatChoicesInline) {
      setFeatOptionsDisabled(false);
    } else {
      // Will be controlled by FeatChoiceOptionsForm via onNextDisabledChange.
      setFeatOptionsDisabled(true);
    }
  }, [choiceType, selectedFeatHasChoices, selectedFeatId, renderFeatChoicesInline]);

  const setAsiValue = (ability: Ability, value: 1 | 2) => {
    const current = asiMap[ability] ?? 0;
    const currentTotal = totalAsi;

    // Toggle off.
    if (current === value) {
      const next: AsiMap = { ...asiMap, [ability]: 0 };
      updateFormData({ customAsi: toCustomAsi(next) as any });
      return;
    }

    // If user sets +2, clear others (DnD: either +2 or +1/+1).
    if (value === 2) {
      const next: AsiMap = { [ability]: 2 };
      updateFormData({ customAsi: toCustomAsi(next) as any });
      return;
    }

    // value === 1
    if (currentTotal >= 2 && current === 0) return;

    // If currently +2 on this ability, downgrade to +1.
    const next: AsiMap = { ...asiMap };
    next[ability] = 1;

    // If there is another +2 elsewhere, downgrade that to 0.
    for (const a of ABILITIES) {
      if (a !== ability && (next[a] ?? 0) === 2) next[a] = 0;
    }

    // Enforce total <= 2
    const nextTotal = Object.values(next).reduce<number>((acc, v) => acc + (v ?? 0), 0);
    if (nextTotal > 2) return;

    updateFormData({ customAsi: toCustomAsi(next) as any });
  };

  const getBaseScore = (ability: Ability): number => {
    const fromBaseStats = baseStats?.[ability];
    if (typeof fromBaseStats === "number" && Number.isFinite(fromBaseStats)) return fromBaseStats;

    const key = abilityToPersKey[ability];
    const p: any = pers;
    const fromPers = p && typeof p[key] === "number" ? p[key] : undefined;
    if (typeof fromPers === "number" && Number.isFinite(fromPers)) return fromPers;

    return 0;
  };

  // Класовий ASI не є епічним даром за жодних умов, тому стеля тут завжди звичайна.
  const standardCeiling = findAbilityScoreCeiling({
    ruleset: pers?.ruleset,
    source: "STANDARD",
  });

  const isDisabledButton = (ability: Ability, value: 1 | 2) => {
    if (choiceType !== "ASI") return true;
    const current = asiMap[ability] ?? 0;
    if (current === value) return false;
    if (value === 2) {
      // Allow switching to +2 any time.
      return false;
    }
    // value === 1
    return totalAsi >= 2 && current === 0;
  };

  return (
    <div className="space-y-4">
      {allowAbilityScoreIncrease ? (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Покращення</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className={
              "border-white/15 bg-white/5 text-slate-200 hover:bg-white/7 hover:text-white " +
              (choiceType === "ASI" ? "border-gradient-rpg border-gradient-rpg-active glass-active text-slate-100" : "")
            }
            onClick={() => {
              userChangedRef.current = true;
              setChoiceType("ASI");
            }}
          >
            Збільшити характеристики
          </Button>
          <Button
            type="button"
            variant="outline"
            className={
              "border-white/15 bg-white/5 text-slate-200 hover:bg-white/7 hover:text-white " +
              (choiceType === "FEAT" ? "border-gradient-rpg border-gradient-rpg-active glass-active text-slate-100" : "")
            }
            onClick={() => {
              userChangedRef.current = true;
              setChoiceType("FEAT");
            }}
          >
            Взяти рису (Feat)
          </Button>
        </CardContent>
      </Card>
      ) : null}

      {choiceType === "ASI" ? (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Розподіл (+2 або +1/+1)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-300">
                Розподіліть <span className="font-semibold text-slate-100">2</span> пункти.
              </p>
              <Badge variant="outline" className="border-white/15 bg-white/5 text-slate-100">
                Обрано: {totalAsi}/2
              </Badge>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {ABILITIES.map((ability) => {
                const attr = attributesUkrShort[ability];
                const current = asiMap[ability] ?? 0;
                const base = getBaseScore(ability);
                const plus1 = raiseAbilityScore(base, 1, standardCeiling);
                const plus2 = raiseAbilityScore(base, 2, standardCeiling);
                const after = raiseAbilityScore(base, current || 0, standardCeiling);

                return (
                  <div
                    key={ability}
                    className="glass-panel border-gradient-rpg flex items-center justify-between gap-3 rounded-xl p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{attr}</p>
                      <p className="text-xs text-slate-400">{ability}</p>
                      <p className="mt-0.5 text-xs text-slate-300">
                        Зараз: <span className="font-semibold text-slate-100">{base}</span>
                        {current ? (
                          <>
                            {" "}→ <span className="font-semibold text-slate-100">{after}</span>
                          </>
                        ) : null}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant={current === 1 ? "secondary" : "outline"}
                        size="sm"
                        className={
                          "border-white/15 bg-white/5 text-slate-200 hover:bg-white/7 hover:text-white " +
                          (current === 1 ? "border-gradient-rpg border-gradient-rpg-active glass-active text-slate-100" : "")
                        }
                        disabled={isDisabledButton(ability, 1)}
                        onClick={() => setAsiValue(ability, 1)}
                      >
                        +1 → {plus1} {current === 1 ? <Check className="ml-2 h-4 w-4" /> : null}
                      </Button>

                      <Button
                        type="button"
                        variant={current === 2 ? "secondary" : "outline"}
                        size="sm"
                        className={
                          "border-white/15 bg-white/5 text-slate-200 hover:bg-white/7 hover:text-white " +
                          (current === 2 ? "border-gradient-rpg border-gradient-rpg-active glass-active text-slate-100" : "")
                        }
                        disabled={isDisabledButton(ability, 2)}
                        onClick={() => setAsiValue(ability, 2)}
                      >
                        +2 → {plus2} {current === 2 ? <Check className="ml-2 h-4 w-4" /> : null}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <FeatsForm 
            feats={feats as any} 
            formId={`${formId}-feat`} 
            onNextDisabledChange={setFeatFormDisabled} 
            race={race}
            subrace={subrace ?? undefined}
            raceVariant={raceVariant}
            pers={pers as any}
            prereqContext={{
              level: levelAfter,
              stats: baseStats,
              hasSpellcasting: Boolean(hasSpellcasting),
              race: raceName,
            }}
          />

          {renderFeatChoicesInline && selectedFeat && selectedFeatHasChoices ? (
            <FeatChoiceOptionsForm
              selectedFeat={selectedFeat as any}
              formId={`${formId}-feat-choices`}
              onNextDisabledChange={setFeatOptionsDisabled}
              pers={pers as any}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
