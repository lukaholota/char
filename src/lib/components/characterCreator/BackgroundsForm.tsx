"use client";

import type {Background} from "@prisma/client"
import {
  backgroundTranslations, backgroundTranslationsEng,
} from "@/lib/refs/translation";
import clsx from "clsx";
import {useStepForm} from "@/hooks/useStepForm";
import {backgroundSchema} from "@/lib/zod/schemas/persCreateSchema";
import { useEffect, useMemo } from "react";
import { Card, CardContent } from "@/lib/components/ui/card";
import { Badge } from "@/lib/components/ui/badge";
import { Button } from "@/lib/components/ui/Button";
import { Input } from "@/lib/components/ui/input";
import { Search, X } from "lucide-react";
import {
  InfoDialog,
  InfoGrid,
  InfoPill,
  InfoSectionTitle,
} from "@/lib/components/characterCreator/EntityInfoDialog";
import {
  formatLanguages,
  formatSkillProficiencies,
  formatToolProficiencies,
  prettifyEnum,
} from "@/lib/components/characterCreator/infoUtils";

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
  backgrounds: Background[]
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
  const {form, onSubmit} = useStepForm(backgroundSchema)

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

  const BackgroundInfoModal = ({ background }: { background: Background }) => {
    const items = parseItems(background.items);
    const sourceText = sourceLabel(background.name);
    const resolvedSource = sourceText === "Other sources" && background.source
      ? prettifyEnum(background.source)
      : sourceText;

    return (
      <InfoDialog
        title={backgroundTranslations[background.name] || background.name}
        subtitle={backgroundTranslationsEng[background.name]}
        triggerLabel={`Show details for ${backgroundTranslationsEng[background.name] ?? background.name}`}
      >
        <InfoGrid>
          <InfoPill label="Source" value={resolvedSource} />
          <InfoPill
            label="Skills"
            value={formatSkillProficiencies(background.skillProficiencies)}
          />
          <InfoPill
            label="Tools"
            value={formatToolProficiencies(background.toolProficiencies)}
          />
          <InfoPill
            label="Languages"
            value={formatLanguages([], background.languagesToChooseCount)}
          />
          <InfoPill
            label="Feature"
            value={background.specialAbilityName || "—"}
          />
        </InfoGrid>

        {items.length ? (
          <div className="space-y-1.5">
            <InfoSectionTitle>Starting equipment</InfoSectionTitle>
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
            <InfoSectionTitle>Feature details</InfoSectionTitle>
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

  const matchesSearch = (name: string) => {
    if (!normalizedBackgroundSearch) return true;
    const ua = normalizeText(backgroundTranslations[name]);
    const eng = normalizeText(backgroundTranslationsEng[name]);
    return ua.includes(normalizedBackgroundSearch) || eng.includes(normalizedBackgroundSearch);
  };

  const primaryBackgrounds = useMemo(
    () => backgrounds
      .filter(b => PHB_BACKGROUNDS.has(b.name))
      .filter(b => matchesSearch(b.name)),
    [backgrounds, normalizedBackgroundSearch]
  );
  const otherBackgrounds = useMemo(
    () => backgrounds
      .filter(b => !PHB_BACKGROUNDS.has(b.name))
      .filter(b => matchesSearch(b.name)),
    [backgrounds, normalizedBackgroundSearch]
  );

  const sourceLabel = (name: string) => SOURCE_OVERRIDES[name] ?? "Other sources";
  const hasNoResults = !primaryBackgrounds.length && !otherBackgrounds.length;
  const forceOpenOther = Boolean(normalizedBackgroundSearch);

  return (
    <form id={formId} onSubmit={onSubmit} className="w-full space-y-4">
      <div className="space-y-2 text-center">
        <h2 className="text-xl font-semibold text-white">Choose a background</h2>
        <p className="text-sm text-slate-400">PHB items are shown first, others live under the accordion.</p>
      </div>

      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 shadow-inner sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-white">Search backgrounds</div>
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              type="search"
              {...form.register('backgroundSearch')}
              value={backgroundSearch}
              onChange={(e) => form.setValue('backgroundSearch', e.target.value)}
              placeholder="Search name (ukr / eng)"
              aria-label="Search backgrounds"
              className="h-10 bg-slate-950/60 pl-9 pr-10 text-sm text-slate-100 placeholder:text-slate-500"
            />
            {backgroundSearch && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1.5 top-1/2 h-7 w-7 -translate-y-1/2 text-slate-400 hover:text-white"
                onClick={() => form.setValue('backgroundSearch', '')}
                aria-label="Clear background search"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {hasNoResults && (
        <p className="text-center text-sm text-slate-400">Nothing found for this query.</p>
      )}

      <div className="space-y-3">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">PHB 2014</p>
            <Badge variant="outline" className="border-slate-800 bg-slate-800/60 text-slate-200">Source</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {primaryBackgrounds.map(b =>  (
              <Card
                key={b.backgroundId}
                className={clsx(
                  "cursor-pointer border border-slate-800/80 bg-slate-900/70 transition hover:-translate-y-0.5 hover:border-indigo-500/60",
                  b.backgroundId === chosenBackgroundId && "border-indigo-400/80 bg-indigo-500/10 shadow-lg shadow-indigo-500/15"
                )}
                onClick={() => form.setValue('backgroundId', b.backgroundId)}
              >
                <CardContent className="relative flex items-center justify-between p-4">
                  <BackgroundInfoModal background={b} />
                  <div>
                    <div className="text-lg font-semibold text-white">{backgroundTranslations[b.name]}</div>
                    <div className="text-xs text-slate-400">
                      {backgroundTranslationsEng[b.name]}
                    </div>
                  </div>
                  <Badge
                    variant={b.backgroundId === chosenBackgroundId ? "secondary" : "outline"}
                    className={`border-slate-700 ${b.backgroundId === chosenBackgroundId ? "bg-indigo-500/20 text-indigo-50" : "bg-slate-800/60 text-slate-200"}`}
                  >
                    PHB
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <details className="rounded-xl border border-slate-800/80 bg-slate-900/60 shadow-inner" open={forceOpenOther || undefined}>
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800/80 [&::-webkit-details-marker]:hidden">
            Other sources
          </summary>
          <div className="border-t border-slate-800/80 p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {otherBackgrounds.map(b =>  (
                <Card
                  key={b.backgroundId}
                  className={clsx(
                    "cursor-pointer border border-slate-800/80 bg-slate-900/70 transition hover:-translate-y-0.5 hover:border-indigo-500/60",
                    b.backgroundId === chosenBackgroundId && "border-indigo-400/80 bg-indigo-500/10 shadow-lg shadow-indigo-500/15"
                  )}
                  onClick={() => form.setValue('backgroundId', b.backgroundId)}
                >
                  <CardContent className="relative flex items-center justify-between p-4">
                    <BackgroundInfoModal background={b} />
                    <div>
                      <div className="text-lg font-semibold text-white">{backgroundTranslations[b.name]}</div>
                      <div className="text-xs text-slate-400">
                        {backgroundTranslationsEng[b.name]}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant={b.backgroundId === chosenBackgroundId ? "secondary" : "outline"}
                        className={`border-slate-700 ${b.backgroundId === chosenBackgroundId ? "bg-indigo-500/20 text-indigo-50" : "bg-slate-800/60 text-slate-200"}`}
                      >
                        Other
                      </Badge>
                      <Badge variant="outline" className="border-slate-800 bg-slate-800/60 text-slate-200">
                        {sourceLabel(b.name)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </details>
      </div>

      <input type="hidden" {...form.register('backgroundId', { valueAsNumber: true })} />
    </form>
  )
};

export default BackgroundsForm;
