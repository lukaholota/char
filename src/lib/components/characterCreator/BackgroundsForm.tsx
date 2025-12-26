"use client";

// import type {Background} from "@prisma/client"
import {
  backgroundTranslations, backgroundTranslationsEng,
} from "@/lib/refs/translation";
import clsx from "clsx";
import {useStepForm} from "@/hooks/useStepForm";
import {backgroundSchema} from "@/lib/zod/schemas/persCreateSchema";
import { useEffect, useMemo, useCallback } from "react";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import {
  InfoDialog,
  InfoGrid,
  InfoPill,
  InfoSectionTitle,
} from "@/lib/components/characterCreator/EntityInfoDialog";
import { SourceBadge } from "@/lib/components/characterCreator/SourceBadge";
import {
  formatLanguages,
  formatSkillProficiencies,
  formatToolProficiencies,
  translateValue,
} from "@/lib/components/characterCreator/infoUtils";
import { BackgroundI } from "@/lib/types/model-types";

const normalizeText = (value?: string) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const parseItems = (items: unknown): string[] => {
  if (!Array.isArray(items)) return [];

  return (items as unknown[])
    .map((item) => {
      if (!item) return null;
      if (typeof item === "string") return item;
      if (typeof item === "object") {
        const name = (item as any).name;
        const quantity = (item as any).quantity;
        if (!name) return null;
        return quantity ? `${name} x${quantity}` : name;
      }
      return null;
    })
    .filter(Boolean) as string[];
};

interface Props {
  backgrounds: BackgroundI[]
  formId: string
  onNextDisabledChange?: (disabled: boolean) => void
}

const PHB_BACKGROUNDS = new Set([
  "ACOLYTE","CHARLATAN","CRIMINAL","ENTERTAINER","FOLK_HERO","GUILD_ARTISAN","GUILD_MERCHANT",
  "HERMIT","NOBLE","OUTLANDER","SAGE","SAILOR","SOLDIER","URCHIN"
]);

const SOURCE_OVERRIDES: Record<string, string> = {
  AZORIUS_FUNCTIONARY: "Ravnica",
  BOROS_LEGIONNAIRE: "Ravnica",
  DIMIR_OPERATIVE: "Ravnica",
  GOLGARI_AGENT: "Ravnica",
  GRUUL_ANARCH: "Ravnica",
  IZZET_ENGINEER: "Ravnica",
  ORZHOV_REPRESENTATIVE: "Ravnica",
  RAKDOS_CULTIST: "Ravnica",
  SELESNYA_INITIATE: "Ravnica",
  SIMIC_SCIENTIST: "Ravnica",
  LOREHOLD_STUDENT: "Strixhaven",
  PRISMARI_STUDENT: "Strixhaven",
  QUANDRIX_STUDENT: "Strixhaven",
  SILVERQUILL_STUDENT: "Strixhaven",
  WITHERBLOOM_STUDENT: "Strixhaven",
  ASTRAL_DRIFTER: "Spelljammer",
  WILDSPACER: "Spelljammer",
  FEYLOST: "Witchlight",
  WITCHLIGHT_HAND: "Witchlight",
  KNIGHT_OF_SOLAMNIA: "Dragonlance",
  MAGE_OF_HIGH_SORCERY: "Dragonlance",
};

export const BackgroundsForm = (
  {backgrounds, formId, onNextDisabledChange}: Props
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

  const BackgroundInfoModal = ({ background }: { background: BackgroundI }) => {
    const items = parseItems(background.items);
    const sourceText = sourceLabel(background.name);
    const resolvedSource = sourceText === "Інші джерела" && background.source
      ? translateValue(background.source)
      : sourceText;

    return (
      <InfoDialog
        title={backgroundTranslations[background.name] || background.name}
        triggerLabel={`Показати деталі ${backgroundTranslations[background.name] ?? background.name}`}
      >
        <InfoGrid>
          <InfoPill label="Джерело" value={resolvedSource} />
          <InfoPill
            label="Навички"
            value={formatSkillProficiencies(background.skillProficiencies)}
          />
          <InfoPill
            label="Інструменти"
            value={formatToolProficiencies(background.toolProficiencies)}
          />
          <InfoPill
            label="Мови"
            value={formatLanguages([], background.languagesToChooseCount)}
          />
          <InfoPill
            label="Особливість"
            value={background.specialAbilityName || "-"}
          />
        </InfoGrid>

        {items.length ? (
          <div className="space-y-1.5">
            <InfoSectionTitle>Стартове спорядження</InfoSectionTitle>
            <ul className="space-y-1 text-sm text-slate-200/90">
              {items.map((item, index) => (
                <li key={`${item}-${index}`} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-400" aria-hidden />
                  <span className="flex-1">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {(background.specialAbilityName || background.description) && (
          <div className="space-y-1">
            <InfoSectionTitle>Опис особливості</InfoSectionTitle>
            {background.specialAbilityName ? (
              <p className="text-sm font-semibold text-white">
                {background.specialAbilityName}
              </p>
            ) : null}
            {background.description ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200/90">
                {background.description}
              </p>
            ) : null}
          </div>
        )}
      </InfoDialog>
    );
  };

  const matchesSearch = useCallback((name: string) => {
    if (!normalizedBackgroundSearch) return true;
    const ua = normalizeText(backgroundTranslations[name]);
    return ua.includes(normalizedBackgroundSearch);
  }, [normalizedBackgroundSearch]);

  const primaryBackgrounds = useMemo(
    () => backgrounds
      .filter(b => PHB_BACKGROUNDS.has(b.name))
      .filter(b => matchesSearch(b.name)),
    [backgrounds, matchesSearch]
  );
  const otherBackgrounds = useMemo(
    () => backgrounds
      .filter(b => !PHB_BACKGROUNDS.has(b.name))
      .filter(b => matchesSearch(b.name)),
    [backgrounds, matchesSearch]
  );

  const sourceLabel = (name: string) => SOURCE_OVERRIDES[name] ?? "Інші джерела";
  const hasNoResults = !primaryBackgrounds.length && !otherBackgrounds.length;
  const forceOpenOther = Boolean(normalizedBackgroundSearch);

  return (
    <form id={formId} onSubmit={onSubmit} className="w-full space-y-4">
      <div className="space-y-2 text-center">
        <h2 className="font-rpg-display text-3xl font-semibold uppercase tracking-widest text-slate-200 sm:text-4xl">
          Оберіть передісторію
        </h2>
        <p className="text-sm text-slate-400">Спершу показані варіанти з Книги Гравця (2014), решта в акордеоні нижче.</p>
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
              className="h-10 border-white/10 bg-white/5 pl-9 pr-10 text-sm text-slate-100 placeholder:text-slate-400 focus-visible:ring-cyan-400/30"
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

      <div className="space-y-3">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Книга Гравця (2014)</p>
            <Badge variant="outline" className="border-white/15 bg-white/5 text-slate-200">Джерело</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {primaryBackgrounds.map(b =>  (
              <Card
                key={b.backgroundId}
                className={clsx(
                  "glass-card cursor-pointer transition-all duration-200",
                  b.backgroundId === chosenBackgroundId && "glass-active"
                )}
                onClick={() => form.setValue('backgroundId', b.backgroundId)}
              >
                <CardContent className="relative flex items-center justify-between p-4">
                  <BackgroundInfoModal background={b} />
                  <div>
                    <div className="text-lg font-semibold text-white">{backgroundTranslations[b.name]}</div>
                    <div className="text-xs text-slate-400">{backgroundTranslationsEng[b.name]}</div>
                  </div>
                  <SourceBadge code={b.source} active={b.backgroundId === chosenBackgroundId} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <details className="glass-panel border-gradient-rpg rounded-xl" open={forceOpenOther || undefined}>
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-white hover:bg-white/5 [&::-webkit-details-marker]:hidden">
            Інші джерела
          </summary>
          <div className="bg-slate-900/40 backdrop-blur-sm">
            <div className="border-t border-white/10 p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {otherBackgrounds.map(b =>  (
                  <Card
                    key={b.backgroundId}
                    className={clsx(
                      "glass-card cursor-pointer transition-all duration-200",
                      b.backgroundId === chosenBackgroundId && "glass-active"
                    )}
                    onClick={() => form.setValue('backgroundId', b.backgroundId)}
                  >
                    <CardContent className="relative flex items-center justify-between p-4">
                      <BackgroundInfoModal background={b} />
                      <div>
                        <div className="text-lg font-semibold text-white">{backgroundTranslations[b.name]}</div>
                        <div className="text-xs text-slate-400">{backgroundTranslationsEng[b.name]}</div>
                      </div>
                      <SourceBadge code={b.source} active={b.backgroundId === chosenBackgroundId} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </details>
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
