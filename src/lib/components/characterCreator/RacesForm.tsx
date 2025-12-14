"use client";

import { raceTranslations, raceTranslationsEng, sourceTranslations } from "@/lib/refs/translation";
import clsx from "clsx";
import { useStepForm } from "@/hooks/useStepForm";
import { raceSchema } from "@/lib/zod/schemas/persCreateSchema";
import { RaceAC, RaceASI, RaceI } from "@/lib/types/model-types";
import { Card, CardContent } from "@/lib/components/ui/card";
import { Badge } from "@/lib/components/ui/badge";
import { Button } from "@/lib/components/ui/Button";
import { Input } from "@/lib/components/ui/input";
import { Search, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import {
  InfoDialog,
  InfoGrid,
  InfoPill,
  InfoSectionTitle,
} from "@/lib/components/characterCreator/EntityInfoDialog";
import { SourceBadge } from "@/lib/components/characterCreator/SourceBadge";
import {
  formatArmorProficiencies,
  formatList,
  formatLanguages,
  formatSkillProficiencies,
  formatToolProficiencies,
  formatWeaponProficiencies,
  prettifyEnum,
} from "@/lib/components/characterCreator/infoUtils";

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
  ].filter((item) => (item.value ?? 0) > 0 || item.label === "Ходьба");

  return speeds
    .map((item) => `${item.label}: ${item.value} фт`)
    .join(" • ");
};

const formatRaceAC = (ac?: RaceAC | null) => {
  if (!ac) return "10";
  if ("consistentBonus" in ac) {
    return `+${ac.consistentBonus} до КЗ`;
  }
  const bonus = ac.bonus ? ` + ${ac.bonus}` : "";
  return `База ${ac.base}${bonus}`;
};

const formatASI = (asi?: RaceASI | null) => {
  if (!asi) return "—";

  const fixedEntries = Object.entries(asi.basic?.simple || {});
  const basicFlexible = asi.basic?.flexible?.groups || [];
  const tashaFlexible = asi.tasha?.flexible?.groups || [];

  const parts: string[] = [];

  if (fixedEntries.length) {
    parts.push(
      `Фіксовано: ${fixedEntries
        .map(([stat, value]) => `${prettifyEnum(stat)} +${value}`)
        .join(", ")}`
    );
  }

  if (basicFlexible.length) {
    parts.push(
      `Гнучко: ${basicFlexible
        .map(
          (group) =>
            `${group.groupName} (+${group.value}, оберіть ${group.choiceCount})`
        )
        .join("; ")}`
    );
  }

  if (tashaFlexible.length) {
    parts.push(
      `За Та́шею: ${tashaFlexible
        .map(
          (group) =>
            `${group.groupName} (+${group.value}, оберіть ${group.choiceCount})`
        )
        .join("; ")}`
    );
  }

  return parts.join(" • ") || "—";
};

interface Props {
  races: RaceI[]
  formId: string
  onNextDisabledChange?: (disabled: boolean) => void
}

export const RacesForm = (
  {races, formId, onNextDisabledChange}: Props
) => {
  const {form, onSubmit} = useStepForm(raceSchema)

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

  const matchesSearch = (raceName: string) => {
    if (!normalizedRaceSearch) return true;
    const ua = normalizeText(raceTranslations[raceName]);
    const eng = normalizeText(raceTranslationsEng[raceName]);
    return ua.includes(normalizedRaceSearch) || eng.includes(normalizedRaceSearch);
  };

  const sourceLabel = (race: RaceI) => sourceTranslations[race.source] ?? race.source;

  const RaceInfoModal = ({ race }: { race: RaceI }) => {
    const rawTraits = race.traits || [];
    const traitList = [...rawTraits].sort(
      (a, b) => (a.raceTraitId || 0) - (b.raceTraitId || 0)
    );

    return (
      <InfoDialog
        title={raceTranslations[race.name] || race.name}
        triggerLabel={`Показати деталі ${raceTranslations[race.name] ?? race.name}`}
      >
        <InfoGrid>
          <InfoPill label="Джерело" value={sourceLabel(race)} />
          <InfoPill label="Розмір" value={formatList(race.size)} />
          <InfoPill label="Швидкості" value={formatSpeeds(race)} />
          <InfoPill label="Базовий КЗ" value={formatRaceAC(race.ac)} />
          <InfoPill label="Бонуси характеристик" value={formatASI(race.ASI)} />
          <InfoPill
            label="Мови"
            value={formatLanguages(race.languages, race.languagesToChooseCount)}
          />
          <InfoPill
            label="Навички"
            value={formatSkillProficiencies(race.skillProficiencies)}
          />
          <InfoPill
            label="Інструменти"
            value={formatToolProficiencies(race.toolProficiencies, race.toolToChooseCount)}
          />
          <InfoPill
            label="Зброя"
            value={formatWeaponProficiencies(race.weaponProficiencies)}
          />
          <InfoPill
            label="Броня"
            value={formatArmorProficiencies(race.armorProficiencies)}
          />
        </InfoGrid>

        <div className="space-y-2">
          <InfoSectionTitle>Риси</InfoSectionTitle>
          {traitList.length ? (
            traitList.map((trait) => (
              <div
                key={trait.raceTraitId || trait.feature.featureId}
                className="rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2.5 shadow-inner"
              >
                <p className="text-sm font-semibold text-white">{trait.feature.name}</p>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200/90">
                  {trait.feature.description}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">Для цієї раси ще немає опису рис.</p>
          )}
        </div>
      </InfoDialog>
    );
  };

  const coreRaces = useMemo(
    () => races
      .filter(r => r.name.endsWith('2014'))
      .filter(r => matchesSearch(r.name))
      .sort((a, b) => (a.sortOrder - b.sortOrder) || (a.raceId - b.raceId)),
    [races, normalizedRaceSearch]
  );
  const otherRaces = useMemo(
    () => races
      .filter(r => !r.name.endsWith('2014'))
      .filter(r => matchesSearch(r.name))
      .sort((a, b) => (a.sortOrder - b.sortOrder) || (a.raceId - b.raceId)),
    [races, normalizedRaceSearch]
  );

  const hasNoResults = !coreRaces.length && !otherRaces.length;
  const forceOpenOther = Boolean(normalizedRaceSearch);

  return (
    <form id={formId} onSubmit={onSubmit} className="w-full space-y-4">
      <div className="space-y-2 text-center">
        <h2 className="text-xl font-semibold text-white">Оберіть расу</h2>
        <p className="text-sm text-slate-400">Натисніть на картку, щоб продовжити.</p>
      </div>

      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 shadow-inner sm:p-4">
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
              className="h-10 bg-slate-950/60 pl-9 pr-10 text-sm text-slate-100 placeholder:text-slate-500"
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
            <Badge variant="outline" className="border-slate-800 bg-slate-800/60 text-slate-200">Джерело</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {coreRaces.map(r =>  (
              <Card
                key={r.raceId}
                className={clsx(
                  "cursor-pointer border border-slate-800/80 bg-slate-900/70 transition hover:-translate-y-0.5 hover:border-indigo-500/60",
                  r.raceId === chosenRaceId && "border-indigo-400/80 bg-indigo-500/10 shadow-lg shadow-indigo-500/15"
                )}
                onClick={() => form.setValue('raceId', r.raceId)}
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

        <details className="rounded-xl border border-slate-800/80 bg-slate-900/60 shadow-inner" open={forceOpenOther || undefined}>
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800/80 [&::-webkit-details-marker]:hidden">
            Інші джерела
          </summary>
          <div className="border-t border-slate-800/80 p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {otherRaces.map(r =>  (
                <Card
                  key={r.raceId}
                  className={clsx(
                    "cursor-pointer border border-slate-800/80 bg-slate-900/70 transition hover:-translate-y-0.5 hover:border-indigo-500/60",
                    r.raceId === chosenRaceId && "border-indigo-400/80 bg-indigo-500/10 shadow-lg shadow-indigo-500/15"
                  )}
                  onClick={() => form.setValue('raceId', r.raceId)}
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

      <input type="hidden" {...form.register('raceId', { valueAsNumber: true })} />
    </form>
  )
};

export default RacesForm;
