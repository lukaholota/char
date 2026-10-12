"use client";

import {
  ABILITY_LABELS, OPEN_PICK_CATEGORIES, OPEN_PICK_LABELS, listStepsAfter, listStepsUpTo,
  type LevelSpell, type LevelStep, type ReadyPresetLevels,
} from "@/lib/optimization/ready-preset-levels";
import { findEffectiveAdvancement, type AdvancementChoices } from "@/lib/optimization/ready-preset-advancements";
import { listEffectiveOptionNames, type ClassOptionChoices } from "@/lib/optimization/ready-preset-class-options";
import { describeAdvancementChoice } from "@/lib/optimization/ready-preset-advancement-text";

export function ReadyPresetLevelSummary({ levels, targetLevel, advancements, classOptionChoices }: { levels: ReadyPresetLevels; targetLevel: number; advancements: AdvancementChoices; classOptionChoices: ClassOptionChoices }) {
  const futureSteps = listStepsAfter(levels, targetLevel);
  return <div className="mt-5">
    <h4 className="text-base text-white">Що буде на {targetLevel}-му рівні</h4>
    <p className="mt-1 text-slate-200">{levels.classLevelsByTarget[targetLevel].map((entry) => `${entry.className} ${entry.classLevel}`).join(" · ")}</p>
    <ol className="mt-3 space-y-3 text-sm text-slate-300">{listStepsUpTo(levels, targetLevel).map((step) => <li key={step.characterLevel}>
      <strong className="text-slate-100">{step.characterLevel}-й рівень · {step.className} {step.classLevel}</strong>
      <ul className="mt-1 space-y-1 text-slate-400">{describeLevelStep(step, levels, advancements, classOptionChoices).map((line) => <li key={line}>{line}</li>)}</ul>
    </li>)}</ol>
    {futureSteps.length ? <details className="mt-4 rounded-xl border border-white/10 p-4">
      <summary className="min-h-11 cursor-pointer text-sm text-slate-200">Далі за планом автора: не входить у цього персонажа</summary>
      <ol className="mt-3 space-y-2 text-sm text-slate-400">{futureSteps.map((step) => <li key={step.characterLevel}>
        <strong className="text-slate-300">{step.characterLevel}-й рівень · {step.className} {step.classLevel}:</strong> {describeLevelStep(step, levels, advancements, classOptionChoices).join("; ")}
      </li>)}</ol>
    </details> : null}
  </div>;
}

function describeLevelStep(step: LevelStep, levels: ReadyPresetLevels, advancements: AdvancementChoices, classOptionChoices: ClassOptionChoices): string[] {
  const choice = findEffectiveAdvancement(step, advancements);
  const lines = [
    ...(step.isMulticlassEntry ? [`Новий клас (мультиклас): ${step.className}`] : []),
    ...(step.subclassName ? [`Підклас: ${step.subclassName}`] : []),
    ...(choice ? [describeAdvancementChoice(choice, levels.featPool, step.advancement?.defaultFeat)] : []),
    ...(!choice && step.featName ? [`Риса: ${step.featName}`] : []),
    ...(!choice && step.abilityIncreases.length ? [`Підвищення характеристик: ${step.abilityIncreases.map((increase) => `${ABILITY_LABELS[increase.ability] ?? increase.ability} +${increase.amount}`).join(", ")}`] : []),
    ...(step.optionNames.length ? [`Вибір: ${step.optionNames.join(", ")}`] : []),
    ...(step.optionPick ? [`Вибір: ${listEffectiveOptionNames(step, classOptionChoices).map((name) => levels.classOptionPools[step.classKey]?.find((entry) => entry.nameEng === name)?.name ?? name).join(", ")}`] : []),
    ...OPEN_PICK_CATEGORIES.filter((category) => step.newSpells[category].length).map((category) => `${OPEN_PICK_LABELS[category]}: ${formatSpells(step.newSpells[category])}`),
    ...step.openPicks.map((pick) => `${OPEN_PICK_LABELS[pick.category]}: ще ${pick.count} на ваш вибір`),
  ];
  return lines.length ? lines : ["Вміння класу за таблицею рівнів"];
}

function formatSpells(spells: readonly LevelSpell[]): string {
  return spells.map((spell) => spell.name).join(", ");
}
