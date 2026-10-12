"use client";

import { buildOptionKey, listEffectiveOptionNames, listOpenOptionSteps, listOptionCandidates, type ClassOptionPoolEntry } from "@/lib/optimization/ready-preset-class-options";
import type { AssemblyChoiceContext, LevelStep } from "@/lib/optimization/ready-preset-levels";
import type { ReadyPresetAssembly } from "@/lib/optimization/use-ready-preset-assembly";

import { PresetOptionPicker } from "./PresetOptionPicker";

type ClassOptionProps = { assembly: ReadyPresetAssembly; context: AssemblyChoiceContext };

export function ReadyPresetLevelClassOptions({ assembly, context, characterLevel }: ClassOptionProps & { characterLevel?: number }) {
  const steps = listOpenOptionSteps(context.levels, context.targetLevel).filter((step) => !characterLevel || step.characterLevel === characterLevel);
  if (!steps.length) return null;
  return <div className="mt-5 space-y-5">
    {steps.map((step) => <ClassOptionGroup key={step.characterLevel} step={step} assembly={assembly} context={context} />)}
  </div>;
}

function listOptionsWithCurrent(context: AssemblyChoiceContext, step: LevelStep, position: number, currentName: string): ClassOptionPoolEntry[] {
  const candidates = listOptionCandidates(context, step, position);
  const current = (context.levels.classOptionPools[step.classKey] ?? []).find((entry) => entry.nameEng === currentName);
  return current && !candidates.includes(current) ? [current, ...candidates] : candidates;
}

function ClassOptionGroup({ step, assembly, context }: ClassOptionProps & { step: LevelStep }) {
  const chosen = listEffectiveOptionNames(step, context.classOptionChoices);
  const isChosen = context.classOptionChoices[buildOptionKey(step.characterLevel)] !== undefined;
  const defaults = step.optionPick!.defaults;
  const pool = context.levels.classOptionPools[step.classKey] ?? [];
  const describe = (nameEng: string) => pool.find((entry) => entry.nameEng === nameEng)?.name ?? nameEng;
  return <fieldset>
    <legend className="text-sm text-slate-300">Вибір класу · {step.characterLevel}-й рівень, {step.className} <span className="ml-1 rounded-md bg-amber-400/10 px-2 py-0.5 text-xs text-amber-200">{isChosen ? "ваш вибір" : "вибір платформи: автор цього не називає"}</span></legend>
    <p className="mt-1 text-sm text-slate-400">Типово: {defaults.map((entry) => describe(entry.nameEng)).join(", ")}.</p>
    <div className="mt-4 space-y-5">{chosen.map((name, position) => <PresetOptionPicker key={position} label={`${defaults[position].groupName} · ${step.characterLevel}-й рівень · ${position + 1}`} selected={name}
      options={listOptionsWithCurrent(context, step, position, name).map((entry) => ({ value: entry.nameEng, label: entry.name }))}
      onChange={(value) => assembly.chooseClassOptions(step.characterLevel, chosen.map((current, index) => index === position ? value : current))} />)}</div>
  </fieldset>;
}
