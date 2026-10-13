"use client";

import { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, Check, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CatalogHeader } from "@/components/catalogs/CatalogHeader";
import { CatalogIllustrationCard } from "@/components/catalogs/CatalogIllustrationCard";
import { FilterChip } from "@/components/catalogs/FilterChip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModeLink } from "@/components/no-ai/ModeLink";
import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { useIsArtHidden } from "@/components/no-ai/ContentImage";
import { useCatalogUrlSync } from "@/hooks/useCatalogUrlSync";
import { getSearchParamsFromLocation, replaceUrlSearchParams } from "@/lib/catalog-url-helpers";
import { captureRpgbotEvent } from "@/lib/monitoring/rpgbot-analytics";
import { useRpgbotSurfaceView } from "@/lib/monitoring/use-rpgbot-surface-view";
import { AnalystAvatar } from "./AnalystAvatar";
import { useProgressiveList } from "./use-progressive-list";
import { buildQueryMatcher, buildSearchableText, matchesQuery } from "@/lib/search/searchQuery";
import { comparePresetClasses, findPresetCardTitle, findPresetGeneratedSrc, findPresetImageSrc, type ReadyPresetCatalogEntry } from "@/lib/optimization/ready-preset-catalog";

const FILTER_REPORT_DELAY_MS = 1000;
const ALL_RACES = "all";

function parsePresetSearch(params: URLSearchParams) {
  return { q: params.get("q") ?? "", className: params.get("class") ?? "", raceName: params.get("race") ?? "" };
}

function countPresets(presets: ReadyPresetCatalogEntry[], pickValue: (preset: ReadyPresetCatalogEntry) => string): [string, number][] {
  const counts = new Map<string, number>();
  for (const preset of presets) counts.set(pickValue(preset), (counts.get(pickValue(preset)) ?? 0) + 1);
  return [...counts];
}

function countPresetsByRace(presets: ReadyPresetCatalogEntry[]): [string, number][] {
  return countPresets(presets, (preset) => preset.baseRaceName).sort(([leftName, left], [rightName, right]) => right - left || leftName.localeCompare(rightName, "uk"));
}

function isPresetMatchingQuery(preset: ReadyPresetCatalogEntry, query: string): boolean {
  const matcher = buildQueryMatcher(query);
  return !matcher || matchesQuery(matcher, buildSearchableText([preset.title, findPresetCardTitle(preset), preset.description, preset.classLabel, preset.raceName, preset.subclassName, preset.sourceTitle, ...preset.searchAliases]));
}

export function ReadyPresetGallery({ presets }: { presets: ReadyPresetCatalogEntry[] }) {
  const { qInput, setQInput, selection, setSelection } = useCatalogUrlSync(parsePresetSearch);
  useRpgbotSurfaceView({ surface: "preset_gallery", item_count: presets.length });
  const query = selection.q.trim().toLocaleLowerCase("uk");
  const classCounts = countPresets(presets, (preset) => preset.className).sort(([left], [right]) => comparePresetClasses(left, right));
  const raceCounts = countPresetsByRace(presets.filter((preset) => !selection.className || preset.className === selection.className));
  const filtered = presets.filter((preset) => (!selection.className || preset.className === selection.className) && (!selection.raceName || preset.baseRaceName === selection.raceName) && isPresetMatchingQuery(preset, query))
    .sort((left, right) => comparePresetClasses(left.className, right.className));

  const { visibleCount, hasMore, showMore, watchEnd } = useProgressiveList(filtered.length, `${selection.className}|${selection.raceName}|${query}`);
  useReportGalleryFilter(selection.className, query, filtered.length);

  function selectClass(className: string) {
    const next = getSearchParamsFromLocation();
    if (className) next.set("class", className); else next.delete("class");
    replaceUrlSearchParams(next);
    setSelection((previous) => ({ ...previous, className }));
  }

  function selectRace(raceName: string) {
    const next = getSearchParamsFromLocation();
    if (raceName) next.set("race", raceName); else next.delete("race");
    replaceUrlSearchParams(next);
    setSelection((previous) => ({ ...previous, raceName }));
  }
  return <div className="mx-auto h-full min-h-0 w-full max-w-7xl overflow-y-auto px-3 pb-6 pt-3 sm:px-6 sm:pt-6">
    <ModeLink prefetch={false} href="/char/create" className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm text-slate-400"><ArrowLeft className="h-4 w-4" /> До конструктора</ModeLink>
    <CatalogHeader title="Готові персонажі" searchQuery={qInput} onSearchChange={setQInput} searchPlaceholder="Назва, клас, стиль гри…" />
    <div className="mb-6 flex items-center gap-4">
      <AnalystAvatar className="hidden sm:block" />
      <p className="max-w-2xl text-sm leading-relaxed text-slate-400">Оберіть персонажа, яким хочете грати. Характеристики, навички та спорядження вже заповнені. Можна одразу дати імʼя або налаштувати вибори.</p>
    </div>
    {classCounts.length > 1 ? <div role="group" aria-label="Клас" className="mb-4 flex flex-wrap gap-1.5"><FilterChip label={<ClassChipLabel text={`Усі · ${presets.length}`} selected={!selection.className} />} selected={!selection.className} onClick={() => selectClass("")} />{classCounts.map(([className, count]) => <FilterChip key={className} label={<ClassChipLabel text={`${className} · ${count}`} selected={selection.className === className} />} selected={selection.className === className} onClick={() => selectClass(className)} />)}</div> : null}
    {raceCounts.length > 1 ? <div className="mb-4 max-w-xs"><Select value={selection.raceName || ALL_RACES} onValueChange={(value) => selectRace(value === ALL_RACES ? "" : value)}>
      <SelectTrigger aria-label="Раса" className="min-h-11 w-full border-white/10 bg-white/5 text-slate-200"><SelectValue /></SelectTrigger>
      <SelectContent className="border-white/10"><SelectItem value={ALL_RACES}>Усі раси</SelectItem>{raceCounts.map(([raceName, count]) => <SelectItem key={raceName} value={raceName}>{`${raceName} · ${count}`}</SelectItem>)}</SelectContent>
    </Select></div> : null}
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span className="rounded-lg border border-arcane-400/25 bg-arcane-500/5 px-3 py-2 text-arcane-200">Правила 2014 · готові рекомендації</span><span role="status">Показано {filtered.length} з {presets.length}</span></div>
    {filtered.length ? <><ul aria-label="Готові персонажі" className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-3">{filtered.slice(0, visibleCount).map((preset, position) => <li key={preset.buildId}><ReadyPresetCard preset={preset} position={position} query={selection.q} catalogClass={selection.className} /></li>)}</ul>{hasMore ? <div ref={watchEnd} className="mt-6 flex justify-center"><Button variant="outline" onClick={showMore} className="min-h-11">Показати ще</Button></div> : null}</> : <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-6 py-12 text-center"><p className="text-slate-300">Персонажів не знайдено</p><p className="mt-2 text-sm text-slate-500">Спробуйте іншу назву, клас або стиль гри.</p>{qInput ? <Button variant="outline" onClick={() => setQInput("")} className="mt-5">Очистити пошук</Button> : null}</div>}
  </div>;
}

function useReportGalleryFilter(className: string, query: string, resultCount: number) {
  const isFirstFilter = useRef(true);
  useEffect(() => {
    if (isFirstFilter.current) { isFirstFilter.current = false; return; }
    const timer = window.setTimeout(() => captureRpgbotEvent("rpgbot_preset_gallery_filtered", { class_name: className, has_query: query !== "", result_count: resultCount }), FILTER_REPORT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [className, query, resultCount]);
}

function ClassChipLabel({ text, selected }: { text: string; selected: boolean }) {
  return <>{selected ? <Check aria-hidden="true" className="mr-1 inline h-3 w-3 align-[-0.1em]" /> : null}{text}</>;
}

function ReadyPresetCard({ preset, position, query, catalogClass }: { preset: ReadyPresetCatalogEntry; position: number; query: string; catalogClass: string }) {
  const router = useModeRouter();
  const isGeneratedArtHidden = useIsArtHidden(findPresetGeneratedSrc(preset));
  const imageSrc = findPresetImageSrc(preset, isGeneratedArtHidden);
  const params = new URLSearchParams({ preset: preset.slug, from: "gallery" });
  if (query) params.set("q", query);
  if (catalogClass) params.set("class", catalogClass);
  const href = `/char/create?${params}`;
  const selected = { preset_id: preset.buildId, position, class_filter: catalogClass, has_query: query.trim() !== "" };
  return <article className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 p-2">
    <CatalogIllustrationCard imageSrc={imageSrc} title={findPresetCardTitle(preset)} accessibleTitle={preset.title} titleClassName="truncate text-xl normal-case tracking-normal sm:text-2xl" fallbackIcon={UserRound} is2024={false} isSelected={false} onSelect={() => { captureRpgbotEvent("rpgbot_preset_selected", { ...selected, via: "card" }); router.push(href); }} meta={<span>{preset.classLabel} · {preset.raceName}</span>} />
    <div className="px-3 pb-3 pt-4"><p className="min-h-[4.5rem] text-sm leading-relaxed text-slate-300">{preset.description}</p><p className="mb-4 mt-3 text-xs text-slate-500">За прикладом RPGbot «{preset.sourceTitle}»</p><Button asChild variant="secondary" className="min-h-11 w-full border border-arcane-400/25"><ModeLink prefetch={false} href={href} onClick={() => captureRpgbotEvent("rpgbot_preset_selected", { ...selected, via: "button" })}>Переглянути персонажа <ArrowRight className="ml-2 h-4 w-4" /></ModeLink></Button></div>
  </article>;
}
