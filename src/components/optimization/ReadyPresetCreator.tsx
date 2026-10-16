"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowLeft, BookOpen, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeLink } from "@/components/no-ai/ModeLink";
import GoogleAuthDialog from "@/lib/components/auth/GoogleAuthDialog";
import type { ReadyPresetPageData } from "@/lib/optimization/ready-preset.server";
import { useReadyPreset } from "@/lib/optimization/use-ready-preset";
import { ReadyPresetCreationProgress } from "./ReadyPresetCreationProgress";
import { isSignInRequiredMessage } from "@/lib/optimization/ready-preset-server-error";
import { useRpgbotSurfaceView } from "@/lib/monitoring/use-rpgbot-surface-view";
import { captureRpgbotEvent } from "@/lib/monitoring/rpgbot-analytics";
import type { PresetEntry } from "@/lib/monitoring/rpgbot-analytics-model";
import { PresetLevelChoice, PresetNameField, PresetRecap, PresetReviewActions } from "./ReadyPresetReview";
import { CatalogMention } from "./CatalogMention";
import { ReadyPresetCustomization, listPresetCustomizationSteps } from "./ReadyPresetCustomization";
import type { CreationStepRuleExcerpts } from "@/lib/content/creation-step-rule-excerpts";
import { rememberUnfinishedPreset } from "@/lib/optimization/unfinished-preset";
import { stripNoAiPrefix } from "@/lib/no-ai/no-ai-route";

const REVIEW_FORM_ID = "ready-preset-review";

export function ReadyPresetCreator({ data, catalogQuery, catalogClass = "", entry, ruleExcerpts }: { data: ReadyPresetPageData; catalogQuery: string; catalogClass?: string; entry: PresetEntry; ruleExcerpts?: CreationStepRuleExcerpts }) {
  const state = useReadyPreset(data.draft, data.preset.buildId, data.options, data.levels ? { levels: data.levels, revisionId: data.preset.revisionId } : null);
  const { ready, invalidSaved, restartSavedPreset, draft, step, update, goToStep, confirmCreation, submitting, error, assembly } = state;
  const presetId = data.preset.buildId;
  const heading = useRef<HTMLHeadingElement>(null);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const isSignedOut = useSession().status === "unauthenticated";
  const updateName = useCallback((name: string) => update({ name }), [update]);
  const isNameStep = step >= 4 && step - 4 === listPresetCustomizationSteps(data, state).length;
  const surface = isNameStep ? "preset_name" : step >= 4 ? "preset_customize" : "preset_review";
  const viewedLevel = useRef({ surface: "", level: 1 });
  if (ready && viewedLevel.current.surface !== surface) viewedLevel.current = { surface, level: assembly.targetLevel };
  useRpgbotSurfaceView(ready ? { surface, preset_id: presetId, entry, target_level: viewedLevel.current.level } : null);
  const catalogParams = new URLSearchParams();
  if (catalogQuery) catalogParams.set("q", catalogQuery);
  if (catalogClass) catalogParams.set("class", catalogClass);
  const hasStartedPath = ready && (step >= 4 || isSignInOpen);
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
      <h1 ref={heading} tabIndex={-1} className="font-rpg-display text-3xl text-white focus-visible:outline-arcane-300 sm:text-4xl">{step < 4 ? "Як створимо персонажа?" : "Налаштуйте персонажа"}</h1>
      <p className="mt-3 text-base leading-relaxed text-slate-400">{step < 4 ? "Усе заповнено за гайдом RPGbot. Створіть персонажа одразу або змініть вибори." : "Рекомендовані вибори вже обрані. Змінюйте потрібне й рухайтеся далі."}</p>
    </header>
  </div>;
  function openSignIn(open: boolean) { setIsSignInOpen(open); state.rememberSignInOpen(open); }
  function createUnlessSignedOut(create: () => void) {
    if (!isSignedOut) return create();
    state.requireSignIn();
    openSignIn(true);
  }
  function createByGuide() {
    captureRpgbotEvent("rpgbot_preset_path_chosen", { preset_id: presetId, path: "guide" });
    createUnlessSignedOut(state.createByGuide);
  }
  function customize() {
    captureRpgbotEvent("rpgbot_preset_path_chosen", { preset_id: presetId, path: "customize" });
    goToStep(4);
  }
  function selectLevel(level: number) {
    captureRpgbotEvent("rpgbot_preset_level_selected", { preset_id: presetId, level, from_level: assembly.targetLevel, placement: "preset_page" });
    assembly.selectLevel(level);
  }
  const nameField = <PresetNameField name={draft.name ?? ""} onChange={updateName} />;
  const creationStatus = <>
    {isSignedOut && !error ? <p className="mb-3 text-sm leading-relaxed text-slate-300">Щоб зберегти персонажа, увійдіть через Google. Вибори не загубляться.</p> : null}
    {submitting ? <ReadyPresetCreationProgress levelCount={assembly.targetLevel} /> : null}
    {error ? <p role="alert" className="mb-3 text-rose-200">{error}</p> : null}
    {isSignInRequiredMessage(error) ? <div className="mb-3"><GoogleAuthDialog analyticsTrigger="preset_submit" open={isSignInOpen} onOpenChange={openSignIn} trigger={<Button variant="secondary" size="sm" className="min-h-11 border border-slate-700/70 bg-white/5 text-white hover:bg-white/10"><LogIn className="mr-2 h-4 w-4" />Увійти</Button>} /></div> : null}
  </>;
  if (step >= 4) return <ReadyPresetCustomization data={data} state={state} header={header} nameFields={<>{nameField}<PresetRecap data={data} targetLevel={assembly.targetLevel} />{creationStatus}</>} onCreate={() => createUnlessSignedOut(() => void confirmCreation())} ruleExcerpts={ruleExcerpts} />;
  return <div className="mx-auto max-w-6xl px-4 pb-[calc(11rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 md:pb-12">
    {header}
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="glass-panel border-gradient-rpg rounded-2xl p-5 sm:p-7">
        <p className="text-lg text-white"><CatalogMention href={data.links.mainClassHref} title={data.summary.mainClassName}>{data.summary.mainClassName}</CatalogMention> · <CatalogMention href={data.links.raceHref} title={data.summary.raceName}>{data.summary.raceName}</CatalogMention>{data.summary.startingClassLabel ? <span className="text-sm text-slate-400"> · старт: {data.summary.startingClassLabel}</span> : null}</p>
        <p className="mt-2 text-sm text-slate-400"><CatalogMention href={data.links.backgroundHref} title={data.summary.backgroundName}>{data.summary.backgroundName}</CatalogMention> · <CatalogMention href={data.links.mainSubclassHref} title={data.summary.mainSubclassName}>{data.summary.mainSubclassName}</CatalogMention></p>
        <ModeLink prefetch={false} href={data.links.guideHref} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm text-arcane-200 underline-offset-4 hover:underline"><BookOpen className="h-4 w-4" /> Читати гайд цього білда</ModeLink>
        <PresetLevelChoice data={data} targetLevel={assembly.targetLevel} onSelect={selectLevel} />
      </section>
      <form id={REVIEW_FORM_ID} onSubmit={(event) => { event.preventDefault(); createByGuide(); }} className="glass-panel border-gradient-rpg rounded-2xl p-5 sm:p-7">{nameField}</form>
      <PresetReviewActions formId={REVIEW_FORM_ID} status={creationStatus} isSubmitting={submitting} onCustomize={customize} />
    </div>
  </div>;
}
