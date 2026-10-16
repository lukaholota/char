"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, LogIn, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModeLink } from "@/components/no-ai/ModeLink";
import GoogleAuthDialog from "@/lib/components/auth/GoogleAuthDialog";
import type { ReadyPresetPageData } from "@/lib/optimization/ready-preset.server";
import { useReadyPreset } from "@/lib/optimization/use-ready-preset";
import { ReadyPresetCreationProgress } from "./ReadyPresetCreationProgress";
import { isSignInRequiredMessage } from "@/lib/optimization/ready-preset-server-error";
import { useRpgbotSurfaceView } from "@/lib/monitoring/use-rpgbot-surface-view";
import { captureRpgbotEvent } from "@/lib/monitoring/rpgbot-analytics";
import type { PresetEntry } from "@/lib/monitoring/rpgbot-analytics-model";
import { LevelPicker } from "./ReadyPresetLevels";
import { CatalogMention } from "./CatalogMention";
import { ReadyPresetCustomization, listPresetCustomizationSteps } from "./ReadyPresetCustomization";
import type { CreationStepRuleExcerpts } from "@/lib/content/creation-step-rule-excerpts";
import { rememberUnfinishedPreset } from "@/lib/optimization/unfinished-preset";
import { stripNoAiPrefix } from "@/lib/no-ai/no-ai-route";
import { NameGeneratorOptionsPanel, NameSuggestionButtons, NameSuggestionHint, useCharacterNameGenerator } from "@/lib/components/characterCreator/NameGenerator";

export function ReadyPresetCreator({ data, catalogQuery, catalogClass = "", entry, ruleExcerpts }: { data: ReadyPresetPageData; catalogQuery: string; catalogClass?: string; entry: PresetEntry; ruleExcerpts?: CreationStepRuleExcerpts }) {
  const state = useReadyPreset(data.draft, data.preset.buildId, data.options, data.levels ? { levels: data.levels, revisionId: data.preset.revisionId } : null);
  const { ready, invalidSaved, restartSavedPreset, draft, step, update, goToStep, confirmCreation, submitting, error, assembly } = state;
  const presetId = data.preset.buildId;
  const heading = useRef<HTMLHeadingElement>(null);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const isNameStep = step === 3 || (step >= 4 && step - 4 === listPresetCustomizationSteps(data, state).length);
  const surface = isNameStep ? "preset_name" : step >= 4 ? "preset_customize" : "preset_review";
  const viewedLevel = useRef({ surface: "", level: 1 });
  if (ready && viewedLevel.current.surface !== surface) viewedLevel.current = { surface, level: assembly.targetLevel };
  useRpgbotSurfaceView(ready ? { surface, preset_id: presetId, entry, target_level: viewedLevel.current.level } : null);
  const catalogParams = new URLSearchParams();
  if (catalogQuery) catalogParams.set("q", catalogQuery);
  if (catalogClass) catalogParams.set("class", catalogClass);
  const hasStartedPath = ready && step >= 3;
  useEffect(() => {
    if (hasStartedPath) rememberUnfinishedPreset({ buildId: presetId, title: data.preset.title, href: stripNoAiPrefix(window.location.pathname) + window.location.search });
  }, [hasStartedPath, presetId, data.preset.title]);
  useEffect(() => {
    if (!ready) return;
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [step, ready]);
  if (!ready) return <div className="mx-auto max-w-3xl px-5 py-12">{invalidSaved ? <><p role="alert" className="mb-5 text-slate-300">Не вдалося прочитати збережені вибори цього білда. Можна почати з початкового варіанта. Персонаж у звичайному конструкторі збережений окремо.</p><Button onClick={restartSavedPreset}>Відкрити початковий білд</Button></> : <p role="status" className="text-slate-300">Готуємо персонажа…</p>}</div>;
  const header = <div>
    <ModeLink href={catalogParams.size ? `/char/presets?${catalogParams}` : "/char/presets"} className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-400"><ArrowLeft className="h-4 w-4" /> До готових персонажів</ModeLink>
    <header className={`mb-6 mt-5 ${step < 4 ? "mx-auto max-w-3xl" : ""}`}>
      <p title={data.preset.title} className="mb-2 truncate text-xs text-arcane-200">{data.preset.title} · правила 2014</p>
      <h1 ref={heading} tabIndex={-1} className="font-rpg-display text-3xl text-white focus-visible:outline-arcane-300 sm:text-4xl">{step === 2 ? "Як створимо персонажа?" : step === 3 ? "Дайте персонажу імʼя" : "Налаштуйте персонажа"}</h1>
      <p className="mt-3 text-base leading-relaxed text-slate-400">{step === 2 ? "Рекомендації вже заповнені. Оберіть свій шлях." : step === 3 ? "Залишилося тільки імʼя." : "Рекомендовані вибори вже обрані. Змінюйте потрібне й рухайтеся далі."}</p>
    </header>
  </div>;
  const nameFields = <>
      <PresetNameField name={draft.name ?? ""} onChange={(name) => update({ name })} />
      <div className="my-6 rounded-xl bg-white/5 p-4"><p className="text-lg text-white">{data.preset.title}</p><p className="mt-2 text-sm text-slate-300">{describeCharacterLevel(data, assembly.targetLevel)} · {data.summary.raceName} · {data.summary.backgroundName}</p><p className="mt-2 text-sm text-slate-400">{describeSubclassStatus(data, assembly.targetLevel)}</p></div>
      {submitting ? <ReadyPresetCreationProgress levelCount={assembly.targetLevel} /> : null}
      {error ? <p role="alert" className="mb-4 text-rose-200">{error}</p> : null}
      {isSignInRequiredMessage(error) ? <div className="mb-4"><GoogleAuthDialog analyticsTrigger="preset_submit" open={isSignInOpen} onOpenChange={(open) => { setIsSignInOpen(open); state.rememberSignInOpen(open); }} trigger={<Button variant="secondary" size="sm" className="border border-slate-700/70 bg-white/5 text-white hover:bg-white/10"><LogIn className="mr-2 h-4 w-4" />Увійти</Button>} /></div> : null}
  </>;
  if (step >= 4) return <ReadyPresetCustomization data={data} state={state} header={header} nameFields={nameFields} ruleExcerpts={ruleExcerpts} />;
  return <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pb-12">
    {header}
    {step === 2 ? <div className="mx-auto max-w-3xl space-y-6">
      <section className="glass-panel border-gradient-rpg rounded-2xl p-5 sm:p-7">
        <p className="text-lg text-white"><CatalogMention href={data.links.classHref} title={data.summary.className}>{data.summary.className}</CatalogMention> · <CatalogMention href={data.links.raceHref} title={data.summary.raceName}>{data.summary.raceName}</CatalogMention></p>
        <p className="mt-2 text-sm text-slate-400"><CatalogMention href={data.links.backgroundHref} title={data.summary.backgroundName}>{data.summary.backgroundName}</CatalogMention> · <CatalogMention href={data.links.subclassHref} title={data.summary.subclassName}>{data.summary.subclassName}</CatalogMention></p>
        <ModeLink prefetch={false} href={data.links.guideHref} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm text-arcane-200 underline-offset-4 hover:underline"><BookOpen className="h-4 w-4" /> Читати гайд цього білда</ModeLink>
        {data.levels ? <PresetLevelPicker levels={data.levels} selected={assembly.targetLevel} onSelect={(level) => { captureRpgbotEvent("rpgbot_preset_level_selected", { preset_id: presetId, level, from_level: assembly.targetLevel, placement: "preset_page" }); assembly.selectLevel(level); }} /> : <p className="mt-4 text-slate-300">1-й рівень</p>}
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="glass-panel border-gradient-rpg rounded-2xl p-5"><h2 className="text-xl text-white">Довіритися гайду</h2><p className="mt-3 text-sm leading-relaxed text-slate-400">Усе готове. Залишиться тільки імʼя.</p><Button className="mt-5 min-h-12 w-full" onClick={() => { captureRpgbotEvent("rpgbot_preset_path_chosen", { preset_id: presetId, path: "guide" }); state.chooseGuide(); }}>Створити за гайдом <ArrowRight className="ml-2 h-4 w-4" /></Button></section>
        <section className="glass-panel border-gradient-rpg rounded-2xl p-5"><h2 className="text-xl text-white">Налаштувати під себе</h2><p className="mt-3 text-sm leading-relaxed text-slate-400">Змініть вибори білда у знайомому конструкторі.</p><Button variant="outline" className="mt-5 min-h-12 w-full" onClick={() => { captureRpgbotEvent("rpgbot_preset_path_chosen", { preset_id: presetId, path: "customize" }); goToStep(4); }}>Налаштувати персонажа</Button></section>
      </div>
    </div> : null}
    {step === 3 ? <form onSubmit={(event) => { event.preventDefault(); void confirmCreation(); }} className="glass-panel border-gradient-rpg mx-auto max-w-3xl rounded-2xl p-5 sm:p-7">
      {nameFields}
      <Button type="submit" disabled={submitting || !draft.name?.trim()} className="min-h-12 w-full text-base"><Sparkles className="mr-2 h-4 w-4" />{submitting ? "Створюємо персонажа…" : "Створити персонажа"}</Button>
      <button type="button" disabled={submitting} onClick={() => goToStep(2)} className="mt-3 min-h-11 w-full text-sm text-slate-400">Повернутися й змінити вибори</button>
      <p className="mt-3 text-center text-xs text-slate-500">Персонаж збережеться після натискання «Створити персонажа».</p>
    </form> : null}
  </div>;
}

function describeCharacterLevel(data: ReadyPresetPageData, targetLevel: number): string {
  if (targetLevel === 1 || !data.levels) return `${data.summary.className} 1-го рівня`;
  return `${data.levels.classLevelsByTarget[targetLevel].map((entry) => `${entry.className} ${entry.classLevel}`).join(" · ")}, ${targetLevel}-й рівень персонажа`;
}

function describeSubclassStatus(data: ReadyPresetPageData, targetLevel: number): string {
  if (targetLevel > 1) return "Навички й спорядження готові. Усі рівні й вибори на них буде додано при створенні.";
  return `Навички й спорядження готові. ${data.summary.startsWithSubclass ? `Підклас ${data.summary.subclassName} уже обрано.` : `${data.summary.subclassName} — ваш майбутній підклас із ${data.summary.subclassLevel}-го рівня.`}`;
}

function PresetLevelPicker(props: React.ComponentProps<typeof LevelPicker>) {
  const [expanded, setExpanded] = useState(false);
  return <div className="mt-4">
    <div className="flex items-center justify-between gap-3"><span className="text-slate-200">Рівень: {props.selected}</span><Button type="button" variant="ghost" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="min-h-11 text-arcane-200">{expanded ? "Згорнути рівні" : "Змінити рівень"}</Button></div>
    {expanded ? <LevelPicker {...props} onSelect={(level) => { props.onSelect(level); setExpanded(false); }} /> : null}
  </div>;
}

function PresetNameField({ name, onChange }: { name: string; onChange: (name: string) => void }) {
  const { currentName, generateName, options } = useCharacterNameGenerator();
  return <>
    <div className="flex flex-wrap items-center justify-between gap-2"><label htmlFor="ready-preset-name" className="text-slate-200">Імʼя персонажа</label><NameSuggestionButtons currentName={currentName} onGenerate={generateName} onUse={() => onChange(currentName)} /></div>
    <Input id="ready-preset-name" maxLength={100} required value={name} onChange={(event) => onChange(event.target.value)} placeholder={currentName || "Наприклад, Мирон"} className="mt-2 min-h-12 text-base" />
    <div className="mt-2"><NameSuggestionHint currentName={currentName} /></div>
    <div className="mt-4"><NameGeneratorOptionsPanel {...options} /></div>
  </>;
}
