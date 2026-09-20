"use client";

import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { backgroundTranslations } from "@/lib/refs/translation";
import type { BackgroundCategory } from "@prisma/client";
import { Check } from "lucide-react";
import type { BackgroundAsiDraft, BackgroundAsiMode, BackgroundAsiStep } from "@/rules/background-asi";
import {
  raiseScoresByBackgroundAsi,
  startBackgroundAsiDraft,
  toggleBackgroundAsiSpread,
} from "@/rules/background-asi";
import type { AbilityKey, AbilityScores } from "@/rules/types";

export interface BackgroundAsiFormProps {
  step: BackgroundAsiStep;
  background?: { name: BackgroundCategory; abilityOptions?: string[] | null } | null;
  draft: BackgroundAsiDraft | null;
  scoresBefore: AbilityScores;
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

export function BackgroundAsiForm({ step, background, draft, scoresBefore, onChange }: BackgroundAsiFormProps) {
  const mode = draft?.mode ?? "+2/+1";
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
          bonus={1}
          scoresBefore={scoresBefore}
          onPick={(ability) => onChange(toggleBackgroundAsiSpread(draft, ability))}
        />
      ) : (
        <>
          <AbilityPicker
            title="Кому +2"
            abilities={step.allowedAbilities}
            selected={draft?.mode === "+2/+1" && draft.plusTwo ? [draft.plusTwo] : []}
            bonus={2}
            scoresBefore={scoresBefore}
            onPick={(ability) => onChange(pickPlusTwo(draft, ability))}
          />
          <AbilityPicker
            title="Кому +1"
            abilities={step.allowedAbilities}
            selected={draft?.mode === "+2/+1" && draft.plusOne ? [draft.plusOne] : []}
            bonus={1}
            scoresBefore={scoresBefore}
            onPick={(ability) => onChange(pickPlusOne(draft, ability))}
          />
        </>
      )}
    </CardContent>
  );
}

function AbilityPicker({
  title,
  abilities,
  selected,
  bonus,
  scoresBefore,
  onPick,
}: {
  title: string;
  abilities: AbilityKey[];
  selected: AbilityKey[];
  bonus: number;
  scoresBefore: AbilityScores;
  onPick: (ability: AbilityKey) => void;
}) {
  return (
    <div className="glass-panel border-gradient-rpg rounded-xl p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {abilities.map((ability) => {
          const isSelected = selected.includes(ability);
          const scoresAfter = raiseScoresByBackgroundAsi(scoresBefore, { [ability]: bonus });
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
              <span className="flex items-center gap-2 text-sm tabular-nums text-slate-300">
                {formatScoreChange(scoresBefore[ability], scoresAfter[ability])}
                {isSelected && <Check className="h-4 w-4" />}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function formatScoreChange(before: number, after: number): string {
  if (!Number.isFinite(before)) return "—";
  return before === after ? String(before) : `${before} → ${after}`;
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
