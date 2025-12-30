"use client";

import { useMemo } from "react";
import { useEffect } from "react";
import clsx from "clsx";

import { useStepForm } from "@/hooks/useStepForm";
import { raceVariantSchema, subraceSchema } from "@/lib/zod/schemas/persCreateSchema";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import type { RaceI } from "@/lib/types/model-types";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { RaceVariantInfoModal } from "@/lib/components/characterCreator/modals/RaceVariantInfoModal";
import { SubraceInfoModal } from "@/lib/components/characterCreator/modals/SubraceInfoModal";
import { SourceBadge } from "@/lib/components/characterCreator/SourceBadge";
import {
  sourceTranslations,
  subraceTranslations,
  subraceTranslationsEng,
  variantTranslations,
  variantTranslationsEng,
} from "@/lib/refs/translation";
import {
  formatASI,
  formatLanguages,
  formatSpeeds,
  formatToolProficiencies,
  translateValue,
} from "@/lib/components/characterCreator/infoUtils";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { z } from "zod";

interface Props {
  race: RaceI;
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
}

export const RaceSubraceVariantForm = ({ race, formId, onNextDisabledChange }: Props) => {
  const { updateFormData, nextStep } = usePersFormStore();

  const subraces = race.subraces || [];
  const variants = race.raceVariants || [];

  const hasSubraces = subraces.length > 0;
  const hasRaceVariants = variants.length > 0;

  const raceSubraceVariantSchema = useMemo(() => {
    return z
      .object({
        subraceId: subraceSchema.shape.subraceId,
        raceVariantId: raceVariantSchema.shape.raceVariantId,
      })
      .superRefine((data, ctx) => {
        if (data.subraceId != null && data.raceVariantId != null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Оберіть або підрасу, або варіант раси",
            path: ["raceVariantId"],
          });
          return;
        }

        // Requiredness rules
        if (hasSubraces && !hasRaceVariants) {
          if (data.subraceId == null) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Оберіть підрасу",
              path: ["subraceId"],
            });
          }
        }

        if (hasSubraces && hasRaceVariants) {
          if (data.subraceId == null && data.raceVariantId == null) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Оберіть підрасу або варіант раси",
              path: ["subraceId"],
            });
          }
        }
      });
  }, [hasSubraces, hasRaceVariants]);

  const { form, onSubmit } = useStepForm(raceSubraceVariantSchema, (data) => {
    updateFormData({
      subraceId: data.subraceId,
      raceVariantId: data.raceVariantId ?? null,
    });
    nextStep();
  });

  const chosenSubraceId = form.watch("subraceId");
  const chosenVariantId = form.watch("raceVariantId");

  const isRequired = hasSubraces;
  const selectionMade = Boolean(chosenSubraceId != null || chosenVariantId != null);

  useEffect(() => {
    if (!isRequired) {
      onNextDisabledChange?.(false);
      return;
    }

    onNextDisabledChange?.(!selectionMade);
  }, [isRequired, selectionMade, onNextDisabledChange]);

  return (
    <form id={formId} onSubmit={onSubmit} className="w-full space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="font-rpg-display text-3xl font-semibold uppercase tracking-widest text-slate-200 sm:text-4xl">
          {hasSubraces && hasRaceVariants
            ? "Підраса або Варіант раси"
            : hasSubraces
              ? "Оберіть підрасу"
              : "Варіант раси"}
        </h2>
        <p className="text-sm text-slate-400">Для раси {translateValue(race.name)}</p>
        {hasSubraces && hasRaceVariants ? (
          <p className="text-sm text-slate-300">
            Можна обрати <span className="font-semibold text-white">або</span> підрасу, <span className="font-semibold text-white">або</span> варіант раси
          </p>
        ) : null}
      </div>

      {hasSubraces ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
            Підраси
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {subraces.map((sr) => {
              const name = subraceTranslations[sr.name] ?? sr.name;
              const engName = subraceTranslationsEng[sr.name] ?? sr.name;
              const selected = sr.subraceId === chosenSubraceId;
              const lockedByVariant = chosenVariantId != null;
              const enabled = !lockedByVariant || selected;

              return (
                <Card
                  key={sr.subraceId}
                  className={clsx(
                    "glass-card transition-all duration-200",
                    enabled ? "cursor-pointer" : "cursor-not-allowed opacity-50",
                    selected && "glass-active"
                  )}
                  onClick={(e) => {
                    if ((e.target as HTMLElement | null)?.closest?.('[data-stop-card-click]')) return;
                    if (!enabled) return;

                    if (selected) {
                      form.setValue("subraceId", undefined);
                      updateFormData({ subraceId: undefined });
                      return;
                    }

                    form.setValue("subraceId", sr.subraceId);
                    form.setValue("raceVariantId", null);
                    updateFormData({ subraceId: sr.subraceId, raceVariantId: null });
                  }}
                >
                  <CardContent className="relative flex items-center justify-between p-4">
                    <SubraceInfoModal subrace={sr} />
                    <div>
                      <div className="text-lg font-semibold text-white">{name}</div>
                      <div className="text-xs text-slate-400">{engName}</div>
                    </div>
                    <SourceBadge code={sr.source} active={selected} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}

      {hasRaceVariants ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
            Варіанти раси
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {variants.map((rv) => {
              const name = variantTranslations[rv.name] ?? rv.name;
              const engName = variantTranslationsEng[rv.name] ?? rv.name;
              const selected = rv.raceVariantId === chosenVariantId;
              const lockedBySubrace = chosenSubraceId != null;
              const enabled = !lockedBySubrace || selected;

              return (
                <Card
                  key={rv.raceVariantId}
                  className={clsx(
                    "glass-card transition-all duration-200",
                    enabled ? "cursor-pointer" : "cursor-not-allowed opacity-50",
                    selected && "glass-active"
                  )}
                  onClick={(e) => {
                    if ((e.target as HTMLElement | null)?.closest?.('[data-stop-card-click]')) return;
                    if (!enabled) return;

                    if (selected) {
                      form.setValue("raceVariantId", null);
                      updateFormData({ raceVariantId: null });
                      return;
                    }

                    form.setValue("raceVariantId", rv.raceVariantId);
                    form.setValue("subraceId", undefined);
                    updateFormData({ raceVariantId: rv.raceVariantId, subraceId: undefined });
                  }}
                >
                  <CardContent className="relative flex items-center justify-between p-4">
                    <RaceVariantInfoModal variant={rv} />
                    <div>
                      <div className="text-lg font-semibold text-white">{name}</div>
                      <div className="text-xs text-slate-400">{engName}</div>
                    </div>
                    <SourceBadge code={rv.source} active={selected} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}

      {!hasSubraces && hasRaceVariants ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            className="border-white/15 bg-white/5 text-slate-200 hover:bg-white/7"
            onClick={() => {
              form.setValue("raceVariantId", null);
              form.setValue("subraceId", undefined);
              updateFormData({ raceVariantId: null, subraceId: undefined });
              nextStep();
            }}
          >
            Пропустити
          </Button>
        </div>
      ) : null}

      <input
        type="hidden"
        {...form.register("subraceId", {
          setValueAs: (value) => {
            if (value === "" || value === undefined || value === null) return undefined;
            const num = typeof value === "number" ? value : Number(value);
            return Number.isFinite(num) ? num : undefined;
          },
        })}
      />

      <input
        type="hidden"
        {...form.register("raceVariantId", {
          setValueAs: (value) => {
            if (value === "" || value === undefined) return null;
            if (value === null) return null;
            const num = typeof value === "number" ? value : Number(value);
            return Number.isFinite(num) ? num : null;
          },
        })}
      />
    </form>
  );
};

export default RaceSubraceVariantForm;
