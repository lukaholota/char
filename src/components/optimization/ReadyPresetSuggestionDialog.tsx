"use client";

import { ArrowRight, Check, UserRound, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CatalogIllustrationCard } from "@/components/catalogs/CatalogIllustrationCard";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useIsArtHidden } from "@/components/no-ai/ContentImage";
import { ModeLink } from "@/components/no-ai/ModeLink";
import { captureRpgbotEvent } from "@/lib/monitoring/rpgbot-analytics";
import { findPresetCardTitle, findPresetGeneratedSrc, findPresetImageSrc } from "@/lib/optimization/ready-preset-catalog";
import type { PresetSuggestion, PresetSuggestionQuery } from "@/lib/optimization/ready-preset-suggestion";

type Props = {
  suggestion: PresetSuggestion;
  total: number;
  query: PresetSuggestionQuery;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onContinue: (targetLevel: number) => void;
};

export function ReadyPresetSuggestionDialog({ suggestion, total, query, isOpen, onOpenChange, onContinue }: Props) {
  const { entry } = suggestion;
  const [targetLevel, setTargetLevel] = useState(1);
  const [isChangingLevel, setIsChangingLevel] = useState(false);
  const isGeneratedArtHidden = useIsArtHidden(findPresetGeneratedSrc(entry));
  const galleryHref = `/char/presets?${new URLSearchParams({ class: entry.className })}`;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="border-gradient-rpg max-h-[90dvh] overflow-y-auto bg-slate-950 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">Готовий персонаж для вашого вибору</DialogTitle>
          <DialogDescription className="sr-only text-slate-400 sm:not-sr-only">Збірка за прикладом RPGbot. Характеристики, навички та спорядження вже заповнені.</DialogDescription>
        </DialogHeader>
        <CatalogIllustrationCard
          imageSrc={findPresetImageSrc(entry, isGeneratedArtHidden)}
          title={findPresetCardTitle(entry)}
          accessibleTitle={entry.title}
          titleClassName="truncate text-xl normal-case tracking-normal sm:text-2xl"
          fallbackIcon={UserRound}
          is2024={false}
          isSelected={false}
          onSelect={() => onContinue(targetLevel)}
          meta={<span>{entry.classLabel} · {entry.raceName}</span>}
        />
        <p className="text-sm leading-relaxed text-slate-300">{entry.description}</p>
        <MatchSummary suggestion={suggestion} query={query} />
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-400">
          {isChangingLevel ? (
            <label className="flex items-center gap-2">
              Рівень
              <select
                value={targetLevel}
                onChange={(event) => {
                  const level = Number(event.target.value);
                  captureRpgbotEvent("rpgbot_preset_level_selected", { preset_id: entry.buildId, level, from_level: targetLevel, placement: "suggestion_dialog" });
                  setTargetLevel(level);
                }}
                className="min-h-11 rounded-lg border border-white/15 bg-slate-950/60 px-3 text-slate-100"
              >
                {Array.from({ length: entry.maxLevel }, (_, index) => index + 1).map((level) => <option key={level} value={level}>{level}</option>)}
              </select>
            </label>
          ) : (
            <span>
              Рівень: {targetLevel}
              {entry.maxLevel > 1 ? <Button type="button" variant="link" className="min-h-11 px-2 text-arcane-200" onClick={() => setIsChangingLevel(true)}>змінити</Button> : null}
            </span>
          )}
          {total > 1 ? <ModeLink prefetch={false} href={galleryHref} className="min-h-11 content-center text-arcane-200 underline-offset-2 hover:underline">Ще {total - 1} для цього класу</ModeLink> : null}
        </div>
        <DialogFooter className="flex-row gap-2 sm:gap-0">
          <Button type="button" variant="ghost" className="min-h-11 flex-1 text-slate-300 hover:text-white sm:flex-none" onClick={() => onOpenChange(false)}>Відмовитися</Button>
          <Button type="button" className="min-h-11 flex-1 sm:flex-none" onClick={() => onContinue(targetLevel)}>Продовжити <ArrowRight className="ml-2 h-4 w-4" /></Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MatchSummary({ suggestion, query }: { suggestion: PresetSuggestion; query: PresetSuggestionQuery }) {
  const { entry, isSubclassMatch, isRaceMatch } = suggestion;
  const checks = [
    { label: "Клас", isMatch: true },
    ...(query.subclassKey ? [{ label: "Підклас", isMatch: isSubclassMatch }] : []),
    ...(query.raceKey ? [{ label: "Раса", isMatch: isRaceMatch }] : []),
  ];
  const hasMismatch = checks.some((check) => !check.isMatch);
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-slate-200">
        {checks.map((check) => (
          <li key={check.label} className="flex items-center gap-1.5">
            {check.isMatch ? <Check aria-hidden="true" className="h-4 w-4 text-emerald-300" /> : <X aria-hidden="true" className="h-4 w-4 text-amber-300" />}
            {check.label} {check.isMatch ? "збігається" : "відрізняється"}
          </li>
        ))}
      </ul>
      {hasMismatch ? <p className="mt-2 text-xs leading-relaxed text-slate-400">У цієї збірки {!isSubclassMatch && query.subclassKey ? `підклас «${entry.subclassName}»` : ""}{!isSubclassMatch && query.subclassKey && !isRaceMatch && query.raceKey ? " і " : ""}{!isRaceMatch && query.raceKey ? `раса «${entry.raceName}»` : ""}. Автор будував її саме під це, тому ми нічого не підмінюємо.</p> : null}
    </div>
  );
}
