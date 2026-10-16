"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ReadyPresetPageData } from "@/lib/optimization/ready-preset.server";
import { NameGeneratorOptionsPanel, useCharacterNameGenerator } from "@/lib/components/characterCreator/NameGenerator";
import { LevelPicker } from "./ReadyPresetLevels";
import { ReadyPresetLevelSummary } from "./ReadyPresetLevelSummary";

export function PresetLevelChoice({ data, targetLevel, onSelect }: { data: ReadyPresetPageData; targetLevel: number; onSelect: (level: number) => void }) {
  return <>
    {data.levels ? <LevelPicker levels={data.levels} selected={targetLevel} onSelect={onSelect} /> : <p className="mt-4 text-slate-300">1-й рівень</p>}
    {data.levels && targetLevel > 1
      ? <ReadyPresetLevelSummary levels={data.levels} targetLevel={targetLevel} advancements={{}} classOptionChoices={{}} />
      : <p className="mt-4 text-sm leading-relaxed text-slate-300">{describeSubclassStatus(data, 1)}</p>}
  </>;
}

export function PresetNameField({ name, onChange }: { name: string; onChange: (name: string) => void }) {
  const { currentName, generateName, options } = useCharacterNameGenerator();
  const suggested = useRef("");
  useEffect(() => {
    if (!currentName || (name && name !== suggested.current)) return;
    suggested.current = currentName;
    if (name !== currentName) onChange(currentName);
  }, [currentName, name, onChange]);
  function suggestAnotherName() {
    const next = generateName();
    if (!next) return;
    suggested.current = next;
    onChange(next);
  }
  return <>
    <label htmlFor="ready-preset-name" className="text-slate-200">Імʼя персонажа</label>
    <div className="mt-2 flex gap-2">
      <Input id="ready-preset-name" maxLength={100} aria-required="true" autoComplete="off" value={name} onChange={(event) => onChange(event.target.value)} placeholder="Наприклад, Мирон" className="min-h-12 text-base" />
      <Button type="button" variant="outline" size="icon" disabled={!currentName} onClick={suggestAnotherName} title="Згенерувати інше імʼя" aria-label="Згенерувати інше імʼя" className="h-12 w-12 shrink-0 border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"><RefreshCw className="h-4 w-4" /></Button>
    </div>
    <details className="mt-2">
      <summary className="flex min-h-11 cursor-pointer items-center text-sm text-slate-400">Параметри генератора імен</summary>
      <div className="mt-2"><NameGeneratorOptionsPanel {...options} /></div>
    </details>
  </>;
}

export function PresetRecap({ data, targetLevel }: { data: ReadyPresetPageData; targetLevel: number }) {
  return <div className="my-6 rounded-xl bg-white/5 p-4">
    <p className="text-lg text-white">{data.preset.title}</p>
    <p className="mt-2 text-sm text-slate-300">{describeCharacterLevel(data, targetLevel)} · {data.summary.raceName} · {data.summary.backgroundName}</p>
    <p className="mt-2 text-sm text-slate-400">{describeSubclassStatus(data, targetLevel)}</p>
  </div>;
}

export function PresetReviewActions({ formId, status, isSubmitting, onCustomize }: { formId: string; status: ReactNode; isSubmitting: boolean; onCustomize: () => void }) {
  return <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-[60] px-2 pb-3 md:static md:px-0 md:pb-0">
    <div className="glass-panel border-gradient-rpg mx-auto w-full max-w-3xl rounded-xl p-2.5 shadow-xl shadow-black/40 backdrop-blur-2xl md:rounded-2xl md:p-5 md:shadow-none">
      {status}
      <div className="flex gap-2">
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={onCustomize} className="min-h-12 shrink-0 px-4">Налаштувати</Button>
        <Button type="submit" form={formId} disabled={isSubmitting} className="min-h-12 flex-1 text-base">{isSubmitting ? "Створюємо…" : "Створити за гайдом"}</Button>
      </div>
    </div>
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
