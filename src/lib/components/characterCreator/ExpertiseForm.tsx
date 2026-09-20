"use client";

import clsx from "clsx";
import { useStepForm } from "@/hooks/useStepForm";
import { expertiseSchema } from "@/lib/zod/schemas/persCreateSchema";
import { ClassI, BackgroundI, RaceI } from "@/lib/types/model-types";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Lock } from "lucide-react";
import { engEnumSkills } from "@/lib/refs/translation";
import { Skills } from "@prisma/client";
import { SkillExpertises } from "@/lib/types/model-types";
import { countExpertiseSelections } from "@/rules/expertise-selections";

interface Props {
  selectedClass: ClassI;
  subclass?: any;
  activeFeatures: any[];
  race: RaceI;
  background: BackgroundI;
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
  extraSkills?: string[];
  extraExpertises?: string[];
}

const EMPTY_EXPERTISES: Skills[] = [];

export const ExpertiseForm = ({ activeFeatures, formId, onNextDisabledChange, extraSkills = [], extraExpertises = [] }: Props) => {
  const { formData, updateFormData, nextStep } = usePersFormStore();
  
  const { form, onSubmit } = useStepForm(expertiseSchema, (data) => {
    updateFormData({ expertiseSchema: data });
    nextStep();
  });
  
  const expertiseFeatures = useMemo(() => 
    activeFeatures.filter(f => {
       const se = f.skillExpertises as SkillExpertises | undefined;
       if (!se) return false;
       return (se.count !== undefined && se.count > 0) || 
              (se.options !== undefined && se.options.length > 0) ||
              se.chooseFromCurrentProficiencies;
    }), [activeFeatures]);

  const expertiseCount = useMemo(
    () => countExpertiseSelections(expertiseFeatures.map((feature) => feature.skillExpertises as SkillExpertises)),
    [expertiseFeatures],
  );
  
  const selectedExpertises = form.watch("expertises") || EMPTY_EXPERTISES;

  // Get ONLY currently selected skills from formData
  const availableProficiencies = useMemo(() => {
    const skills = new Set<string>();
    
    // From SkillsForm selections (formData.skills)
    if (formData.skills && Array.isArray(formData.skills)) {
      formData.skills.forEach(skill => {
        if (Object.values(Skills).includes(skill as Skills)) {
          skills.add(skill);
        }
      });
    }
    
    // From skillsSchema (Tasha or basic choices)
    /// Запасний шлях на випадок, коли `formData.skills` ще не зібрано. Він мусить знати всі
    /// джерела кроку навичок: передісторія й опції раси теж дають володіння, і без них
    /// експертиза не бачила б навичку, яку гравець щойно обрав.
    if (formData.skillsSchema) {
      if (formData.skillsSchema.isTasha) {
        formData.skillsSchema.tashaChoices?.forEach(skill => skills.add(skill));
      } else {
        formData.skillsSchema.basicChoices?.race?.forEach(skill => skills.add(skill));
        formData.skillsSchema.basicChoices?.selectedClass?.forEach(skill => skills.add(skill));
        formData.skillsSchema.basicChoices?.background?.forEach(skill => skills.add(skill));
      }
      Object.values(formData.skillsSchema.choiceOptions ?? {}).forEach(chosen => {
        (chosen ?? []).forEach(skill => skills.add(skill));
      });
    }

    // From feats and other extra sources
    extraSkills.forEach(skill => {
        if (Object.values(Skills).includes(skill as Skills)) {
            skills.add(skill);
        }
    });

    // Add skills that are granted by expertise features themselves (getProficiencyAsWell)
    expertiseFeatures.forEach(f => {
       const se = f.skillExpertises as SkillExpertises;
       if (se.getProficiencyAsWell && se.options) {
          // Note: we don't add them ALL to proficiency yet, only if they can be picked.
          // Actually, they ARE available for selection.
       }
    });
    
    return Array.from(skills);
  }, [formData.skills, formData.skillsSchema, extraSkills, expertiseFeatures]);

  const availableSkillsForExpertise = useMemo(() => {
    const skills = new Set<string>();
    
    expertiseFeatures.forEach(f => {
      const se = f.skillExpertises as SkillExpertises;
      if (se.chooseFromCurrentProficiencies) {
        availableProficiencies.forEach(s => skills.add(s));
      }
      if (se.options) {
        se.options.forEach(s => skills.add(s));
      }
    });

    return Array.from(skills);
  }, [expertiseFeatures, availableProficiencies]);

  // BUGFIX: If a skill chosen for expertise is lost (removed in earlier steps), 
  // it should be automatically removed from expertise.
  useEffect(() => {
    const validExpertises = selectedExpertises.filter(s => availableSkillsForExpertise.includes(s));
    if (validExpertises.length !== selectedExpertises.length) {
      form.setValue("expertises", validExpertises);
      updateFormData({ expertiseSchema: { expertises: validExpertises } });
    }
  }, [availableSkillsForExpertise, selectedExpertises, form, updateFormData]);

  useEffect(() => {
    onNextDisabledChange?.(selectedExpertises.length !== expertiseCount);
  }, [selectedExpertises, expertiseCount, onNextDisabledChange]);

  const toggleExpertise = (skill: string) => {
    const current = form.getValues("expertises") || [];
    if (current.includes(skill as Skills)) {
      const newVal = current.filter(s => s !== skill);
      form.setValue("expertises", newVal);
      updateFormData({ expertiseSchema: { expertises: newVal } });
    } else {
      if (current.length < expertiseCount) {
        const newVal = [...current, skill as Skills];
        form.setValue("expertises", newVal);
        updateFormData({ expertiseSchema: { expertises: newVal } });
      }
    }
  };

  if (expertiseFeatures.length === 0) return null;

  // Show warning if no skills selected yet

  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-6">
      {availableSkillsForExpertise.length === 0 ? (
        <Card className="border-yellow-500/50">
          <div className="p-6 text-center">
            <p className="text-yellow-400 mb-2">⚠️ Немає доступних навичок для експертизи!</p>
            <p className="text-sm text-slate-400">Поверніться на крок &quot;Навички&quot; та оберіть потрібні володіння.</p>
          </div>
        </Card>
      ) : null}

      <div className="space-y-2 text-center">
        <h2 className="font-rpg-display text-3xl font-semibold uppercase tracking-widest text-slate-200 sm:text-4xl">
          Експертиза
        </h2>
        <p className="text-sm text-slate-400">
          Оберіть {expertiseCount} навички, в яких ви станете експертом (подвійний бонус майстерності).
        </p>
      </div>

      <div className="space-y-4">
        {expertiseFeatures.map(f => {
          const se = f.skillExpertises as any;
          const count = se.count ?? 1;
          const list = se.options 
            ? ` (${se.options.map((s: string) => engEnumSkills.find(g => g.eng === s)?.ukr || s).join(', ')})` 
            : ' (з усіх наявних)';
          return (
            <div key={f.featureId} className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg">
               <div className="flex-1">
                 <div className="font-semibold text-slate-200">{f.name}</div>
                 <div className="text-xs text-slate-400">
                    Надає {count} {count === 1 ? 'експертизу' : 'експертизи'} {list}
                    {se.getProficiencyAsWell && " (+ володіння)"}
                 </div>
               </div>
               <div className="bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded text-xs font-bold border border-indigo-500/30">
                 +{count}
               </div>
            </div>
          );
        })}
      </div>

      {availableSkillsForExpertise.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {availableSkillsForExpertise.map((skill) => {
            const isSelected = selectedExpertises.includes(skill as Skills);
            const alreadyHasExpertise = extraExpertises.includes(skill);
            const isMaxReached = selectedExpertises.length >= expertiseCount;
            const isDisabled = alreadyHasExpertise || (!isSelected && isMaxReached);
            const active = isSelected || alreadyHasExpertise;
            const skillTranslation = engEnumSkills.find(s => s.eng === skill)?.ukr || skill;

            return (
              <Button
                key={skill}
                type="button"
                variant="outline"
                disabled={isDisabled}
                className={clsx(
                  "justify-between border-white/15 bg-white/5 text-slate-200 hover:bg-white/7 hover:text-white",
                  active && "border-gradient-rpg border-gradient-rpg-active glass-active text-slate-100",
                  (isDisabled && !alreadyHasExpertise) && "opacity-60",
                  alreadyHasExpertise && "opacity-80"
                )}
                onClick={() => !isDisabled && toggleExpertise(skill)}
              >
                <span className="flex items-center gap-2">
                  {alreadyHasExpertise && <Lock className="h-3 w-3" />}
                  {skillTranslation}
                  {alreadyHasExpertise && <span className="text-xs opacity-80">(Експертиза)</span>}
                </span>
                {active && <Check className="h-4 w-4" />}
              </Button>
            );
          })}
        </div>
      ) : null}
    </form>
  );
};
