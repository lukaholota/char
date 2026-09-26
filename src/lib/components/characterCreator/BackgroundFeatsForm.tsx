"use client";

import { useStepForm } from "@/hooks/useStepForm";
import { backgroundFeatSchema } from "@/lib/zod/schemas/persCreateSchema";
import type { Feat } from "@prisma/client";
import { useEffect, useMemo, useState } from "react";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { FeatPicker } from "@/lib/components/characterCreator/FeatPicker";
import { featTranslations } from "@/lib/refs/translation";

import { normalizeRaceASI } from "@/lib/components/characterCreator/infoUtils";
import { RaceI, RaceASI, PersPrisma } from "@/lib/types/model-types";
import { Ability, Races, Subraces } from "@/lib/prisma-enums";
import type { Subrace, RaceVariant } from "@prisma/client";
import { PrerequisiteConfirmationDialog } from "@/lib/components/ui/PrerequisiteConfirmationDialog";
import { checkFeatPrerequisites } from "@/lib/logic/prerequisiteUtils";

interface Props {
  feats: Feat[];
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
  race: RaceI | undefined;
  subrace: Subrace | undefined;
  raceVariant: RaceVariant | undefined | null;
  pers?: PersPrisma | null;

  prereqContext?: {
    level?: number;
    stats?: Record<Ability, number>;
    hasSpellcasting?: boolean;
    race?: Races;
    subrace?: Subraces;
  };
}

export const BackgroundFeatsForm = ({ feats, formId, onNextDisabledChange, race, subrace, raceVariant, pers, prereqContext }: Props) => {
  const { updateFormData, nextStep, formData } = usePersFormStore();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingFeatId, setPendingFeatId] = useState<number | null>(null);
  const [prereqReason, setPrereqReason] = useState<string | undefined>(undefined);
  
  const { form, onSubmit } = useStepForm(backgroundFeatSchema, (data) => {
    updateFormData({ backgroundFeatId: data.backgroundFeatId, backgroundFeatChoiceSelections: {} } as any);
    nextStep();
  });
  
  const chosenFeatId = form.watch("backgroundFeatId");
  const search = form.watch("backgroundFeatSearch");

  useEffect(() => {
    if (!chosenFeatId) {
      onNextDisabledChange?.(true);
      return;
    }
    onNextDisabledChange?.(false);
  }, [onNextDisabledChange, chosenFeatId]);

  const filteredFeats = useMemo(() => {
    const normalizedSearch = (search || "").toLowerCase().trim();
    
    // Повтор дозволяє сама риса (Feat.isRepeatable) — те саме правило, що й на сервері (Р37).
    const alreadyChosenFeatId = formData.featId;
    const existingPersFeatIds = new Set((pers?.feats || []).map(pf => pf.featId));

    return feats.filter(f => {
      // 1. Filter by search
      if (normalizedSearch) {
        const name = featTranslations[f.name] ?? f.name;
        const matchesSearch = name.toLowerCase().includes(normalizedSearch) || 
                             f.engName.toLowerCase().includes(normalizedSearch);
        if (!matchesSearch) return false;
      }

      // 2. Filter by duplication
      const isAllowedDup = Boolean(f.isRepeatable);

      // Check race feat (creation flow)
      if (alreadyChosenFeatId === f.featId && !isAllowedDup) {
        return false;
      }

      // Check existing feats (level-up flow)
      if (existingPersFeatIds.has(f.featId) && !isAllowedDup) {
        return false;
      }

      return true;
    });
  }, [feats, search, formData.featId, pers]);

  const prereqLevel = prereqContext?.level ?? 1;
  const prereqHasSpellcasting = prereqContext?.hasSpellcasting ?? false;
  const prereqRace = prereqContext?.race ?? ((formData as any).raceName as Races | undefined);

  const effectiveStats = useMemo(() => {
    // 1. Base Stats from ASI Form selection
    const system = formData.asiSystem || 'POINT_BUY';
    const stats: Record<string, number> = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };
    
    let sourceArray: { ability: string; value: number | string }[] = [];
    if (system === 'POINT_BUY') sourceArray = formData.asi || [];
    else if (system === 'SIMPLE') sourceArray = formData.simpleAsi || [];
    else if (system === 'CUSTOM') sourceArray = formData.customAsi || [];

    sourceArray.forEach(item => {
      stats[item.ability] = Number(item.value) || 10;
    });

    // 2. Racial Bonuses
    if (race) {
      const isDefaultASI = formData.isDefaultASI ?? true;
      const subraceReplacesAsi = Boolean((subrace as any)?.replacesASI);
      const raceAsi = raceVariant?.overridesRaceASI
        ? normalizeRaceASI(raceVariant.overridesRaceASI) as unknown as RaceASI
        : normalizeRaceASI(subraceReplacesAsi ? (subrace as any)?.additionalASI : race.ASI) as RaceASI;

      // Fixed bonuses (only if Default ASI is active)
      if (isDefaultASI) {
         const simple = raceAsi.basic?.simple || {};
         Object.entries(simple).forEach(([ability, val]) => {
           stats[ability] = (stats[ability] || 0) + (val as number || 0);
         });

         // Fixed subrace bonuses
        if (subrace && !subraceReplacesAsi) {
          const subraceAsi = (subrace as any).additionalASI || {};
          Object.entries(subraceAsi).forEach(([ability, val]) => {
            if (typeof val === 'number') {
              stats[ability] = (stats[ability] || 0) + val;
            }
          });
        }
      }

      // Choice bonuses (from formData)
      const bonusPath = isDefaultASI ? 'basicChoices' : 'tashaChoices';
      const selectedGroups = formData.racialBonusChoiceSchema?.[bonusPath] || [];
      
      selectedGroups.forEach(group => {
         group.selectedAbilities.forEach((ability: string) => {
             let groupDef;
             if (isDefaultASI) {
               groupDef = raceAsi.basic?.flexible?.groups?.find((g, i) => i === group.groupIndex);
             } else {
               const baseGroups = raceAsi.tasha?.flexible?.groups || [];
               groupDef = baseGroups.find((g, i) => i === group.groupIndex);
             }
             
             const val = groupDef?.value || 1;
             stats[ability] = (stats[ability] || 0) + val;
         });
      });
    }

    return stats as Record<Ability, number>;
  }, [formData, race, subrace, raceVariant]);

  const prereqStats = prereqContext?.stats ?? effectiveStats;
  const prereqSubrace = prereqContext?.subrace ?? ((formData as any).subraceName as Subraces | undefined);

  const featPrereqs = useMemo(() => {
    const map = new Map<number, ReturnType<typeof checkFeatPrerequisites>>();
    for (const feat of filteredFeats) {
      map.set(
        feat.featId,
        checkFeatPrerequisites(feat as any, {
          level: prereqLevel,
          stats: prereqStats,
          hasSpellcasting: prereqHasSpellcasting,
          race: prereqRace,
          subrace: prereqSubrace,
        })
      );
    }
    return map;
  }, [filteredFeats, prereqLevel, prereqStats, prereqHasSpellcasting, prereqRace, prereqSubrace]);

  const selectFeat = (feat: Feat) => {
    if (feat.featId === chosenFeatId) return;

    const prereqResult = featPrereqs.get(feat.featId) ?? { met: true as const };

    if (!prereqResult.met) {
      setPrereqReason(prereqResult.reason);
      setPendingFeatId(feat.featId);
      setConfirmOpen(true);
    } else {
      form.setValue("backgroundFeatId", feat.featId);
      updateFormData({ backgroundFeatId: feat.featId, backgroundFeatChoiceSelections: {} } as any);
    }
  };


  return (
    <form id={formId} onSubmit={onSubmit} className="w-full space-y-4">
      <div className="space-y-2 text-center">
        <h2 className="font-rpg-display text-3xl font-semibold uppercase tracking-widest text-slate-200 sm:text-4xl">
          Риса за походженням
        </h2>
        <p className="text-sm text-slate-400">Додаткова риса для вашого персонажа</p>
      </div>

      <FeatPicker
        feats={filteredFeats}
        selectedFeatId={chosenFeatId}
        search={search}
        prerequisiteByFeatId={featPrereqs}
        onSearchChange={(nextSearch) => form.setValue("backgroundFeatSearch", nextSearch)}
        onSelectFeat={selectFeat}
        emptyState={<div className="col-span-full py-12 text-center text-slate-500 text-sm">Риси не знайдено</div>}
      />

      <PrerequisiteConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        reason={prereqReason}
        onConfirm={() => {
          if (pendingFeatId) {
            form.setValue("backgroundFeatId", pendingFeatId);
            updateFormData({ backgroundFeatId: pendingFeatId, backgroundFeatChoiceSelections: {} } as any);
          }
        }}
      />
      <input
        type="hidden"
        {...form.register("backgroundFeatId", {
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

export default BackgroundFeatsForm;
