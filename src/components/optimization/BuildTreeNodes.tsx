"use client";

import type { BuildPageData } from "@/lib/optimization/build-pages.server";
import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { BuildSource } from "./BuildSource";

export type BuildView = BuildPageData["builds"][number];
export type AbilityScores = NonNullable<PersFormData["asi"]>;

export function BuildTreeNodes({ build, raceId, onRaceChange, scores, onScoresChange }: {
  build: BuildView; raceId?: number; onRaceChange: (id: number) => void;
  scores: AbilityScores; onScoresChange: (scores: AbilityScores) => void;
}) {
  const details = build.recipe.details!;
  const nodes = details.nodes;
  const findNode = (pattern: RegExp) => nodes.find((node) => pattern.test(node.nodeId));
  const race = findNode(/^section-(race|species)(-2)?$/);
  const background = findNode(/^section-background$/);
  const abilities = findNode(/^section-(abilities|ability-scores-2)$/);
  const skills = findNode(/skills-and-tools|skill-and-tool/);
  const feats = findNode(/^section-feats/);
  const equipment = findNode(/^section-starting-equipment$/);
  const raceChoices = build.recipe.choices.find((choice) => choice.choiceId === "race");
  const labels = ["Сила", "Спритність", "Статура", "Інтелект", "Мудрість", "Харизма"];
  return <div className="build-tree-nodes grid gap-5 md:grid-cols-2">
    <TreeNode title="Раса" number="1">
      {raceChoices ? <div className="space-y-2">{raceChoices.alternatives.map((alternative) => {
        const mapped = build.alternatives.find((entry) => entry.alternativeId === alternative.alternativeId)!;
        return <label key={alternative.alternativeId} className="flex min-h-11 items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
          <input type="radio" name="build-race" checked={mapped.raceId === raceId} onChange={() => mapped.raceId && onRaceChange(mapped.raceId)} />{alternative.alternativeId === "race-default" && details.variantKey ? translateValue(details.variantKey) : mapped.label}
        </label>;
      })}</div> : <p className="text-amber-200">Табаксі · немає в каталозі 2024</p>}
      {race ? <BuildSource text={race.text} refs={race.sourceRefs} ruleset={build.recipe.ruleset} /> : null}
    </TreeNode>
    <TreeNode title={build.recipe.ruleset === "RULES_2024" ? "Походження" : "Передісторія"} number="2">
      <p className="text-lg text-slate-100">{translateValue(details.backgroundKey)}</p>
      {background ? <BuildSource text={background.text} refs={background.sourceRefs} ruleset={build.recipe.ruleset} /> : null}
    </TreeNode>
    <TreeNode title="Характеристики" number="3">
      <p className="mb-3 text-xs text-slate-400">Базові значення до бонусів раси, походження й рис</p>
      <div className="grid grid-cols-3 gap-2">{scores.map((score, index) => <label key={score.ability} className="text-center text-xs text-slate-400">
        {labels[index]}<input aria-label={labels[index]} type="number" min={8} max={15} value={score.value} onChange={(event) => onScoresChange(scores.map((entry) => entry.ability === score.ability ? { ...entry, value: Number(event.target.value) } : entry))} className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-slate-950 text-center text-lg text-white" />
      </label>)}</div>
      {abilities ? <BuildSource text={abilities.text} refs={abilities.sourceRefs} ruleset={build.recipe.ruleset} /> : null}
    </TreeNode>
    <TreeNode title="Навички" number="4">
      <p className="text-sm text-slate-300">План володінь із прикладу. Вибори підтверджуються в конструкторі.</p>
      {skills ? <BuildSource text={skills.text} refs={skills.sourceRefs} ruleset={build.recipe.ruleset} /> : null}
    </TreeNode>
    <TreeNode title="Риси / ASI" number="5">
      <p className="text-sm text-slate-300">{details.featKey ? `${translateValue(details.featKey)} · на старті, потребує підтвердження опцій` : "Риса походження на старті; ASI й наступні риси плануються"}</p>
      {feats ? <BuildSource text={feats.text} refs={feats.sourceRefs} ruleset={build.recipe.ruleset} /> : null}
    </TreeNode>
    <TreeNode title="Заклинання" number="6">
      <p className="text-sm text-slate-300">Монах не обирає класових заклинань на 1-му рівні. Можливості підкласу — в плані розвитку.</p>
      <BuildSource text={details.levelPlans.filter((step) => step.level <= 3).map((step) => `${step.level}: ${step.text}`).join("\n\n")} refs={build.recipe.progression[0].sourceRefs} ruleset={build.recipe.ruleset} />
    </TreeNode>
    <TreeNode title="Спорядження" number="7">
      <p className="text-sm text-slate-300">Стартовий набір підтвердите в конструкторі. Магічні предмети та пізні покупки не додаються до інвентаря.</p>
      <BuildSource text={equipment?.text ?? details.levelPlans[0].text} refs={details.levelPlans[0].sourceRefs} ruleset={build.recipe.ruleset} />
    </TreeNode>
  </div>;
}

function TreeNode({ title, number, children }: { title: string; number: string; children: React.ReactNode }) {
  return <section className="relative rounded-2xl border border-white/10 bg-slate-950/70 p-5 shadow-lg">
    <div className="mb-4 flex items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-slate-900 text-xs text-slate-400">{number}</span><h3 className="font-rpg-display text-xl text-slate-100">{title}</h3></div>
    {children}
  </section>;
}
