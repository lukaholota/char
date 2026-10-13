"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useTwoStepConfirm } from "@/hooks/useTwoStepConfirm";
import { cn } from "@/lib/utils";
import ASIForm from "@/lib/components/characterCreator/ASIForm";
import EquipmentForm from "@/lib/components/characterCreator/EquipmentForm";
import { LanguagesForm } from "@/lib/components/characterCreator/LanguagesForm";
import { CreationStepLayout } from "@/lib/components/characterCreator/CreationStepLayout";
import { CreationStepRuleLink } from "@/lib/components/characterCreator/CreationStepRuleLink";
import { useNextStepHintState } from "@/lib/components/wizard/next-step-hint";
import type { BackgroundI, ClassI, RaceI, SubraceI } from "@/lib/types/model-types";
import type { ReadyPresetPageData } from "@/lib/optimization/ready-preset.server";
import type { useReadyPreset } from "@/lib/optimization/use-ready-preset";
import { buildReadyPresetSkillChoices, buildReconciledSkillPatch, describeSkillPickGroup, listSkillPickOptions, listTakenSkillPicks, type SkillPickGroup } from "@/lib/optimization/ready-preset-skills";
import { listOpenAdvancementSteps } from "@/lib/optimization/ready-preset-advancements";
import { listOpenOptionSteps } from "@/lib/optimization/ready-preset-class-options";
import { findWizardPreparation, listOpenPickSlots } from "@/lib/optimization/ready-preset-levels";
import { findPreparedSpellsWithinLimit, listSavedPresetIssues, type SavedPresetIssue } from "@/lib/optimization/ready-preset-validation";
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
  const resetConfirm = useTwoStepConfirm<HTMLButtonElement>({ onConfirm: state.resetCustomization });
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
  const skillPatch = active.kind === "skills" ? buildReconciledSkillPatch(state.draft, data.options.skills) : {};
  const issues = listSavedPresetIssues({ ...state.draft, ...skillPatch }, data.draft, data.options);
  const failingKinds = new Set(issues.map((issue) => issue.step));
  const stepProblem = issues.find((issue) => issue.step === active.kind)?.message ?? null;
  const nativeForm = ["abilities", "languages", "equipment"].includes(active.kind);
  const leaveStep = (target: number) => {
    if (active.kind === "skills") state.update(skillPatch);
    state.goToStep(target);
  };
  const next = () => leaveStep(state.step + 1);
  const content = <>
    {active.kind === "choices" ? <ReadyPresetChoices data={data} draft={state.draft} update={state.update} /> : null}
    {active.kind === "abilities" ? <ASIForm {...formProps} race={race} raceVariant={data.creator.variant} selectedClass={selectedClass} ruleset="RULES_2014" lockOrigin prevRaceId={race.raceId} setPrevRaceId={() => {}} /> : null}
    {active.kind === "skills" ? <PresetSkillCards data={data} state={state} /> : null}
    {active.kind === "expertise" ? <PresetExpertiseCards data={data} state={state} /> : null}
    {active.kind === "languages" ? <LanguagesForm {...formProps} initialSelection={state.draft.languagesSchema?.languages} race={race} selectedClass={selectedClass} background={background} selectedSubrace={data.creator.subrace as unknown as SubraceI} activeFeatures={[]} existingLanguages={data.options.knownLanguages} forcedLanguagesToChooseCount={data.options.languageCount} choosableLanguages={data.options.languages} /> : null}
    {active.kind === "equipment" ? <EquipmentForm {...formProps} initialSelection={state.draft.equipmentSchema} race={race} selectedClass={selectedClass} background={background} weapons={data.creator.weapons} /> : null}
    {active.kind === "spells" ? <ReadyPresetSpells data={data} draft={state.draft} update={state.update} hidePreparedEditor={state.assembly.targetLevel > 1} /> : null}
    {active.kind === "level" && state.choiceContext ? <><ReadyPresetLevelAdvancements assembly={state.assembly} context={state.choiceContext} characterLevel={active.characterLevel} /><ReadyPresetLevelClassOptions assembly={state.assembly} context={state.choiceContext} characterLevel={active.characterLevel} /><ReadyPresetLevelSpells data={data} assembly={state.assembly} context={state.choiceContext} characterLevel={active.characterLevel} /></> : null}
    {active.kind === "name" ? nameFields : null}
    {active.kind === "preparation" && state.choiceContext ? <ReadyPresetLevelSpells data={data} assembly={state.assembly} context={state.choiceContext} preparationOnly /> : null}
  </>;
  const blockingIssue = active.kind === "name" ? findNameStepIssue(state, issues) : null;
  const problem = stepProblem ?? blockingIssue?.message ?? null;
  const blockingStepIndex = blockingIssue?.step ? steps.findIndex((step) => step.kind === blockingIssue.step) : -1;
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
    isStepDone={(stepOrder) => stepOrder <= index && !failingKinds.has(steps[stepOrder - 1].kind as SavedPresetIssue["step"])}
    canJumpTo={() => !state.submitting}
    onJump={(stepOrder) => leaveStep(stepOrder + 3)}
    onHintChange={publishHint}
    activeFormId={formId}
    isNextBlocked={blocked || !!hint || !!problem}
    nextStepHint={problem ?? hint}
    isSubmitting={state.submitting}
    onPrev={() => leaveStep(state.step - 1)}
    after={<div className="flex flex-wrap gap-2">
      <Button variant="ghost" disabled={state.submitting} onClick={() => state.goToStep(2)} className="min-h-11 text-slate-400">До вибору способу створення</Button>
      <Button ref={resetConfirm.ref} variant={resetConfirm.isConfirming ? "destructive" : "ghost"} disabled={state.submitting} onClick={resetConfirm.onClick} className={cn("min-h-11", !resetConfirm.isConfirming && "text-slate-400")}>{resetConfirm.isConfirming ? "Точно скинути?" : "Скинути зміни до пресета"}</Button>
    </div>}
  >
    <h2 className="font-rpg-display text-2xl text-white">{active.title}</h2>
    {nativeForm ? content : <form id={formId} onSubmit={(event) => { event.preventDefault(); submit(); }} className="space-y-4">{content}</form>}
    {problem ? <p role="status" className="text-sm text-amber-200">{problem}</p> : null}
    {blockingStepIndex >= 0 ? <Button type="button" variant="outline" className="min-h-11" onClick={() => state.goToStep(blockingStepIndex + 4)}>Відкрити крок «{steps[blockingStepIndex].title}»</Button> : null}
  </CreationStepLayout>;
}

function findNameStepIssue(state: PresetState, issues: SavedPresetIssue[]): SavedPresetIssue | null {
  if (state.choiceProblem) return { step: null, message: state.choiceProblem };
  if (issues.length) return issues[0];
  return state.draft.name?.trim() ? null : { step: null, message: "Вкажіть імʼя персонажа." };
}

function PresetSkillCards({ data, state }: { data: ReadyPresetPageData; state: PresetState }) {
  const choices = state.draft.skillsSchema!.basicChoices;
  const owned = buildReadyPresetSkillChoices(choices, data.options.skills).skills;
  return <div className="space-y-6"><p className="text-sm leading-relaxed text-slate-300"><span className="text-slate-400">Ваші навички:</span> {owned.map(translateValue).join(", ")}</p>{Object.entries(data.draft.skillsSchema!.basicChoices).filter(([, skills]) => skills?.length).map(([key, initial]) => {
    const group = key as SkillPickGroup;
    const selected = choices[group] ?? [];
    const taken = listTakenSkillPicks(group, choices, data.options.skills);
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
  const next = findPreparedSpellsWithinLimit(state.draft, data.options, state.assembly.targetLevel);
  useEffect(() => {
    if (next && JSON.stringify(next) !== JSON.stringify(selected)) state.update({ initialPreparedSpellIds: next });
  }, [next, selected, state.update]);
}
