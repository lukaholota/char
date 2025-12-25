"use client";

import { useEffect, useState } from "react";
import { getLevelUpInfo, levelUpCharacter } from "@/lib/actions/levelup";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import SubclassForm from "@/lib/components/characterCreator/SubclassForm";
import ClassChoiceOptionsForm from "@/lib/components/characterCreator/ClassChoiceOptionsForm";
import SubclassChoiceOptionsForm from "@/lib/components/characterCreator/SubclassChoiceOptionsForm";
import LevelUpASIForm from "@/lib/components/levelUp/LevelUpASIForm";
import { ClassI } from "@/lib/types/model-types";

type LevelUpInfo = Awaited<ReturnType<typeof getLevelUpInfo>>;

interface Props {
  info: LevelUpInfo;
}

export default function LevelUpWizard({ info }: Props) {
  const { resetForm, formData } = usePersFormStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [nextDisabled, setNextDisabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Initialize store
  useEffect(() => {
      resetForm();
      // We don't need to load old data for new choices, 
      // but we might need to load existing choices to prevent duplicates if we were editing.
      // For Level Up, we start fresh.
  }, [resetForm]);

  if ('error' in info) return <div>Error: {info.error}</div>;

  const { 
      pers, needsSubclass, isASILevel, 
      classChoiceGroups, 
      subclassChoiceGroups,
      feats,
      nextLevel
  } = info;

  // Define Steps
  const steps = [
      { id: 'summary', title: 'Новий рівень', component: <SummaryStep info={info} /> },
      ...(needsSubclass ? [{ id: 'subclass', title: 'Підклас', component: <SubclassForm cls={pers.class as unknown as ClassI} formId="subclass-form" onNextDisabledChange={setNextDisabled} /> }] : []),
      ...(Object.keys(classChoiceGroups).length > 0 ? [{ 
          id: 'class-choices', 
          title: 'Опції класу', 
          component: <ClassChoiceOptionsForm 
              availableOptions={Object.values(classChoiceGroups).flat()} 
              formId="class-choice-form" 
              onNextDisabledChange={setNextDisabled} 
          /> 
      }] : []),
      ...(Object.keys(subclassChoiceGroups).length > 0 ? [{ 
          id: 'subclass-choices', 
          title: 'Опції підкласу', 
          component: <SubclassChoiceOptionsForm 
              availableOptions={Object.values(subclassChoiceGroups).flat()} 
              formId="subclass-choice-form" 
              onNextDisabledChange={setNextDisabled} 
          /> 
      }] : []),
      ...(isASILevel ? [{ 
          id: 'asi', 
          title: 'Покращення', 
          component: <LevelUpASIForm feats={feats} formId="asi-form" onNextDisabledChange={setNextDisabled} /> 
      }] : []),
      { id: 'confirm', title: 'Підтвердження', component: <ConfirmStep info={info} formData={formData} /> }
  ];

  const handleNext = async () => {
      if (currentStep < steps.length - 1) {
          setCurrentStep(prev => prev + 1);
          setNextDisabled(false); // Reset for next step (components should set it to true if needed on mount)
      } else {
          // Submit
          setIsSubmitting(true);
          try {
              const result = await levelUpCharacter(pers.persId, formData);
              if ('error' in result) {
                  toast.error(result.error);
              } else {
                  toast.success("Рівень підвищено!");
                  router.push(`/pers/${pers.persId}`);
              }
          } catch {
              toast.error("Помилка при збереженні");
          } finally {
              setIsSubmitting(false);
          }
      }
  };

  const handlePrev = () => {
      if (currentStep > 0) {
          setCurrentStep(prev => prev - 1);
          setNextDisabled(false);
      }
  };

  const CurrentComponent = steps[currentStep].component;

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
        <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Підвищення рівня до {nextLevel}</h1>
            <div className="flex gap-2 overflow-x-auto pb-2">
                {steps.map((s, i) => (
                    <div key={s.id} className={`flex items-center whitespace-nowrap ${i === currentStep ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border mr-2 ${i === currentStep ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}`}>
                            {i + 1}
                        </div>
                        {s.title}
                        {i < steps.length - 1 && <div className="mx-2 h-[1px] w-4 bg-border" />}
                    </div>
                ))}
            </div>
        </div>

        <div className="mb-8 min-h-[300px]">
            {CurrentComponent}
        </div>

        <div className="flex justify-between">
            <Button variant="outline" onClick={handlePrev} disabled={currentStep === 0 || isSubmitting}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Назад
            </Button>
            <Button onClick={handleNext} disabled={nextDisabled || isSubmitting}>
                {currentStep === steps.length - 1 ? (
                    isSubmitting ? "Збереження..." : "Підвищити рівень"
                ) : (
                    <>Далі <ChevronRight className="ml-2 h-4 w-4" /></>
                )}
            </Button>
        </div>
    </div>
  );
}

function SummaryStep({ info }: { info: any }) {
    const { nextLevel, newClassFeatures, newSubclassFeatures, pers } = info;
    // Calculate HP increase (Average or Roll? Usually average for simplicity in this app unless we add rolling)
    // Hit Die: pers.class.hitDie
    const conMod = Math.floor((pers.con - 10) / 2);
    const hpIncrease = Math.floor(pers.class.hitDie / 2) + 1 + conMod;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Вітаємо з {nextLevel}-м рівнем!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg">
                    <span className="font-bold">HP Increase</span>
                    <span className="text-2xl font-bold text-green-600">+{hpIncrease}</span>
                </div>
                
                {newClassFeatures.length > 0 && (
                    <div>
                        <h3 className="font-semibold mb-2">Нові класові вміння:</h3>
                        <ul className="space-y-2">
                            {newClassFeatures.map((f: any) => (
                                <li key={f.featureId} className="border p-3 rounded">
                                    <div className="font-bold">{f.feature.name}</div>
                                    <div className="text-sm text-muted-foreground">{f.feature.shortDescription || f.feature.description}</div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {newSubclassFeatures.length > 0 && (
                    <div>
                        <h3 className="font-semibold mb-2">Нові вміння підкласу:</h3>
                        <ul className="space-y-2">
                            {newSubclassFeatures.map((f: any) => (
                                <li key={f.featureId} className="border p-3 rounded">
                                    <div className="font-bold">{f.feature.name}</div>
                                    <div className="text-sm text-muted-foreground">{f.feature.shortDescription || f.feature.description}</div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function ConfirmStep({ formData }: { info: any, formData: any }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Перевірка змін</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p>Ви готові підвищити рівень персонажа?</p>
                {/* We could list the choices made here */}
                {formData.subclassId && (
                    <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>Підклас обрано</span>
                    </div>
                )}
                {Object.keys(formData.classChoiceSelections || {}).length > 0 && (
                    <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>Опції класу обрано</span>
                    </div>
                )}
                 {Object.keys(formData.subclassChoiceSelections || {}).length > 0 && (
                    <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>Опції підкласу обрано</span>
                    </div>
                )}
                {(formData.featId || (formData.customAsi && formData.customAsi.length > 0)) && (
                    <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>Покращення обрано</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
