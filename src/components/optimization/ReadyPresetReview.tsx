"use client";

import { useState, type ReactNode } from "react";
import type { Skill } from "@/lib/types/enums";
import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import type { ReadyPresetPageData } from "@/lib/optimization/ready-preset.server";
import { countRemainingBuildPoints } from "@/lib/optimization/build-draft";
import { buildReadyPresetSkillChoices, describeSkillPickGroup, listFixedSkills, listSkillPickOptions, type SkillPickGroup } from "@/lib/optimization/ready-preset-skills";
import { buildPresetAbilityScores, listPresetChosenRacialBonuses } from "@/lib/optimization/ready-preset-abilities";
import { ABILITY_LABELS } from "@/lib/optimization/ready-preset-levels";
import { BuildSource } from "./BuildSource";
import { ReadyPresetSpells } from "./ReadyPresetSpells";
import { ReadyPresetChoices } from "./ReadyPresetChoices";

const INPUT_STYLE = "min-h-12 w-full rounded-lg border border-white/20 bg-slate-950 px-3 py-2 text-slate-100";
type ReviewProps = { data: ReadyPresetPageData; draft: Partial<PersFormData>; update: (changes: Partial<PersFormData>) => void };

export function ReadyPresetReview({ data, draft, update, targetLevel = 1 }: ReviewProps & { targetLevel?: number }) {
  const source = (sectionId: string) => [{ ...data.recipe.sourceRefs[0], sectionId }];
  return <div className="space-y-4">
    <ReviewRow title="Клас і раса" value={data.summary.className + " · " + data.summary.raceName} explanation={targetLevel > 1 ? describeHigherLevelPlan(targetLevel) : describeSubclassPlan(data.summary)} />
    <ReviewRow title="Передісторія" value={data.summary.backgroundName} explanation={describeBackground(draft)} />
    {data.summary.startsWithSubclass ? <ReviewRow title="Підклас" value={data.summary.subclassName} explanation="Цей клас обирає підклас уже на 1-му рівні, тому він заповнений за авторським прикладом RPGbot." /> : null}
    <ReadyPresetChoices data={data} draft={draft} update={update} />
    <PresetAbilityScores data={data} draft={draft} update={update} />
    <PresetSkills data={data} draft={draft} update={update} />
    <ReadyPresetSpells data={data} draft={draft} update={update} hidePreparedEditor={targetLevel > 1} />
    {data.options.expertiseCount ? <PresetExpertise data={data} draft={draft} update={update} /> : null}
    {data.summary.featName && data.preset.featSection ? <ReviewRow title="Риса й особливий вибір" value={[data.summary.featName, data.summary.featOptionLabel].filter(Boolean).join(" · ")} explanation="Риса та її вибір уже заповнені за прикладом RPGbot."><BuildSource text={findNodeText(data, data.preset.featSection, "Риса та її вибір уже заповнені за прикладом RPGbot.")} refs={source(data.preset.featSection)} ruleset="RULES_2014" /></ReviewRow> : null}
    {targetLevel > 1 ? null : <details className="rounded-2xl border border-white/10 p-5"><summary className="min-h-11 cursor-pointer text-lg text-white">{data.summary.startsWithSubclass ? "Що буде далі: розвиток персонажа" : `Що буде далі: ${data.summary.subclassName} з ${data.summary.subclassLevel}-го рівня`}</summary><p className="mt-3 text-sm text-slate-400">Зараз створюємо лише 1-й рівень. Нові вміння й наступні риси ви отримаєте під час підвищення рівня.</p><ol className="mt-4 space-y-2 text-sm text-slate-300">{data.recipe.details!.levelPlans.filter((plan) => (data.summary.startsWithSubclass ? [2,3,4] : [3,4,8]).includes(plan.level)).map((plan) => <li key={plan.level}><strong>{plan.level}-й рівень:</strong> {plan.text}</li>)}</ol></details>}
  </div>;
}

function findNodeText(data: ReadyPresetPageData, nodeId: string, fallback: string): string {
  return data.recipe.details!.nodes.find((node) => node.nodeId === nodeId)?.text ?? fallback;
}

function describeHigherLevelPlan(targetLevel: number): string {
  return `Нижче — вибори 1-го рівня. Рівні до ${targetLevel}-го буде додано за планом автора: що саме дає кожен рівень, показано в розділі «Рівень персонажа».`;
}

function describeSubclassPlan(summary: ReviewProps["data"]["summary"]): string {
  if (summary.startsWithSubclass) return "Ви починаєте з 1-го рівня. Підклас «" + summary.subclassName + "» цей клас обирає одразу, тож він уже входить у персонажа.";
  return "Ви починаєте з 1-го рівня. Підклас «" + summary.subclassName + "» відкриється на " + summary.subclassLevel + "-му рівні; це ваш план розвитку.";
}

function ReviewRow({ title, value, explanation, children }: { title: string; value: string; explanation: string; children?: ReactNode }) {
  return <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><h3 className="text-sm text-slate-400">{title}</h3><p className="mt-1 text-lg text-white">{value}</p><p className="mt-2 text-sm leading-relaxed text-slate-400">{explanation}</p>{children}</section>;
}

function PresetAbilityScores({ data, draft, update }: ReviewProps) {
  const [editing, setEditing] = useState(false);
  const scores = buildPresetAbilityScores(draft, data.abilityInput);
  const remaining = countRemainingBuildPoints(draft.asi ?? []);
  const sectionId = data.recipe.details!.nodes.find((node) => /abilit/.test(node.nodeId))?.nodeId ?? data.recipe.sourceRefs[0].sectionId;
  return <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
    <div className="flex items-center justify-between gap-3"><h3 className="text-lg text-white">Характеристики</h3><button type="button" onClick={() => setEditing(!editing)} className="min-h-11 px-2 text-sm text-arcane-200 underline">{editing ? "Готово" : "Змінити характеристики"}</button></div>
    <p className="mb-4 text-sm text-slate-400">{data.preset.abilityExplanation}</p>
    {draft.isDefaultASI === false ? <p className="mb-4 text-sm text-slate-300">Бонуси раси обрано за правилами Таші (змінене походження): {listPresetChosenRacialBonuses(draft, data.abilityInput).map((entry) => `${ABILITY_LABELS[entry.ability]} +${entry.bonus}`).join(" · ")}.</p> : null}
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{Object.entries(ABILITY_LABELS).map(([key, label]) => <div key={key} className="rounded-xl bg-white/5 p-3 text-center"><span className="text-xs text-slate-400">{label}</span><p className="mt-1 text-2xl text-white">{scores[key as keyof typeof scores]}</p></div>)}</div>
    {editing ? <fieldset className="mt-5"><legend className="mb-3 text-sm text-slate-300">Базові значення до бонусів раси й риси · лишилося {remaining} з 27 очок</legend><div className="grid grid-cols-3 gap-3">{(draft.asi ?? []).map((score, index) => <label key={score.ability} className="text-sm text-slate-300">{ABILITY_LABELS[score.ability]}<input className={INPUT_STYLE} type="number" min={8} max={15} value={score.value} onChange={(event) => {
      const next = draft.asi!.map((entry, position) => position === index ? { ...entry, value: Number(event.target.value) } : entry);
      update({ asi: next, points: countRemainingBuildPoints(next) });
    }} /></label>)}</div>{remaining < 0 ? <p role="alert" className="mt-3 text-rose-200">Зменште значення: бракує {Math.abs(remaining)} очок.</p> : null}</fieldset> : null}
    <BuildSource text={data.preset.abilityExplanation} refs={[{ ...data.recipe.sourceRefs[0], sectionId }]} ruleset="RULES_2014" />
  </section>;
}

function PresetSkills({ data, draft, update }: ReviewProps) {
  const [editing, setEditing] = useState(false);
  const choices = draft.skillsSchema!.basicChoices;
  function chooseSkill(group: SkillPickGroup, index: number, skill: Skill) {
    const next = { ...choices, [group]: (choices[group] ?? []).map((entry, position) => position === index ? skill : entry) };
    const reconciled = buildReadyPresetSkillChoices(next, data.options.skills);
    const expertises = [...new Set([...(draft.expertiseSchema?.expertises ?? []), ...reconciled.skills])].filter((entry) => reconciled.skills.includes(entry)).slice(0, data.options.expertiseCount);
    const customization = draft.backgroundCustomization ? { backgroundCustomization: { ...draft.backgroundCustomization, skills: reconciled.choices.background } } : {};
    update({ skillsSchema: { ...draft.skillsSchema!, basicChoices: reconciled.choices }, skills: reconciled.skills, expertiseSchema: { expertises }, ...customization });
  }
  return <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
    <div className="flex items-center justify-between gap-3"><h3 className="text-lg text-white">Навички вже обрані</h3><button type="button" onClick={() => setEditing(!editing)} className="min-h-11 px-2 text-sm text-arcane-200 underline">{editing ? "Готово" : "Змінити навички"}</button></div>
    <div className="mt-3 flex flex-wrap gap-2">{draft.skills!.map((skill) => <span key={skill} className="rounded-lg bg-white/5 px-3 py-2 text-sm text-slate-200">{translateValue(skill)}</span>)}</div>
    <p className="mt-3 text-sm text-slate-400">{JSON.stringify(choices) === JSON.stringify(data.draft.skillsSchema!.basicChoices) ? data.preset.skillExplanation : "Це ваш набір навичок. Нижче можна прочитати вихідну рекомендацію RPGbot."}</p>
    {editing ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{Object.entries(choices).flatMap(([group, selected]) => (selected ?? []).map((skill, index) => {
      const options = listSkillPickOptions(group as SkillPickGroup, data.options.skills);
      const others = new Set(Object.entries(choices).filter(([key]) => group === "background" || key !== "background").flatMap(([, selected]) => selected ?? []).filter((entry) => entry !== skill));
      const fixed = new Set(group === "background" ? listFixedSkills(data.options.skills) : [...data.options.skills.fixedRace, ...data.options.skills.fixedSubclass]);
      const label = describeSkillPickGroup(group as SkillPickGroup, data.options.skills) + " · " + (index + 1);
      return <label key={group + "-" + index} className="text-sm text-slate-300">{label}<select className={INPUT_STYLE} value={skill} onChange={(event) => chooseSkill(group as SkillPickGroup, index, event.target.value as Skill)}>{options.filter((option) => option === skill || (!others.has(option) && !fixed.has(option))).map((option) => <option key={option} value={option}>{translateValue(option)}</option>)}</select></label>;
    }))}</div> : null}
    <BuildSource text={findNodeText(data, data.preset.skillSection, data.preset.skillExplanation)} refs={[{ ...data.recipe.sourceRefs[0], sectionId: data.preset.skillSection }]} ruleset="RULES_2014" />
  </section>;
}

const BACKGROUND_EXPLANATION = "Навички, володіння інструментами й речі від передісторії вже враховані.";

function describeBackground(draft: Partial<PersFormData>): string {
  const customization = draft.backgroundCustomization;
  if (!customization) return BACKGROUND_EXPLANATION;
  const tools = customization.tools.length ? ` Інструменти замість мов: ${customization.tools.map((tool) => translateValue(tool)).join(", ")}.` : "";
  return `Передісторію налаштовано за правилом PHB «Налаштування передісторії»: навички ${customization.skills.map((skill) => translateValue(skill)).join(", ")} обрані замість вихідних.${tools} Речі від передісторії вже враховані.`;
}

function PresetExpertise({ draft, update }: ReviewProps) {
  const [editing, setEditing] = useState(false);
  const expertises = draft.expertiseSchema!.expertises;
  return <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
    <div className="flex items-center justify-between gap-3"><h3 className="text-lg text-white">Експертиза вже обрана</h3><button type="button" onClick={() => setEditing(!editing)} className="min-h-11 px-2 text-sm text-arcane-200 underline">{editing ? "Готово" : "Змінити Експертизу"}</button></div>
    <p className="mt-3 text-slate-200">{expertises.map((skill) => translateValue(skill)).join(" · ")}</p><p className="mt-2 text-sm text-slate-400">У цих навичках ви подвоюєте Бонус Майстерності.</p>
    {editing ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{expertises.map((skill, index) => <label key={index} className="text-sm text-slate-300">Експертиза · {index + 1}<select className={INPUT_STYLE} value={skill} onChange={(event) => update({ expertiseSchema: { expertises: expertises.map((entry, position) => position === index ? event.target.value as Skill : entry) } })}>{draft.skills!.filter((option) => option === skill || !expertises.includes(option as Skill)).map((option) => <option key={option} value={option}>{translateValue(option)}</option>)}</select></label>)}</div> : null}
  </section>;
}
