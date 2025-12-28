"use client";

import { useStepForm } from "@/hooks/useStepForm";
import { featSchema } from "@/lib/zod/schemas/persCreateSchema";
import { Feat } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { InfoDialog, InfoGrid, InfoPill } from "@/lib/components/characterCreator/EntityInfoDialog";
import { SourceBadge } from "@/lib/components/characterCreator/SourceBadge";
import { sourceTranslations, featTranslations } from "@/lib/refs/translation";
import {
  formatASI,
  formatLanguages,
  formatSkillProficiencies,
  formatToolProficiencies,
  formatWeaponProficiencies,
  formatArmorProficiencies,
} from "@/lib/components/characterCreator/infoUtils";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormattedDescription } from "@/components/ui/FormattedDescription";

interface Props {
  feats: Feat[];
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
}

export const FeatsForm = ({ feats, formId, onNextDisabledChange }: Props) => {
  const { updateFormData, nextStep } = usePersFormStore();
  
  const { form, onSubmit } = useStepForm(featSchema, (data) => {
    updateFormData({ featId: data.featId });
    nextStep();
  });
  
  const chosenFeatId = form.watch("featId");
  const search = form.watch("featSearch");

  useEffect(() => {
    if (!chosenFeatId) {
      onNextDisabledChange?.(true);
      return;
    }
    onNextDisabledChange?.(false);
  }, [onNextDisabledChange, chosenFeatId]);

  const filteredFeats = useMemo(() => {
    const normalizedSearch = (search || "").toLowerCase().trim();
    if (!normalizedSearch) return feats;
    return feats.filter(f => 
      f.name.toLowerCase().includes(normalizedSearch) || 
      f.engName.toLowerCase().includes(normalizedSearch)
    );
  }, [feats, search]);

  const FeatInfoModal = ({ feat }: { feat: Feat }) => {
    const name = featTranslations[feat.name] ?? feat.name;
    return (
      <InfoDialog
        title={name}
        triggerLabel={`Показати деталі ${name}`}
      >
        <InfoGrid>
          <InfoPill label="Джерело" value={sourceTranslations[feat.source] ?? feat.source} />
          <InfoPill label="Бонуси характеристик" value={formatASI(feat.grantedASI)} />
          <InfoPill
            label="Навички"
            value={formatSkillProficiencies(feat.grantedSkills as any)}
          />
           <InfoPill
            label="Мови"
            value={formatLanguages(feat.grantedLanguages, feat.grantedLanguageCount)}
          />
          <InfoPill
            label="Інструменти"
            value={formatToolProficiencies(feat.grantedToolProficiencies as any)}
          />
           <InfoPill
            label="Зброя"
            value={formatWeaponProficiencies(feat.grantedWeaponProficiencies as any)}
          />
           <InfoPill
            label="Обладунки"
            value={formatArmorProficiencies(feat.grantedArmorProficiencies)}
          />
          <div className="col-span-full">
             <FormattedDescription content={feat.description} className="text-sm text-slate-300" />
          </div>
        </InfoGrid>
      </InfoDialog>
    );
  };

  return (
    <form id={formId} onSubmit={onSubmit} className="w-full space-y-4">
      <div className="space-y-2 text-center">
        <h2 className="font-rpg-display text-3xl font-semibold uppercase tracking-widest text-slate-200 sm:text-4xl">
          Оберіть рису
        </h2>
        <p className="text-sm text-slate-400">Додаткова риса для вашого персонажа</p>
      </div>

      <div className="glass-panel border-gradient-rpg rounded-xl p-3 sm:p-4">
        <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              type="search"
              value={search}
              onChange={(e) => form.setValue("featSearch", e.target.value)}
              placeholder="Пошук риси"
              className="h-10 border-white/10 bg-white/5 pl-9 pr-10 text-sm text-slate-100 placeholder:text-slate-400 focus-visible:ring-cyan-400/30"
            />
             {search && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1.5 top-1/2 h-7 w-7 -translate-y-1/2 text-slate-400 hover:text-white"
                onClick={() => form.setValue("featSearch", '')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filteredFeats.map((feat) => {
          const name = featTranslations[feat.name] ?? feat.name;
          return (
          <Card
            key={feat.featId}
            className={clsx(
              "glass-card cursor-pointer transition-all duration-200",
              feat.featId === chosenFeatId && "glass-active"
            )}
            onClick={(e) => {
              if ((e.target as HTMLElement | null)?.closest?.('[data-stop-card-click]')) return;
              form.setValue("featId", feat.featId);
            }}
          >
            <CardContent className="relative flex items-center justify-between p-4">
              <FeatInfoModal feat={feat} />
              <div>
                <div className="text-lg font-semibold text-white">{name}</div>
                <div className="text-xs text-slate-400">{feat.engName}</div>
              </div>
              <SourceBadge code={feat.source} active={feat.featId === chosenFeatId} />
            </CardContent>
          </Card>
        )})}
      </div>
      <input
        type="hidden"
        {...form.register("featId", {
          setValueAs: (value) => {
            if (value === "" || value === undefined || value === null) return undefined;
            const num = typeof value === "number" ? value : Number(value);
            return Number.isFinite(num) ? num : undefined;
          },
        })}
      />
    </form>
  );
};

export default FeatsForm;
