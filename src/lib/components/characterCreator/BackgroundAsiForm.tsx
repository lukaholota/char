"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { backgroundTranslations } from "@/lib/refs/translation";
import type { BackgroundCategory } from "@prisma/client";
import { Check } from "lucide-react";
import type { BackgroundAsiDraft, BackgroundAsiMode, BackgroundAsiStep } from "@/rules/background-asi";
import {
  startBackgroundAsiDraft,
  sumBackgroundAsiBonuses,
  toggleBackgroundAsiSpread,
} from "@/rules/background-asi";
import type { AbilityKey } from "@/rules/types";

export interface BackgroundAsiFormProps {
  step: BackgroundAsiStep;
  background?: { name: BackgroundCategory; abilityOptions?: string[] | null } | null;
  draft: BackgroundAsiDraft | null;
  onChange: (draft: BackgroundAsiDraft) => void;
}

const ABILITY_LABELS: Record<AbilityKey, string> = {
  STR: "Сила",
  DEX: "Спритність",
  CON: "Статура",
  INT: "Інтелект",
  WIS: "Мудрість",
  CHA: "Харизма",
};

const MODE_LABELS: Record<BackgroundAsiMode, string> = {
  "+2/+1": "+2 і +1",
  "+1/+1/+1": "+1 до всіх трьох",
};

export function BackgroundAsiForm({ step, background, draft, onChange }: BackgroundAsiFormProps) {
  const mode = draft?.mode ?? "+2/+1";
  const bonuses = sumBackgroundAsiBonuses(draft);
  const backgroundName = background ? backgroundTranslations[background.name] ?? background.name : "походження";

  return (
    <CardContent className="space-y-4" data-testid="background-asi">
      <div>
        <p className="text-sm font-semibold text-white">Бонуси походження «{backgroundName}»</p>
        <p className="text-xs text-slate-400">
          У правилах 2024 бонуси до характеристик дає походження, а не вид. Розподіліть три очки між
          трьома дозволеними характеристиками.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {step.modes.map((candidate) => (
          <Button
            key={candidate}
            type="button"
            variant={candidate === mode ? "secondary" : "outline"}
            className="border-white/15 bg-white/5 text-slate-200"
            aria-pressed={candidate === mode}
            onClick={() => onChange(startBackgroundAsiDraft(candidate, step.allowedAbilities))}
          >
            {MODE_LABELS[candidate]}
          </Button>
        ))}
      </div>

      {draft?.mode === "+1/+1/+1" ? (
        <AbilityPicker
          title="По +1 кожній із трьох"
          abilities={step.allowedAbilities}
          selected={draft.abilities}
          onPick={(ability) => onChange(toggleBackgroundAsiSpread(draft, ability))}
        />
      ) : (
        <>
          <AbilityPicker
            title="Кому +2"
            abilities={step.allowedAbilities}
            selected={draft?.mode === "+2/+1" && draft.plusTwo ? [draft.plusTwo] : []}
            onPick={(ability) => onChange(pickPlusTwo(draft, ability))}
          />
          <AbilityPicker
            title="Кому +1"
            abilities={step.allowedAbilities}
            selected={draft?.mode === "+2/+1" && draft.plusOne ? [draft.plusOne] : []}
            onPick={(ability) => onChange(pickPlusOne(draft, ability))}
          />
        </>
      )}

      <div className="flex flex-wrap gap-2" data-testid="background-asi-summary">
        {step.allowedAbilities.map((ability) => (
          <Badge key={ability} variant="outline" className="border-white/15 bg-white/5 text-slate-100">
            {ABILITY_LABELS[ability]} +{bonuses[ability] ?? 0}
          </Badge>
        ))}
      </div>
    </CardContent>
  );
}

function AbilityPicker({
  title,
  abilities,
  selected,
  onPick,
}: {
  title: string;
  abilities: AbilityKey[];
  selected: AbilityKey[];
  onPick: (ability: AbilityKey) => void;
}) {
  return (
    <div className="glass-panel border-gradient-rpg rounded-xl p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {abilities.map((ability) => {
          const isSelected = selected.includes(ability);
          return (
            <Button
              key={ability}
              type="button"
              variant={isSelected ? "secondary" : "outline"}
              aria-pressed={isSelected}
              className={`justify-between border-white/15 bg-white/5 text-slate-200 ${isSelected ? "border-gradient-rpg-active glass-active text-slate-100" : ""}`}
              onClick={() => onPick(ability)}
            >
              <span className="text-sm">{ABILITY_LABELS[ability]}</span>
              {isSelected && <Check className="h-4 w-4" />}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function pickPlusTwo(draft: BackgroundAsiDraft | null, ability: AbilityKey): BackgroundAsiDraft {
  const plusOne = draft?.mode === "+2/+1" ? draft.plusOne : undefined;
  return { mode: "+2/+1", plusTwo: ability, plusOne: plusOne === ability ? undefined : plusOne };
}

function pickPlusOne(draft: BackgroundAsiDraft | null, ability: AbilityKey): BackgroundAsiDraft {
  const plusTwo = draft?.mode === "+2/+1" ? draft.plusTwo : undefined;
  return { mode: "+2/+1", plusTwo: plusTwo === ability ? undefined : plusTwo, plusOne: ability };
}

export default BackgroundAsiForm;
