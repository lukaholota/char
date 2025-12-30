"use client";

import { raceTranslations, raceTranslationsEng, sourceTranslations } from "@/lib/refs/translation";
import clsx from "clsx";
import { useStepForm } from "@/hooks/useStepForm";
import { raceSchema } from "@/lib/zod/schemas/persCreateSchema";
import { RaceAC, RaceASI, RaceI } from "@/lib/types/model-types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useCallback } from "react";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { RaceInfoModal } from "@/lib/components/characterCreator/modals/RaceInfoModal";
import { SourceBadge } from "@/lib/components/characterCreator/SourceBadge";
import {
  formatArmorProficiencies,
  formatASI,
  formatList,
  formatLanguages,
  formatSkillProficiencies,
  formatToolProficiencies,
  formatWeaponProficiencies,
  translateValue,
} from "@/lib/components/characterCreator/infoUtils";
import { FormattedDescription } from "@/components/ui/FormattedDescription";

const normalizeText = (value?: string) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const formatSpeeds = (race: RaceI) => {
  const speeds = [
    { label: "Ходьба", value: race.speed },
    { label: "Лазіння", value: race.climbSpeed },
    { label: "Плавання", value: race.swimSpeed },
    { label: "Політ", value: race.flightSpeed },
    { label: "Риття", value: race.burrowSpeed },
  ].filter((item) => (item.value ?? 0) > 0 || (item.label === "Ходьба" && item.value != null));

  return speeds
    .map((item) => `${item.label}: ${item.value} фт`)
    .join(" • ");
};

const formatRaceAC = (ac?: RaceAC | null) => {
  if (!ac) return "10";
  if ("consistentBonus" in ac) {
    return `+${ac.consistentBonus} до КБ`;
  }
  const bonus = ac.bonus ? ` + ${ac.bonus}` : "";
  return `База ${ac.base}${bonus}`;
};

interface Props {
  races: RaceI[]
  formId: string
  onNextDisabledChange?: (disabled: boolean) => void
}

export const RacesForm = (
  {races, formId, onNextDisabledChange}: Props
) => {
  const { updateFormData, nextStep } = usePersFormStore();
  
  const {form, onSubmit} = useStepForm(raceSchema, (data) => {
    updateFormData({ 
      raceId: data.raceId,
      raceSearch: data.raceSearch 
    });
    nextStep();
  });

  const chosenRaceId = form.watch('raceId') || 0
  const raceSearch = form.watch('raceSearch') || ''
  const normalizedRaceSearch = useMemo(() => normalizeText(raceSearch), [raceSearch])

  useEffect(() => {
    if (!chosenRaceId) {
      onNextDisabledChange?.(true);
      return;
    }
    onNextDisabledChange?.(false);
  }, [onNextDisabledChange, chosenRaceId]);

  const matchesSearch = useCallback((raceName: string) => {
    if (!normalizedRaceSearch) return true;
    const ua = normalizeText(raceTranslations[raceName]);
    const eng = normalizeText(raceTranslationsEng[raceName]);
    return ua.includes(normalizedRaceSearch) || eng.includes(normalizedRaceSearch);
  }, [normalizedRaceSearch]);

  const sourceLabel = (race: RaceI) => sourceTranslations[race.source as keyof typeof sourceTranslations] ?? race.source;

  const coreRaces = useMemo(
    () => races
      .filter(r => r.name.endsWith('2014'))
      .filter(r => matchesSearch(r.name))
      .sort((a, b) => (a.sortOrder - b.sortOrder) || (a.raceId - b.raceId)),
    [races, matchesSearch]
  );
  const otherRaces = useMemo(
    () => races
      .filter(r => !r.name.endsWith('2014'))
      .filter(r => matchesSearch(r.name))
      .sort((a, b) => (a.sortOrder - b.sortOrder) || (a.raceId - b.raceId)),
    [races, matchesSearch]
  );

  const hasNoResults = !coreRaces.length && !otherRaces.length;
  const forceOpenOther = Boolean(normalizedRaceSearch);

  return (
    <form id={formId} onSubmit={onSubmit} className="w-full space-y-4">
      <div className="space-y-2 text-center">
        <h2 className="font-rpg-display text-3xl font-semibold uppercase tracking-widest text-slate-200 sm:text-4xl">
          Оберіть расу
        </h2>
        <p className="text-sm text-slate-400">Натисніть на картку, щоб продовжити.</p>
      </div>

      <div className="glass-panel border-gradient-rpg rounded-xl p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              type="search"
              {...form.register('raceSearch')}
              value={raceSearch}
              onChange={(e) => form.setValue('raceSearch', e.target.value)}
              placeholder="Пошук за назвою"
              aria-label="Пошук раси"
              className="h-10 border-white/10 bg-white/5 pl-9 pr-10 text-sm text-slate-100 placeholder:text-slate-400 focus-visible:ring-cyan-400/30"
            />
            {raceSearch && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1.5 top-1/2 h-7 w-7 -translate-y-1/2 text-slate-400 hover:text-white"
                onClick={() => form.setValue('raceSearch', '')}
                aria-label="Очистити пошук рас"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {hasNoResults && (
        <p className="text-center text-sm text-slate-400">Нічого не знайдено.</p>
      )}

      <div className="space-y-3">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">PHB 2014</p>
            <Badge variant="outline" className="border-white/15 bg-white/5 text-slate-200">Джерело</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {coreRaces.map(r =>  (
              <Card
                key={r.raceId}
                className={clsx(
                  "glass-card cursor-pointer transition-all duration-200",
                  r.raceId === chosenRaceId && "glass-active"
                )}
                onClick={(e) => {
                  if ((e.target as HTMLElement | null)?.closest?.('[data-stop-card-click]')) return;
                  if (r.raceId !== chosenRaceId) {
                    updateFormData({
                      subraceId: undefined,
                      raceVariantId: null,
                      raceChoiceSelections: {},
                      featId: undefined,
                      featChoiceSelections: {},
                      racialBonusChoiceSchema: undefined,
                    });
                  }
                  form.setValue('raceId', r.raceId);
                }}
              >
                <CardContent className="relative flex items-center justify-between p-4">
                  <RaceInfoModal race={r} />
                  <div>
                    <div className="text-lg font-semibold text-white">{raceTranslations[r.name]}</div>
                    <div className="text-xs text-slate-400">{raceTranslationsEng[r.name]}</div>
                  </div>
                  <SourceBadge code={r.source} active={r.raceId === chosenRaceId} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <details className="glass-panel border-gradient-rpg rounded-xl" open={forceOpenOther || undefined}>
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-white hover:bg-white/5 [&::-webkit-details-marker]:hidden">
            Інші джерела
          </summary>
          <div className="border-t border-white/10 p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {otherRaces.map(r =>  (
                <Card
                  key={r.raceId}
                  className={clsx(
                    "glass-card cursor-pointer transition-all duration-200",
                    r.raceId === chosenRaceId && "glass-active"
                  )}
                  onClick={(e) => {
                    if ((e.target as HTMLElement | null)?.closest?.('[data-stop-card-click]')) return;
                    if (r.raceId !== chosenRaceId) {
                      updateFormData({
                        subraceId: undefined,
                        raceVariantId: null,
                        raceChoiceSelections: {},
                        featId: undefined,
                        featChoiceSelections: {},
                        racialBonusChoiceSchema: undefined,
                      });
                    }
                    form.setValue('raceId', r.raceId);
                  }}
                >
                  <CardContent className="relative flex items-center justify-between p-4">
                    <RaceInfoModal race={r} />
                    <div>
                      <div className="text-lg font-semibold text-white">{raceTranslations[r.name]}</div>
                      <div className="text-xs text-slate-400">{raceTranslationsEng[r.name]}</div>
                    </div>
                    <SourceBadge code={r.source} active={r.raceId === chosenRaceId} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </details>
      </div>

      <input
        type="hidden"
        {...form.register("raceId", {
          setValueAs: (value) => {
            if (value === "" || value === undefined || value === null) return undefined;
            const num = typeof value === "number" ? value : Number(value);
            return Number.isFinite(num) ? num : undefined;
          },
        })}
      />
    </form>
  )
};

export default RacesForm;
