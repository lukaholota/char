"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Ability } from "@prisma/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

import { usePersFormStore } from "@/lib/stores/persFormStore";
import FeatsForm from "@/lib/components/characterCreator/FeatsForm";
import type { FeatPrisma, RaceI } from "@/lib/types/model-types";
import { attributesUkrShort } from "@/lib/refs/translation";
import { Subrace, RaceVariant } from "@prisma/client";

interface Props {
  feats: FeatPrisma[];
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
  race: RaceI;
  subrace?: Subrace | null;
  raceVariant?: RaceVariant | null;
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

export default function LevelUpASIForm({ feats, formId, onNextDisabledChange, race, subrace, raceVariant }: Props) {
  const { updateFormData, formData } = usePersFormStore();
  const [choiceType, setChoiceType] = useState<ChoiceType>("ASI");
  const [featFormDisabled, setFeatFormDisabled] = useState(true);
  const prevDisabledRef = useRef<boolean | undefined>(undefined);

  const asiMap = useMemo(() => normalizeAsi(formData.customAsi), [formData.customAsi]);
  const totalAsi = useMemo(
    () => Object.values(asiMap).reduce<number>((acc, val) => acc + (val ?? 0), 0),
    [asiMap]
  );

  useEffect(() => {
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
  }, [choiceType, updateFormData]);

  useEffect(() => {
    const asiValid = choiceType === "ASI" ? totalAsi === 2 : true;
    const featValid = choiceType === "FEAT" ? !featFormDisabled : true;

    const disabled = !(asiValid && featValid);

    if (prevDisabledRef.current !== disabled) {
      prevDisabledRef.current = disabled;
      onNextDisabledChange?.(disabled);
    }
  }, [choiceType, totalAsi, featFormDisabled, onNextDisabledChange]);

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
            onClick={() => setChoiceType("ASI")}
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
            onClick={() => setChoiceType("FEAT")}
          >
            Взяти рису (Feat)
          </Button>
        </CardContent>
      </Card>

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

                return (
                  <div
                    key={ability}
                    className="glass-panel border-gradient-rpg flex items-center justify-between gap-3 rounded-xl p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{attr}</p>
                      <p className="text-xs text-slate-400">{ability}</p>
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
                        +1 {current === 1 ? <Check className="ml-2 h-4 w-4" /> : null}
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
                        +2 {current === 2 ? <Check className="ml-2 h-4 w-4" /> : null}
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
          />
        </div>
      )}
    </div>
  );
}
