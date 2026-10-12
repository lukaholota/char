"use client";

import type { ReadyPresetPageData } from "@/lib/optimization/ready-preset.server";
import { listLevelOptions, type AssemblyChoiceContext, type ReadyPresetLevels as ReadyPresetLevelsData } from "@/lib/optimization/ready-preset-levels";
import type { ReadyPresetAssembly } from "@/lib/optimization/use-ready-preset-assembly";
import { ReadyPresetLevelAdvancements } from "./ReadyPresetLevelAdvancements";
import { ReadyPresetLevelClassOptions } from "./ReadyPresetLevelClassOptions";
import { ReadyPresetLevelSpells } from "./ReadyPresetLevelSpells";
import { ReadyPresetLevelSummary } from "./ReadyPresetLevelSummary";

type LevelsProps = {
  data: Pick<ReadyPresetPageData, "options">;
  levels: ReadyPresetLevelsData;
  assembly: ReadyPresetAssembly;
  context: AssemblyChoiceContext | null;
  problem: string | null;
};

export function ReadyPresetLevels({ data, levels, assembly, context, problem }: LevelsProps) {
  const maxLevel = levels.targetLevels[levels.targetLevels.length - 1];
  return <section aria-labelledby="ready-preset-level-heading" className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
    <h3 id="ready-preset-level-heading" className="text-lg text-white">Рівень персонажа</h3>
    <p className="mt-2 text-sm leading-relaxed text-slate-400">Типово персонаж починає з 1-го рівня. Для цього прикладу RPGbot можна одразу створити персонажа вищого рівня, до {maxLevel}-го: усі рівні буде додано за планом автора.</p>
    <LevelPicker levels={levels} selected={assembly.targetLevel} onSelect={assembly.selectLevel} />
    {context ? <>
      <ReadyPresetLevelSummary levels={levels} targetLevel={assembly.targetLevel} advancements={context.advancements} classOptionChoices={context.classOptionChoices} />
      <ReadyPresetLevelAdvancements assembly={assembly} context={context} />
      <ReadyPresetLevelClassOptions assembly={assembly} context={context} />
      <ReadyPresetLevelSpells data={data} assembly={assembly} context={context} />
      {problem ? <p role="status" className="mt-4 text-sm text-amber-200">{problem}</p> : null}
    </> : null}
  </section>;
}

export function LevelPicker({ levels, selected, onSelect }: { levels: ReadyPresetLevelsData; selected: number; onSelect: (level: number) => void }) {
  return <fieldset className="mt-4">
    <legend className="text-sm text-slate-300">Оберіть рівень</legend>
    <div role="radiogroup" aria-label="Рівень персонажа" className="mt-2 flex flex-wrap gap-2">
      {listLevelOptions(levels).map((level) => {
        const isSelected = level === selected;
        return <label key={level} className={`inline-flex min-h-11 min-w-12 cursor-pointer items-center justify-center gap-1 rounded-lg border px-3 text-base focus-within:outline focus-within:outline-2 focus-within:outline-arcane-300 ${isSelected ? "border-arcane-400 bg-arcane-500/20 text-white" : "border-white/20 text-slate-300"}`}>
          <input type="radio" name="ready-preset-level" value={level} checked={isSelected} onChange={() => onSelect(level)} aria-label={`${level}-й рівень`} className="sr-only" />
          {isSelected ? <span aria-hidden="true">✓</span> : null}{level}
        </label>;
      })}
    </div>
  </fieldset>;
}
