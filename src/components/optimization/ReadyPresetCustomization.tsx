"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import ASIForm from "@/lib/components/characterCreator/ASIForm";
import EquipmentForm from "@/lib/components/characterCreator/EquipmentForm";
import { LanguagesForm } from "@/lib/components/characterCreator/LanguagesForm";
import { CreationStepLayout } from "@/lib/components/characterCreator/CreationStepLayout";
import { CreationStepRuleLink } from "@/lib/components/characterCreator/CreationStepRuleLink";
import { useNextStepHintState } from "@/lib/components/wizard/next-step-hint";
import type { BackgroundI, ClassI, RaceI, SubraceI } from "@/lib/types/model-types";
import type { ReadyPresetPageData } from "@/lib/optimization/ready-preset.server";
import type { useReadyPreset } from "@/lib/optimization/use-ready-preset";
import { buildReadyPresetSkillChoices, describeSkillPickGroup, listSkillPickOptions, type SkillPickGroup } from "@/lib/optimization/ready-preset-skills";
import { listOpenAdvancementSteps } from "@/lib/optimization/ready-preset-advancements";
import { listOpenOptionSteps } from "@/lib/optimization/ready-preset-class-options";
import { findWizardPreparation, listOpenPickSlots } from "@/lib/optimization/ready-preset-levels";
import { findInitialListPreparedLimit, findInitialWizardPreparedLimit } from "@/rules/initial-prepared-spells-2014";
import { buildPresetAbilityScores } from "@/lib/optimization/ready-preset-abilities";
import { findPresetSpellProblem } from "@/lib/optimization/ready-preset-spells";
import { findPresetPreparedProblem, findSavedPresetProblem } from "@/lib/optimization/ready-preset-validation";
import type { CreationStepRuleExcerpts } from "@/lib/content/creation-step-rule-excerpts";
import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import type { Skill } from "@/lib/types/enums";
import { ReadyPresetChoices } from "./ReadyPresetChoices";
import { ReadyPresetSpells } from "./ReadyPresetSpells";
import { ReadyPresetLevelAdvancements } from "./ReadyPresetLevelAdvancements";
import { ReadyPresetLevelClassOptions } from "./ReadyPresetLevelClassOptions";
import { ReadyPresetLevelSpells } from "./ReadyPresetLevelSpells";

type PresetState = ReturnType<typeof useReadyPreset>;
type CustomStep = { kind: "choices" | "abilities" | "skills" | "expertise" | "languages" | "equipment" | "spells" | "level" | "preparation" | "name"; title: string; characterLevel?: number };

const NAME_STEP: CustomStep = { kind: "name", title: "Імʼя" };
const CREATOR_STEP_IDS: Partial<Record<CustomStep["kind"], string>> = { abilities: "asi", skills: "skills", languages: "languages", equipment: "equipment", spells: "spells", name: "name" };

export function listPresetCustomizationSteps(data: ReadyPresetPageData, state: PresetState): CustomStep[] {
  const steps: CustomStep[] = [];
  if (Object.values(data.options.choiceGroups).some((groups) => groups.some((group) => !group.isLocked && group.options.length > 1))) steps.push({ kind: "choices", title: "Вибори класу й раси" });
  steps.push({ kind: "abilities", title: "Характеристики" }, { kind: "skills", title: "Навички" });
  if (data.options.expertiseCount) steps.push({ kind: "expertise", title: "Експертиза" });
  if (data.options.languageCount) steps.push({ kind: "languages", title: "Мови" });
  if (data.options.equipmentGroups.length) steps.push({ kind: "equipment", title: "Спорядження" });
  if (data.preset.spells) steps.push({ kind: "spells", title: "Стартові заклинання" });
  const context = state.choiceContext;
  if (context) {
    const levels = [...new Set([...listOpenAdvancementSteps(context.levels, context.targetLevel), ...listOpenOptionSteps(context.levels, context.targetLevel), ...listOpenPickSlots(context.levels, context.targetLevel)].map((step) => step.characterLevel))].sort((a, b) => a - b);
    steps.push(...levels.map((characterLevel): CustomStep => ({ kind: "level", title: `Вибори ${characterLevel}-го рівня`, characterLevel })));
    if (findWizardPreparation(context)) steps.push({ kind: "preparation", title: "Підготовлені заклинання" });
  }
  return steps;
}

export function ReadyPresetCustomization({ data, state, header, nameFields, ruleExcerpts }: { data: ReadyPresetPageData; state: PresetState; header: ReactNode; nameFields: ReactNode; ruleExcerpts?: CreationStepRuleExcerpts }) {
  usePreparedSpellsWithinLimit(data, state);
  const steps = [...listPresetCustomizationSteps(data, state), NAME_STEP];
  const index = state.step - 4;
  const active = steps[index];
  const [blocked, setBlocked] = useState(false);
  const [hint, publishHint] = useNextStepHintState(state.step);
  useEffect(() => { setBlocked(false); }, [state.step]);
  useEffect(() => { if (!active) state.goToStep(3 + steps.length); }, [active, steps.length, state.goToStep]);
  const activeKind = active?.kind;
  const { rememberCustomizationStep } = state;
  useEffect(() => { if (activeKind) rememberCustomizationStep(activeKind); }, [activeKind, rememberCustomizationStep]);
  if (!active) return null;
  const formId = `preset-customization-${index}`;
  const formProps = { formId, onNextDisabledChange: setBlocked };
  const race = data.creator.race as unknown as RaceI;
  const selectedClass = data.creator.characterClass as unknown as ClassI;
  const background = data.creator.background as unknown as BackgroundI;
  const spellProblem = active.kind === "spells" ? findPresetSpellProblem(state.draft, data.options.spells) ?? findPresetPreparedProblem(state.draft, data.options) : null;
  const pickProblem = active.kind === "skills" && Object.entries(data.draft.skillsSchema!.basicChoices).some(([key, initial]) => key !== "background" && (state.draft.skillsSchema!.basicChoices[key as SkillPickGroup]?.length ?? 0) !== initial!.length) ? "Оберіть усі навички цього білда." : active.kind === "expertise" && state.draft.expertiseSchema?.expertises.length !== data.options.expertiseCount ? "Оберіть усі навички для Експертизи." : null;
  const nativeForm = ["abilities", "languages", "equipment"].includes(active.kind);
  const next = () => {
    if (active.kind === "skills") {
      const reconciled = buildReadyPresetSkillChoices(state.draft.skillsSchema!.basicChoices, data.options.skills);
      state.update({ skills: reconciled.skills, skillsSchema: { ...state.draft.skillsSchema!, basicChoices: reconciled.choices },
        ...(state.draft.backgroundCustomization ? { backgroundCustomization: { ...state.draft.backgroundCustomization, skills: reconciled.choices.background } } : {}) });
    }
    state.goToStep(state.step + 1);
  };
  const content = <>
    {active.kind === "choices" ? <ReadyPresetChoices data={data} draft={state.draft} update={state.update} /> : null}
    {active.kind === "abilities" ? <ASIForm {...formProps} race={race} raceVariant={data.creator.variant} selectedClass={selectedClass} ruleset="RULES_2014" lockOrigin prevRaceId={race.raceId} setPrevRaceId={() => {}} /> : null}
    {active.kind === "skills" ? <PresetSkillCards data={data} state={state} /> : null}
    {active.kind === "expertise" ? <PresetExpertiseCards data={data} state={state} /> : null}
    {active.kind === "languages" ? <LanguagesForm {...formProps} initialSelection={state.draft.languagesSchema?.languages} race={race} selectedClass={selectedClass} background={background} selectedSubrace={data.creator.subrace as unknown as SubraceI} activeFeatures={[]} existingLanguages={data.options.knownLanguages} forcedLanguagesToChooseCount={data.options.languageCount} /> : null}
    {active.kind === "equipment" ? <EquipmentForm {...formProps} initialSelection={state.draft.equipmentSchema} race={race} selectedClass={selectedClass} background={background} weapons={data.creator.weapons} /> : null}
    {active.kind === "spells" ? <ReadyPresetSpells data={data} draft={state.draft} update={state.update} hidePreparedEditor={state.assembly.targetLevel > 1} /> : null}
    {active.kind === "level" && state.choiceContext ? <><ReadyPresetLevelAdvancements assembly={state.assembly} context={state.choiceContext} characterLevel={active.characterLevel} /><ReadyPresetLevelClassOptions assembly={state.assembly} context={state.choiceContext} characterLevel={active.characterLevel} /><ReadyPresetLevelSpells data={data} assembly={state.assembly} context={state.choiceContext} characterLevel={active.characterLevel} /></> : null}
    {active.kind === "name" ? nameFields : null}
    {active.kind === "preparation" && state.choiceContext ? <ReadyPresetLevelSpells data={data} assembly={state.assembly} context={state.choiceContext} preparationOnly /> : null}
  </>;
  const finalProblem = active.kind === "name" ? findNameStepProblem(data, state) : null;
  const problem = spellProblem ?? pickProblem ?? finalProblem;
  const submit = () => {
    if (problem) return;
    if (active.kind === "name") void state.confirmCreation();
    else next();
  };
  return <CreationStepLayout
    header={header}
    ruleLink={<CreationStepRuleLink stepId={CREATOR_STEP_IDS[active.kind]} ruleset="RULES_2014" excerpts={ruleExcerpts} />}
    steps={steps.map((step) => ({ id: `${step.kind}-${step.characterLevel ?? 0}`, name: step.title }))}
    currentStep={index + 1}
    progress={Math.round((index / steps.length) * 100)}
    isStepDone={(stepOrder) => stepOrder <= index}
    canJumpTo={() => !state.submitting}
    onJump={(stepOrder) => state.goToStep(stepOrder + 3)}
    onHintChange={publishHint}
    activeFormId={formId}
    isNextBlocked={blocked || !!hint || !!problem}
    nextStepHint={problem ?? hint}
    isSubmitting={state.submitting}
    onPrev={() => state.goToStep(state.step - 1)}
    after={<div className="flex flex-wrap gap-2">
      <Button variant="ghost" disabled={state.submitting} onClick={() => state.goToStep(2)} className="min-h-11 text-slate-400">До вибору способу створення</Button>
      <Button variant="ghost" disabled={state.submitting} onClick={state.resetCustomization} className="min-h-11 text-slate-400">Скинути зміни до пресета</Button>
    </div>}
  >
    <h2 className="font-rpg-display text-2xl text-white">{active.title}</h2>
    {nativeForm ? content : <form id={formId} onSubmit={(event) => { event.preventDefault(); submit(); }} className="space-y-4">{content}</form>}
    {problem ? <p role="status" className="text-sm text-amber-200">{problem}</p> : null}
  </CreationStepLayout>;
}

function findNameStepProblem(data: ReadyPresetPageData, state: PresetState): string | null {
  const problem = state.choiceProblem ?? findSavedPresetProblem(state.draft, data.draft, data.options);
  if (problem) return problem;
  return state.draft.name?.trim() ? null : "Вкажіть імʼя персонажа.";
}

function PresetSkillCards({ data, state }: { data: ReadyPresetPageData; state: PresetState }) {
  const choices = state.draft.skillsSchema!.basicChoices;
  const owned = buildReadyPresetSkillChoices(choices, data.options.skills).skills;
  return <div className="space-y-6"><p className="text-sm leading-relaxed text-slate-300"><span className="text-slate-400">Ваші навички:</span> {owned.map(translateValue).join(", ")}</p>{Object.entries(data.draft.skillsSchema!.basicChoices).filter(([, skills]) => skills?.length).map(([key, initial]) => {
    const group = key as SkillPickGroup;
    const selected = choices[group] ?? [];
    const taken = new Set([...data.options.skills.fixedRace, ...data.options.skills.fixedSubclass, ...Object.entries(choices).filter(([other]) => other !== key && other !== "background").flatMap(([, skills]) => skills ?? [])]);
    return <section key={key}><h3 className="mb-3 text-lg text-white">{describeSkillPickGroup(group, data.options.skills)} · {selected.length} / {initial!.length}</h3><div className="grid gap-2 sm:grid-cols-2">{listSkillPickOptions(group, data.options.skills).map((skill) => <Button key={skill} type="button" variant="outline" aria-pressed={selected.includes(skill)} disabled={!selected.includes(skill) && (selected.length >= initial!.length || taken.has(skill))} className={`min-h-12 justify-start ${selected.includes(skill) ? "border-arcane-400 bg-arcane-500/15" : ""}`} onClick={() => {
      const updated = selected.includes(skill) ? selected.filter((entry) => entry !== skill) : [...selected, skill];
      state.update({ skillsSchema: { ...state.draft.skillsSchema!, basicChoices: { ...choices, [group]: updated } } });
    }}>{selected.includes(skill) ? "✓ " : ""}{translateValue(skill)}</Button>)}</div></section>;
  })}</div>;
}

function PresetExpertiseCards({ data, state }: { data: ReadyPresetPageData; state: PresetState }) {
  const selected = state.draft.expertiseSchema?.expertises ?? [];
  return <div><p className="mb-4 text-slate-300">Оберіть {data.options.expertiseCount} навички, у яких подвоюється Бонус Майстерності.</p><div className="grid gap-2 sm:grid-cols-2">{state.draft.skills?.map((skill) => <Button type="button" variant="outline" key={skill} aria-pressed={selected.includes(skill as Skill)} disabled={!selected.includes(skill as Skill) && selected.length >= data.options.expertiseCount} className={`min-h-12 justify-start ${selected.includes(skill as Skill) ? "border-arcane-400 bg-arcane-500/15" : ""}`} onClick={() => state.update({ expertiseSchema: { expertises: selected.includes(skill as Skill) ? selected.filter((entry) => entry !== skill) : [...selected, skill as Skill] } })}>{selected.includes(skill as Skill) ? "✓ " : ""}{translateValue(skill)}</Button>)}</div></div>;
}

function usePreparedSpellsWithinLimit(data: ReadyPresetPageData, state: PresetState) {
  const selected = state.draft.initialPreparedSpellIds;
  const scores = buildPresetAbilityScores(state.draft, data.options.abilitySources);
  const limit = data.options.spells.usesSpellbook ? findInitialWizardPreparedLimit(scores.INT) : findInitialListPreparedLimit(data.options.className, scores);
  const book = state.draft.classSpells?.spellbookIds;
  useEffect(() => {
    if (!selected) return;
    const prepared = selected.slice(0, limit);
    const next = state.assembly.targetLevel > 1 && data.options.spells.usesSpellbook && !prepared.length ? book?.slice(0, limit) ?? [] : prepared;
    if (JSON.stringify(next) !== JSON.stringify(selected)) state.update({ initialPreparedSpellIds: next });
  }, [state.assembly.targetLevel, selected, limit, book, data.options.spells.usesSpellbook, state.update]);
}
