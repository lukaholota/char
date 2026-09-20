"use client";

// import type {Background} from "@prisma/client"
import {
  backgroundTranslations, backgroundTranslationsEng, featTranslations,
} from "@/lib/refs/translation";
import {useStepForm} from "@/hooks/useStepForm";
import {backgroundSchema} from "@/lib/zod/schemas/persCreateSchema";
import { useEffect, useMemo, useCallback } from "react";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { BackgroundInfoModal, type OriginFeat } from "@/lib/components/characterCreator/modals/BackgroundInfoModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BackgroundI, FeatPrisma } from "@/lib/types/model-types";
import {Source} from "@prisma/client";
import { CreationCard } from "@/components/characterCreator/CreationCard";
import { formatSkillProficiencies } from "@/lib/components/characterCreator/infoUtils";
import { getBackgroundCreationVisual } from "@/components/characterCreator/creation-visuals";

const normalizeText = (value?: string) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

// parseItems removed as it was unused

interface Props {
  backgrounds: BackgroundI[]
  feats: FeatPrisma[]
  formId: string
  onNextDisabledChange?: (disabled: boolean) => void
}

const PHB_BACKGROUNDS = new Set([
  "ACOLYTE","CHARLATAN","CRIMINAL","ENTERTAINER","FOLK_HERO","GUILD_ARTISAN","GUILD_MERCHANT",
  "HERMIT","NOBLE","OUTLANDER","SAGE","SAILOR","SOLDIER","URCHIN", "PIRATE", "SPY", "KNIGHT", "GLADIATOR", 
]);

export const BackgroundsForm = (
  {backgrounds, feats, formId, onNextDisabledChange}: Props
) => {
  const { updateFormData, nextStep } = usePersFormStore();
  
  const {form, onSubmit} = useStepForm(backgroundSchema, (data) => {
    updateFormData({ 
      backgroundId: data.backgroundId,
      backgroundSearch: data.backgroundSearch 
    });
    nextStep();
  });

  const chosenBackgroundId = form.watch('backgroundId') || 0
  const backgroundSearch = form.watch('backgroundSearch') || ''
  const normalizedBackgroundSearch = useMemo(() => normalizeText(backgroundSearch), [backgroundSearch])

  useEffect(() => {
    if (!chosenBackgroundId) {
      onNextDisabledChange?.(true);
      return;
    }
    onNextDisabledChange?.(false);
  }, [onNextDisabledChange, chosenBackgroundId]);

  const matchesSearch = useCallback((background: BackgroundI) => {
    if (!normalizedBackgroundSearch) return true;
    return collectSearchableTerms(background, feats)
      .some((term) => normalizeText(term).includes(normalizedBackgroundSearch));
  }, [normalizedBackgroundSearch, feats]);

  const getLabel = useCallback((name: string) => backgroundTranslations[name] || backgroundTranslationsEng[name] || name, []);

  const is2024 = useMemo(() => backgrounds.some((b) => b.ruleset === "RULES_2024" || b.source === Source.PHB_2024), [backgrounds]);

  const primaryBackgrounds = useMemo(
    () => backgrounds
      .filter(b => is2024 ? true : PHB_BACKGROUNDS.has(b.name))
      .filter(b => matchesSearch(b))
      .sort((a, b) => getLabel(a.name).localeCompare(getLabel(b.name), 'uk')),
    [backgrounds, is2024, matchesSearch, getLabel]
  );
  const otherBackgrounds = useMemo(
    () => is2024 ? [] : backgrounds
      .filter(b => b.source !== Source.PHB_2024)
      .filter(b => !PHB_BACKGROUNDS.has(b.name))
      .filter(b => matchesSearch(b))
      .sort((a, b) => getLabel(a.name).localeCompare(getLabel(b.name), 'uk')),
    [backgrounds, is2024, matchesSearch, getLabel]
  );

  const hasNoResults = !primaryBackgrounds.length && !otherBackgrounds.length;
  const forceOpenOther = Boolean(normalizedBackgroundSearch);

  const renderBackgroundCard = (b: BackgroundI) => {
    const originFeat = findOriginFeat(feats, b.originFeatId);

    return (
      <CreationCard
        key={b.backgroundId}
        testId={`background-${b.name}`}
        title={getLabel(b.name)}
        englishTitle={backgroundTranslationsEng[b.name]}
        note={describeBackgroundSkills(b)}
        secondaryNote={describeBackgroundFeature(b, originFeat)}
        visual={getBackgroundCreationVisual(b.name)}
        isSelected={b.backgroundId === chosenBackgroundId}
        is2024={b.ruleset === "RULES_2024"}
        infoModal={<BackgroundInfoModal background={b} originFeat={describeOriginFeat(originFeat)} />}
        onClick={(e) => {
          if ((e.target as HTMLElement | null)?.closest?.('[data-stop-card-click]')) return;
          form.setValue('backgroundId', b.backgroundId);
        }}
      />
    );
  };

  return (
    <form id={formId} onSubmit={onSubmit} className="w-full space-y-4">
      <div className="space-y-2 text-center">
        <h2 className="font-rpg-display text-3xl font-semibold uppercase tracking-widest text-slate-200 sm:text-4xl">
          Оберіть передісторію
        </h2>
        <p className="text-sm text-slate-400">
          {is2024 ? "Варіанти походження з Книги Гравця (2024)." : "Спершу показані варіанти з Книги Гравця (2014), решта в акордеоні нижче."}
        </p>
      </div>

      <div className="glass-panel border-gradient-rpg rounded-xl p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              type="search"
              {...form.register('backgroundSearch')}
              value={backgroundSearch}
              onChange={(e) => form.setValue('backgroundSearch', e.target.value)}
              placeholder="Пошук за назвою"
              aria-label="Пошук передісторій"
              className="h-10 border-white/10 bg-white/5 pl-9 pr-10 text-sm text-slate-100 placeholder:text-slate-400 focus-visible:ring-arcane-400/30"
            />
            {backgroundSearch && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1.5 top-1/2 h-7 w-7 -translate-y-1/2 text-slate-400 hover:text-white"
                onClick={() => form.setValue('backgroundSearch', '')}
                aria-label="Очистити пошук передісторій"
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

      <div className="space-y-4">
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">{is2024 ? "Книга Гравця (2024)" : "Книга Гравця (2014)"}</p>
            <Badge variant="outline" className="border-white/15 bg-white/5 text-slate-200">Джерело</Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {primaryBackgrounds.map(renderBackgroundCard)}
          </div>
        </div>

        {otherBackgrounds.length > 0 && (
          <details className="glass-panel border-gradient-rpg rounded-xl" open={forceOpenOther || undefined}>
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-white hover:bg-white/5 [&::-webkit-details-marker]:hidden">
              Інші джерела
            </summary>
            <div className="border-t border-white/10 p-3.5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
                {otherBackgrounds.map(renderBackgroundCard)}
              </div>
            </div>
          </details>
        )}
      </div>

      <input
        type="hidden"
        {...form.register("backgroundId", {
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

export default BackgroundsForm;

/// Навички — перше, за чим передісторії порівнюють, а до картки модалки ще треба дійти.
function describeBackgroundSkills(background: BackgroundI) {
  const skills = formatSkillProficiencies(background.skillProficiencies);
  return skills === "—" ? null : skills;
}

function findOriginFeat(feats: FeatPrisma[], featId: number | null): FeatPrisma | undefined {
  if (!featId) return undefined;
  return feats.find((candidate) => candidate.featId === featId);
}

function describeOriginFeat(feat?: FeatPrisma): OriginFeat | undefined {
  if (!feat) return undefined;
  return { name: findFeatLabel(feat), description: feat.description };
}

function findFeatLabel(feat: FeatPrisma) {
  return featTranslations[feat.name] ?? feat.name;
}

/// Риса — друге, за чим передісторії порівнюють: у 2024 вона вирішує білд, у 2014 задає те,
/// що персонаж уміє поза кубиками. Назва редакційна: модалка зве їх так само.
function describeBackgroundFeature(background: BackgroundI, originFeat?: FeatPrisma) {
  if (originFeat) return `Риса: ${findFeatLabel(originFeat)}`;
  if (background.specialAbilityName) return `Особливість: ${background.specialAbilityName}`;
  return null;
}

/// Пошук бере ті самі поля, що й пошук рис: українську назву й англійську, — плюс назву риси
/// передісторії, бо гравці шукають передісторію саме за нею («хто дає Пильного»).
function collectSearchableTerms(background: BackgroundI, feats: FeatPrisma[]) {
  const originFeat = findOriginFeat(feats, background.originFeatId);

  return [
    backgroundTranslations[background.name],
    backgroundTranslationsEng[background.name],
    originFeat && findFeatLabel(originFeat),
    originFeat?.engName,
    background.specialAbilityName,
  ].filter(Boolean) as string[];
}
