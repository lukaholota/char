"use client";

import { useStepForm } from "@/hooks/useStepForm";
import { expertiseSchema } from "@/lib/zod/schemas/persCreateSchema";
import { ClassI, BackgroundI, RaceI } from "@/lib/types/model-types";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { useEffect, useMemo } from "react";
import { Button } from "@/lib/components/ui/Button";
import { Card } from "@/lib/components/ui/card";
import { Check } from "lucide-react";
import { engEnumSkills } from "@/lib/refs/translation";
import { Skills } from "@prisma/client";

interface Props {
  selectedClass: ClassI;
  race: RaceI;
  background: BackgroundI;
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
}

export const ExpertiseForm = ({ selectedClass, formId, onNextDisabledChange }: Props) => {
  const { formData, updateFormData, nextStep } = usePersFormStore();
  
  const { form, onSubmit } = useStepForm(expertiseSchema, (data) => {
    updateFormData({ expertiseSchema: data });
    nextStep();
  });
  
  const expertiseFeature = useMemo(() => 
    selectedClass.features.find(f => 
      f.levelGranted === 1 && 
      (f.feature.skillExpertises as { count?: number } | undefined)?.count && 
      ((f.feature.skillExpertises as { count?: number } | undefined)?.count || 0) > 0
    ), [selectedClass]);

  const expertiseCount = (expertiseFeature?.feature.skillExpertises as { count?: number })?.count || 0;
  
  const selectedExpertises = form.watch("expertises") || [];

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
    if (formData.skillsSchema) {
      if (formData.skillsSchema.isTasha) {
        formData.skillsSchema.tashaChoices?.forEach(skill => skills.add(skill));
      } else {
        formData.skillsSchema.basicChoices?.race?.forEach(skill => skills.add(skill));
        formData.skillsSchema.basicChoices?.selectedClass?.forEach(skill => skills.add(skill));
      }
    }
    
    return Array.from(skills);
  }, [formData.skills, formData.skillsSchema]);

  useEffect(() => {
    const isValid = selectedExpertises.length === expertiseCount;
    onNextDisabledChange?.(!isValid);
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

  if (!expertiseFeature) return null;

  // Show warning if no skills selected yet
  if (availableProficiencies.length === 0) {
    return (
      <Card className="border-yellow-500/50">
        <div className="p-6 text-center">
          <p className="text-yellow-400 mb-2">⚠️ Немає обраних навичок!</p>
          <p className="text-sm text-slate-400">
            Поверніться на крок &quot;Навички&quot; і оберіть принаймні одну навичку.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-xl font-semibold text-white">Експертиза</h2>
        <p className="text-sm text-slate-400">
          Оберіть {expertiseCount} навички, в яких ви станете експертом (подвійний бонус майстерності).
        </p>
        <p className="text-xs text-amber-400 mt-1">
          ⚠️ Експертизу можна отримати ТІЛЬКИ в навичках, які ви вже маєте!
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
        {availableProficiencies.map((skill) => {
          const isSelected = selectedExpertises.includes(skill as Skills);
          const isMaxReached = selectedExpertises.length >= expertiseCount;
          const isDisabled = !isSelected && isMaxReached;
          const active = isSelected;
          const skillTranslation = engEnumSkills.find(s => s.eng === skill)?.ukr || skill;

          return (
            <Button
              key={skill}
              type="button"
              variant={active ? "secondary" : "outline"}
              disabled={isDisabled}
              className={`justify-between ${
                active 
                  ? "bg-indigo-500/20 text-indigo-50 border-indigo-400/60" 
                  : "bg-slate-900/60 border-slate-800/80 text-slate-200"
              } ${isDisabled ? "opacity-60" : ""}`}
              onClick={() => !isDisabled && toggleExpertise(skill)}
            >
              <span>{skillTranslation}</span>
              {active && <Check className="h-4 w-4" />}
            </Button>
          );
        })}
      </div>
    </form>
  );
};
