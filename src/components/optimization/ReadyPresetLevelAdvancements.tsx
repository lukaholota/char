"use client";

import {
  ADVANCEMENT_ABILITIES, findEffectiveAdvancement, isAbilityRaisable, listAbilityScoresBeforeLevel, listFeatKeysBeforeLevel, listOpenAdvancementSteps, buildAdvancementKey,
  type AdvancementAbility, type AdvancementChoice, type FeatPoolEntry,
} from "@/lib/optimization/ready-preset-advancements";
import { describeAdvancementChoice } from "@/lib/optimization/ready-preset-advancement-text";
import { ABILITY_LABELS, type AssemblyChoiceContext, type LevelStep } from "@/lib/optimization/ready-preset-levels";
import type { ReadyPresetAssembly } from "@/lib/optimization/use-ready-preset-assembly";

import { PresetOptionPicker } from "./PresetOptionPicker";

type AdvancementProps = { assembly: ReadyPresetAssembly; context: AssemblyChoiceContext };

export function ReadyPresetLevelAdvancements({ assembly, context, characterLevel }: AdvancementProps & { characterLevel?: number }) {
  const steps = listOpenAdvancementSteps(context.levels, context.targetLevel).filter((step) => !characterLevel || step.characterLevel === characterLevel);
  if (!steps.length) return null;
  return <div className="mt-5 space-y-5">
    {steps.map((step) => <AdvancementGroup key={step.characterLevel} step={step} assembly={assembly} context={context} />)}
  </div>;
}

function AdvancementGroup({ step, assembly, context }: AdvancementProps & { step: LevelStep }) {
  const choice = findEffectiveAdvancement(step, context.advancements)!;
  const isChosen = context.advancements[buildAdvancementKey(step.characterLevel)] !== undefined;
  const pool = context.levels.featPool;
  const defaultFeat = step.advancement!.defaultFeat;
  const change = (next: AdvancementChoice) => assembly.chooseAdvancement(step.characterLevel, next);
  return <fieldset>
    <legend className="text-sm text-slate-300">Риса або підвищення характеристик · {step.characterLevel}-й рівень, {step.className} <span className="ml-1 rounded-md bg-amber-400/10 px-2 py-0.5 text-xs text-amber-200">{isChosen ? "ваш вибір" : "вибір платформи: автор цього не називає"}</span></legend>
    <p className="mt-1 text-sm text-slate-400">Типово: {describeAdvancementChoice(step.advancement!.default, pool, defaultFeat)}.</p>
    <PresetOptionPicker label={`Що взяти на ${step.characterLevel}-му рівні`} selected={choice.kind} options={[{ value: "asi", label: "Підвищення характеристик" }, { value: "feat", label: "Риса" }]} onChange={(kind) => change(kind === "asi" ? suggestIncrease(step, context) : suggestFeat(step, context))} />
    {choice.kind === "asi" ? <IncreasePicker step={step} choice={choice} context={context} onChange={change} /> : <FeatPicker step={step} choice={choice} context={context} onChange={change} />}
  </fieldset>;
}

function IncreasePicker({ step, choice, context, onChange }: { step: LevelStep; choice: Extract<AdvancementChoice, { kind: "asi" }>; context: AssemblyChoiceContext; onChange: (next: AdvancementChoice) => void }) {
  const scores = listAbilityScoresBeforeLevel(context, step.characterLevel);
  const slots = [0, 1] as const;
  return <div className="mt-3 grid gap-3 sm:grid-cols-2">{slots.map((slot) => {
    const other = choice.abilities[1 - slot];
    return <PresetOptionPicker key={slot} label={slot === 0 ? "Перша характеристика (+1)" : "Друга характеристика (+1)"} selected={choice.abilities[slot]}
      options={ADVANCEMENT_ABILITIES.map((ability) => ({ value: ability, label: `${ABILITY_LABELS[ability]} · ${scores[ability]}`, disabled: !isAbilityRaisable(scores, ability, ability === other ? 2 : 1) }))}
      onChange={(ability) => onChange({ kind: "asi", abilities: replaceAbility(choice.abilities, slot, ability as AdvancementAbility) })} />;
  })}</div>;
}

function FeatPicker({ step, choice, context, onChange }: { step: LevelStep; choice: Extract<AdvancementChoice, { kind: "feat" }>; context: AssemblyChoiceContext; onChange: (next: AdvancementChoice) => void }) {
  const candidates = listFeatCandidates(step, context, choice.featKey);
  const selected = candidates.find((feat) => feat.key === choice.featKey);
  return <div className="mt-3 grid gap-3 sm:grid-cols-2">
    <PresetOptionPicker label="Риса" selected={choice.featKey} options={candidates.map((feat) => ({ value: feat.key, label: feat.name }))} onChange={(key) => onChange(buildFeatChoice(candidates.find((feat) => feat.key === key)!))} />
    {selected?.options.length ? <PresetOptionPicker label={selected.optionGroupLabel ? capitalize(selected.optionGroupLabel) : "Варіант"} selected={choice.optionNameEng ?? ""}
      options={selected.options.map((option) => ({ value: option.nameEng, label: option.name }))} onChange={(optionNameEng) => onChange({ kind: "feat", featKey: choice.featKey, optionNameEng })} /> : null}
  </div>;
}

function suggestIncrease(step: LevelStep, context: AssemblyChoiceContext): AdvancementChoice {
  const standard = step.advancement!.default;
  if (standard.kind === "asi") return standard;
  const scores = listAbilityScoresBeforeLevel(context, step.characterLevel);
  const ranked = [...ADVANCEMENT_ABILITIES].sort((first, second) => scores[second] - scores[first]);
  const doubled = ranked.find((ability) => isAbilityRaisable(scores, ability, 2));
  if (doubled) return { kind: "asi", abilities: [doubled, doubled] };
  const [first, second] = ranked.filter((ability) => isAbilityRaisable(scores, ability, 1));
  return { kind: "asi", abilities: [first ?? ranked[0], second ?? first ?? ranked[0]] };
}

function suggestFeat(step: LevelStep, context: AssemblyChoiceContext): AdvancementChoice {
  const standard = step.advancement!.default;
  if (standard.kind === "feat") return standard;
  const candidates = listFeatCandidates(step, context, "");
  return buildFeatChoice(candidates.find((feat) => feat.key === "LUCKY") ?? candidates[0]);
}

function listFeatCandidates(step: LevelStep, context: AssemblyChoiceContext, currentKey: string): FeatPoolEntry[] {
  const owned = new Set(listFeatKeysBeforeLevel(context, step.characterLevel));
  const defaultFeat = step.advancement!.defaultFeat;
  const pool = defaultFeat && !context.levels.featPool.some((feat) => feat.key === defaultFeat.key) ? [...context.levels.featPool, defaultFeat] : context.levels.featPool;
  return pool.filter((feat) => feat.key === currentKey || !owned.has(feat.key));
}

function buildFeatChoice(feat: FeatPoolEntry): AdvancementChoice {
  return { kind: "feat", featKey: feat.key, optionNameEng: feat.options[0]?.nameEng ?? null };
}

function replaceAbility(abilities: [AdvancementAbility, AdvancementAbility], slot: 0 | 1, ability: AdvancementAbility): [AdvancementAbility, AdvancementAbility] {
  return slot === 0 ? [ability, abilities[1]] : [abilities[0], ability];
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
