"use client";

import { ModeLink } from "@/components/no-ai/ModeLink";

import { AnalystAvatar } from "./AnalystAvatar";
import { BuildClassRoot } from "./BuildClassRoot";
import { findEditionAccent } from "@/styles/edition-accent";
import type { BuildPageData } from "@/lib/optimization/build-pages.server";
import { countRemainingBuildPoints } from "@/lib/optimization/build-draft";
import { useGuidedBuildDraft } from "@/lib/optimization/use-guided-build-draft";
import { buildRecipeGuideHref } from "@/lib/optimization/article-view";
import { buildRpgbotCtaProps } from "@/lib/monitoring/rpgbot-analytics-model";
import { useRpgbotSurfaceView } from "@/lib/monitoring/use-rpgbot-surface-view";
import { RatingBadge } from "./RatingBadge";
import { BuildTreeNodes } from "./BuildTreeNodes";
import { resolveBuildLevelPlans } from "@/lib/optimization/build-progression";
import { BuildSource } from "./BuildSource";
import "./build-tree.css";

export function GuidedBuildTree({ data, initialBuildId }: { data: BuildPageData; initialBuildId?: string }) {
  const { build, buildId, classChosen, chooseClass, raceId, scores, notes, setNotes, customized,
    confirmReplacement, cancelReplacement, assembling, hasBackup, error,
    selectBuild, assembleBuild, restoreDraft, chooseRace, changeScores, scoresCustomized } = useGuidedBuildDraft(data, initialBuildId);
  useRpgbotSurfaceView({ surface: "build_tree", build_id: initialBuildId });
  const edition = data.ruleset === "RULES_2024" ? "2024" : "2014";
  const accent = findEditionAccent(edition).solid;

  return <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-400">
      <ModeLink prefetch={false} href={`${edition === "2024" ? "/2024" : ""}/rules/optimization`} className="min-h-11 py-2 underline">← Аналітика RPGbot</ModeLink>
      <ModeLink prefetch={false} href={`${edition === "2024" ? "" : "/2024"}/optimization/build`} className="min-h-11 py-2 underline">Правила {edition === "2024" ? "2014" : "2024"}</ModeLink>
    </div>
    <header className="mx-auto max-w-2xl text-center">
      <AnalystAvatar className="mx-auto mb-4" />
      <p className={`mb-3 text-xs uppercase tracking-[0.25em] ${accent.text}`}>RPGbot · правила {edition} · лише для власника</p>
      <h1 className="font-rpg-display text-3xl text-white sm:text-5xl">Від класу — до персонажа</h1>
      <p className="mt-4 text-slate-400">Оберіть варіант, прочитайте його обґрунтування й зберіть старт персонажа. Розвиток залишиться вашим планом.</p>
      <p className="mt-2 text-xs text-amber-200">Приватні чернетки. Перший зріз: Монах.</p>
      {error ? <p role="alert" className="mt-3 text-rose-200">{error}</p> : null}
    </header>
    <div className="mt-8 flex justify-center gap-5">{data.classes.map((cls) => <BuildClassRoot key={cls.key} characterClass={cls} chosen={classChosen} edition={edition} onChoose={chooseClass} />)}</div>
    {classChosen ? <>
      <div className={`mx-auto h-10 w-px ${accent.strongFill}`} />
      <section aria-label="Підклас і пресет" className="relative grid gap-4 sm:grid-cols-2">{data.builds.map((entry) => <button type="button" key={entry.recipe.buildId} onClick={() => selectBuild(entry.recipe.buildId)} aria-pressed={buildId === entry.recipe.buildId} className={`rounded-2xl border p-5 text-left ${buildId === entry.recipe.buildId ? `${accent.border} ${accent.fill}` : "border-white/10 bg-slate-950/60"}`}>
        <p className="text-xs text-slate-400">{entry.rating ? <RatingBadge rating={entry.rating} /> : null}Підклас · {entry.rating?.context}</p>
        <h2 className="mt-3 font-rpg-display text-xl text-white">{entry.recipe.title}</h2>
        <p className="mt-2 text-sm text-slate-400">Авторський приклад RPGbot · старт на 1-му рівні</p>
        <p className="mt-2 text-xs text-amber-200">{entry.recipe.details!.incomplete.length} частини для завершення</p>
      </button>)}</section>
    </> : null}
    {build && classChosen ? <>
      <div className={`mx-auto h-10 w-px ${accent.strongFill}`} />
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3"><h2 className="font-rpg-display text-2xl text-white">Отримую на старті · рівень 1</h2><p className="text-sm text-slate-400">{scoresCustomized ? "Ваші зміни — власний варіант" : customized ? "Поєднання запропонованих варіантів" : "Поля з авторського прикладу"}</p></div>
      <p className="mb-4 text-sm text-slate-400">Очок купівлі лишилося: {countRemainingBuildPoints(scores)} / 27</p>
      <BuildTreeNodes build={build} raceId={raceId} onRaceChange={chooseRace} scores={scores} onScoresChange={changeScores} />
      <div className="my-8 rounded-2xl border border-white/10 bg-slate-950/70 p-5">
        <h2 className="font-rpg-display text-2xl text-white">Планую пізніше · рівні 2–20</h2>
        <p className="mt-2 text-sm text-slate-400">Підклас із 3-го рівня, наступні риси та ASI плануються. Складання зараз створює чернетку 1-го рівня.</p>
        {scoresCustomized ? <p className="mt-2 text-sm text-amber-200">Нижче — вихідний план RPGbot. Узгодьте ASI з вашими зміненими характеристиками.</p> : null}
        <details className="mt-3"><summary className="min-h-11 cursor-pointer py-2 text-slate-200">Показати порядок рівнів</summary>
          <ol className="mt-3 space-y-3 border-l border-white/20 pl-4">{resolveBuildLevelPlans(build, raceId).filter((step) => step.level > 1).map((step) => <li key={step.level} className="text-sm text-slate-300"><span className={accent.text}>Рівень {step.level} · планується</span><p className="mt-1 whitespace-pre-line">{step.text}</p></li>)}</ol>
          <BuildSource text="Послідовність розвитку наведено в авторській таблиці рівнів." refs={build.recipe.progression[0].sourceRefs} ruleset={data.ruleset} />
        </details>
      </div>
      <section className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-5">
        <h2 className="font-rpg-display text-xl text-amber-100">Що ще треба завершити</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-300">{build.recipe.details!.incomplete.map((item) => <li key={item.field}><strong>{item.field}.</strong> {item.reason}</li>)}</ul>
        <label className="mt-5 block text-sm text-slate-300">Власні нотатки<textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-2 min-h-20 w-full rounded-lg border border-white/15 bg-slate-950 p-3" placeholder="Збережуться під час зміни пресета" /></label>
        {confirmReplacement ? <div role="alert" className="mt-5 rounded-lg border border-amber-400/30 p-4">
          <p className="text-sm text-amber-100">У конструкторі є ваша ручна чернетка. Збережемо її копію перед заміною.</p>
          <div className="mt-3 flex flex-wrap gap-3"><button type="button" onClick={() => assembleBuild(true)} className="min-h-11 rounded-lg border border-white/20 px-4 text-white">Зберегти копію й застосувати</button><button type="button" onClick={cancelReplacement} className="min-h-11 px-4 text-slate-300">Скасувати</button></div>
        </div> : null}
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button type="button" disabled={assembling || scores.length !== 6 || countRemainingBuildPoints(scores) < 0} onClick={() => assembleBuild()} className={`min-h-12 rounded-xl border px-6 py-3 font-rpg-display text-lg text-white ${accent.border} ${accent.strongFill} ${assembling ? "assemble-flash" : ""}`}>{assembling ? "Персонаж складається…" : "Зібрати персонажа"}</button>
          <ModeLink prefetch={false} href={buildRecipeGuideHref(build.recipe)} target="_blank" rel="noreferrer" {...buildRpgbotCtaProps("open_full_example", "build_tree", build.recipe.buildId)} className="min-h-11 py-2 text-sm text-slate-300 underline">Повний авторський приклад ↗</ModeLink>
          {hasBackup ? <button type="button" onClick={restoreDraft} className="min-h-11 text-sm text-slate-300 underline">Повернути попередню чернетку</button> : null}
        </div>
        <p className="mt-3 text-xs text-slate-400">Жодного запису в БД до явного підтвердження в конструкторі.</p>
      </section>
    </> : null}
    {assembling ? <div aria-hidden="true" className="assemble-flash pointer-events-none fixed inset-0 z-50 bg-arcane-400/10" /> : null}
  </main>;
}
