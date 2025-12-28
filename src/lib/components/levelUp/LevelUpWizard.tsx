"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { getLevelUpInfo, levelUpCharacter } from "@/lib/actions/levelup";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import SubclassForm from "@/lib/components/characterCreator/SubclassForm";
import ClassChoiceOptionsForm from "@/lib/components/characterCreator/ClassChoiceOptionsForm";
import SubclassChoiceOptionsForm from "@/lib/components/characterCreator/SubclassChoiceOptionsForm";
import LevelUpASIForm from "@/lib/components/levelUp/LevelUpASIForm";
import ClassesForm from "@/lib/components/characterCreator/ClassesForm";
import OptionalFeaturesForm from "@/lib/components/levelUp/OptionalFeaturesForm";
import LevelUpHPStep from "@/lib/components/levelUp/LevelUpHPStep";
import clsx from "clsx";
import { classTranslations, classTranslationsEng, attributesUkrShort, sourceTranslations } from "@/lib/refs/translation";
import { Ability, FeatureDisplayType, SpellcastingType } from "@prisma/client";
import { ClassI } from "@/lib/types/model-types";
import { InfoDialog, InfoGrid, InfoPill, InfoSectionTitle } from "@/lib/components/characterCreator/EntityInfoDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FeatureCard, ResourceCard } from "@/lib/components/characterSheet/shared/FeatureCards";
import {
  formatAbilityList,
  formatArmorProficiencies,
  formatLanguages,
  formatMulticlassReqs,
  formatSkillProficiencies,
  formatToolProficiencies,
  formatWeaponProficiencies,
  prettifyEnum,
} from "@/lib/components/characterCreator/infoUtils";

const SPELLCASTING_LABELS: Record<SpellcastingType, string> = {
  NONE: "Без чаклунства",
  FULL: "Повний кастер",
  HALF: "Половинний кастер",
  THIRD: "Третинний кастер",
  PACT: "Магія пакту",
};

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
    const prevDisabledRef = useRef<boolean | undefined>(undefined);

  // Initialize store
  useEffect(() => {
      resetForm();
      // We don't need to load old data for new choices, 
      // but we might need to load existing choices to prevent duplicates if we were editing.
      // For Level Up, we start fresh.
  }, [resetForm]);

    const isError = "error" in info;
    const pers = isError ? null : info.pers;
    const nextLevel = isError ? 0 : info.nextLevel;
    const classes = useMemo(() => info?.classes || [], [info?.classes]);
    const feats = useMemo(() => info?.feats || [], [info?.feats]);

    const existingClassIds = useMemo(() => {
        const ids = new Set<number>();
        if (!pers) return ids;
        ids.add(pers.classId);
        (pers.multiclasses || []).forEach((m: any) => ids.add(m.classId));
        return ids;
    }, [pers]);

    const mainClassLevel = useMemo(() => {
        if (!pers) return 0;
        const extras = (pers.multiclasses || []).reduce((acc: number, m: any) => acc + (m.classLevel || 0), 0);
        const computed = pers.level - extras;
        return computed > 0 ? computed : 1;
    }, [pers]);

    const selectedClassId = useMemo(() => {
        const raw = formData.classId;
        const id = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
        return Number.isFinite(id) ? id : undefined;
    }, [formData.classId]);

    const selectedClass = useMemo(() => {
        if (!selectedClassId) return null;
        return (classes as unknown as ClassI[]).find((c) => c.classId === selectedClassId) ?? null;
    }, [classes, selectedClassId]);

    const selectedClassName = useMemo(() => {
        if (!selectedClass) return "";
        return classTranslations[selectedClass.name] || classTranslationsEng[selectedClass.name] || selectedClass.name;
    }, [selectedClass]);

    const selectedMulticlassRow = useMemo(() => {
        if (!pers || !selectedClassId) return null;
        return (pers.multiclasses || []).find((m: any) => m.classId === selectedClassId) ?? null;
    }, [pers, selectedClassId]);

    const classLevelBefore = useMemo(() => {
        if (!pers || !selectedClassId) return 0;
        if (selectedClassId === pers.classId) return mainClassLevel;
        if (selectedMulticlassRow) return selectedMulticlassRow.classLevel;
        return 0;
    }, [pers, selectedClassId, mainClassLevel, selectedMulticlassRow]);

    const classLevelAfter = useMemo(() => {
        if (!selectedClassId) return 0;
        return classLevelBefore + 1;
    }, [selectedClassId, classLevelBefore]);

    const currentSubclassIdForSelectedClass = useMemo(() => {
        if (!pers || !selectedClassId) return undefined;
        if (selectedClassId === pers.classId) return pers.subclassId ?? undefined;
        return selectedMulticlassRow?.subclassId ?? undefined;
    }, [pers, selectedClassId, selectedMulticlassRow]);

    const effectiveSubclassId = useMemo(() => {
        const fromStore = formData.subclassId ? Number(formData.subclassId) : undefined;
        return fromStore ?? currentSubclassIdForSelectedClass;
    }, [formData.subclassId, currentSubclassIdForSelectedClass]);

    const effectiveSubclass = useMemo(() => {
        if (!selectedClass || !effectiveSubclassId) return null;
        return selectedClass.subclasses?.find((s) => s.subclassId === effectiveSubclassId) ?? null;
    }, [selectedClass, effectiveSubclassId]);

    const needsSubclass = useMemo(() => {
        if (!selectedClass || !selectedClassId) return false;
        const hasSubclassAlready = Boolean(currentSubclassIdForSelectedClass);
        if (hasSubclassAlready) return false;
        return selectedClass.subclassLevel === classLevelAfter;
    }, [selectedClass, selectedClassId, currentSubclassIdForSelectedClass, classLevelAfter]);

    const isASILevel = useMemo(() => {
        if (!selectedClass) return false;
        return (selectedClass.abilityScoreUpLevels || []).includes(classLevelAfter);
    }, [selectedClass, classLevelAfter]);

    const classChoiceGroups = useMemo(() => {
        if (!selectedClass) return {} as Record<string, any[]>;
        const options = (selectedClass.classChoiceOptions || []).filter((opt) => (opt.levelsGranted || []).includes(classLevelAfter));
        return options.reduce((acc, opt) => {
            const group = opt.choiceOption.groupName;
            if (!acc[group]) acc[group] = [];
            acc[group].push(opt);
            return acc;
        }, {} as Record<string, typeof options>);
    }, [selectedClass, classLevelAfter]);

    const subclassChoiceGroups = useMemo(() => {
        if (!effectiveSubclass) return {} as Record<string, any[]>;
        const options = (effectiveSubclass.subclassChoiceOptions || []).filter((opt) => (opt.levelsGranted || []).includes(classLevelAfter));
        return options.reduce((acc, opt) => {
            const group = opt.choiceOption.groupName;
            if (!acc[group]) acc[group] = [];
            acc[group].push(opt);
            return acc;
        }, {} as Record<string, typeof options>);
    }, [effectiveSubclass, classLevelAfter]);

    const newClassFeatures = useMemo(() => {
        if (!selectedClass) return [] as any[];
        return (selectedClass.features || []).filter((f) => f.levelGranted === classLevelAfter);
    }, [selectedClass, classLevelAfter]);

    const newSubclassFeatures = useMemo(() => {
        if (!effectiveSubclass) return [] as any[];
        return (effectiveSubclass.features || []).filter((f) => f.levelGranted === classLevelAfter);
    }, [effectiveSubclass, classLevelAfter]);

    const eligibleMulticlassClasses = useMemo(() => {
        if (!pers) return [] as ClassI[];
        const baseStats = {
            STR: pers.str,
            DEX: pers.dex,
            CON: pers.con,
            INT: pers.int,
            WIS: pers.wis,
            CHA: pers.cha,
        } as Record<Ability, number>;

        const meetsReqs = (cls: ClassI) => {
            const reqs = cls.multiclassReqs;
            if (!reqs?.required?.length) return true;
            const score = reqs.score ?? 13;
            return reqs.required.every((a) => (baseStats[a] ?? 0) >= score);
        };

    return (classes as unknown as ClassI[])
      .filter((c) => !existingClassIds.has(c.classId))
      .filter(meetsReqs);
  }, [classes, existingClassIds, pers]);

    const steps = useMemo(() => {
        const result: Array<{ id: string; title: string; initialDisabled: boolean; component: ReactNode }> = [];

        if (isError || !pers) {
            result.push({
                id: "error",
                title: "Помилка",
                initialDisabled: true,
                component: (
                    <Card className="glass-card">
                        <CardHeader>
                            <CardTitle>Помилка</CardTitle>
                        </CardHeader>
                        <CardContent className="text-slate-200">{isError ? (info as any).error : "Невідомо"}</CardContent>
                    </Card>
                ),
            });
            return result;
        }

    result.push({
            id: "path",
            title: "Початок",
            initialDisabled: true,
            component: (
                <PathStep
                    pers={pers}
                    classes={classes as unknown as ClassI[]}
                    eligibleMulticlassClasses={eligibleMulticlassClasses}
                    mainClassLevel={mainClassLevel}
                    onNextDisabledChange={(disabled) => {
                        if (prevDisabledRef.current !== disabled) {
                            prevDisabledRef.current = disabled;
                            setNextDisabled(disabled);
                        }
                    }}
                />
            ),
        });

    if (!selectedClassId || !selectedClass) return result;

    result.push({
            id: "summary",
            title: "Огляд",
            initialDisabled: false,
            component: (
                <SummaryStep
                    totalLevel={nextLevel}
                    className={selectedClassName}
                    classLevelAfter={classLevelAfter}
                    newClassFeatures={newClassFeatures}
                    newSubclassFeatures={newSubclassFeatures}
                />
            ),
        });

    if (needsSubclass) {
      result.push({
                id: "subclass",
                title: "Підклас",
                initialDisabled: true,
                component: (
                    <SubclassForm cls={selectedClass as unknown as ClassI} formId="subclass-form" onNextDisabledChange={setNextDisabled} />
                ),
      });
    }

        if (Object.keys(classChoiceGroups).length > 0) {
            result.push({
                id: "class-choices",
                title: "Опції класу",
                initialDisabled: true,
                component: (
                    <ClassChoiceOptionsForm
                        availableOptions={Object.values(classChoiceGroups).flat()}
                        formId="class-choice-form"
                        onNextDisabledChange={setNextDisabled}
                    />
                ),
            });
        }

        if (Object.keys(subclassChoiceGroups).length > 0) {
            result.push({
                id: "subclass-choices",
                title: "Опції підкласу",
                initialDisabled: true,
                component: (
                    <SubclassChoiceOptionsForm
                        availableOptions={Object.values(subclassChoiceGroups).flat()}
                        formId="subclass-choice-form"
                        onNextDisabledChange={setNextDisabled}
                    />
                ),
            });
        }

        if (isASILevel) {
            result.push({
                id: "asi",
                title: "Покращення",
                initialDisabled: true,
                component: <LevelUpASIForm feats={feats as any} formId="asi-form" onNextDisabledChange={setNextDisabled} />,
            });
        }

        const hasOptional = Boolean(
            (selectedClass.classOptionalFeatures || []).some((opt) => (opt.grantedOnLevels || []).includes(classLevelAfter))
        );
        if (hasOptional) {
            result.push({
                id: "optional",
                title: "Заміни",
                initialDisabled: true,
                component: (
                    <OptionalFeaturesForm
                        selectedClass={selectedClass}
                        classLevel={classLevelAfter}
                        formId="optional-features"
                        onNextDisabledChange={setNextDisabled}
                    />
                ),
            });
        }

        result.push({
            id: "hp",
            title: "HP",
            initialDisabled: true,
            component: (
                <LevelUpHPStep
                    hitDie={selectedClass.hitDie}
                    baseStats={{
                        str: pers.str,
                        dex: pers.dex,
                        con: pers.con,
                        int: pers.int,
                        wis: pers.wis,
                        cha: pers.cha,
                    }}
                    feats={feats as any}
                    formId="hp-form"
                    onNextDisabledChange={setNextDisabled}
                />
            ),
        });

        result.push({
            id: "confirm",
            title: "Підтвердження",
            initialDisabled: false,
            component: (
                <ConfirmStep
                    totalLevel={nextLevel}
                    className={selectedClassName}
                    classLevelAfter={classLevelAfter}
                    formData={formData}
                />
            ),
        });

        return result;
    }, [
        classChoiceGroups,
        classLevelAfter,
        classes,
        eligibleMulticlassClasses,
        feats,
        formData,
        isASILevel,
                isError,
        mainClassLevel,
        needsSubclass,
        newClassFeatures,
        newSubclassFeatures,
        nextLevel,
                pers,
        selectedClass,
        selectedClassId,
        selectedClassName,
        subclassChoiceGroups,
                info,
    ]);

    const currentStepId = steps[currentStep]?.id;

    useEffect(() => {
        const initial = steps[currentStep]?.initialDisabled ?? true;
        setNextDisabled(initial);
        prevDisabledRef.current = undefined;
    }, [currentStep, currentStepId]);

  const handleNext = async () => {
      if (currentStep < steps.length - 1) {
          setCurrentStep(prev => prev + 1);
          const next = steps[currentStep + 1];
          setNextDisabled(next?.initialDisabled ?? true);
      } else {
          // Submit
          setIsSubmitting(true);
          try {
              if (!pers) throw new Error("Missing pers");
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
          const prev = steps[currentStep - 1];
          setNextDisabled(prev?.initialDisabled ?? true);
      }
  };

  const CurrentComponent = steps[currentStep].component;

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
        <div className="mb-8">
            <h1 className="font-sans text-2xl font-light tracking-wide text-slate-100 mb-2">Підвищення рівня до {nextLevel}</h1>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {steps.map((s, i) => (
                    <div key={s.id} className={`flex items-center whitespace-nowrap text-sm ${i === currentStep ? 'text-cyan-400 font-medium' : 'text-slate-500'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border mr-2 ${i === currentStep ? 'border-cyan-400 bg-cyan-400/10 text-cyan-400' : 'border-slate-800'}`}>
                            {i + 1}
                        </div>
                        {s.title}
                        {i < steps.length - 1 && <div className="mx-2 h-[1px] w-4 bg-white/5" />}
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
function SummaryStep({
    totalLevel,
    className,
    classLevelAfter,
    newClassFeatures,
    newSubclassFeatures,
}: {
    totalLevel: number;
    className: string;
    classLevelAfter: number;
    newClassFeatures: any[];
    newSubclassFeatures: any[];
}) {
    const [selectedFeature, setSelectedFeature] = useState<{name: string, description: string} | null>(null);

    return (
        <Card className="glass-card backdrop-blur-xl border-white/10 bg-white/5">
            <CardHeader>
                <CardTitle className="text-xl font-light tracking-wide text-slate-100">Вітаємо з {totalLevel}-м рівнем!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="glass-panel border-gradient-rpg rounded-xl p-4 bg-white/5 border-white/10">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Ви підвищуєте:</p>
                    <p className="text-lg font-semibold text-white">
                        {className} (рівень {classLevelAfter})
                    </p>
                </div>

                {newClassFeatures.length > 0 ? (
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1">Нові класові вміння:</h3>
                        <div className="grid grid-cols-1 gap-2">
                            {newClassFeatures.map((f: any) => {
                                const featureData = {
                                    ...f.feature,
                                    source: "class",
                                    sourceName: className
                                };
                                const isResource = f.feature?.displayType?.includes(FeatureDisplayType.CLASS_RESOURCE) || 
                                                 f.feature?.displayType?.includes(FeatureDisplayType.RESOURCE);

                                if (isResource) {
                                    return (
                                        <ResourceCard 
                                            key={f.featureId} 
                                            feature={featureData}
                                            onInfo={() => setSelectedFeature({ name: f.feature?.name, description: f.feature?.description })}
                                            isReadOnly={true}
                                        />
                                    );
                                }

                                return (
                                    <FeatureCard 
                                        key={f.featureId} 
                                        feature={featureData}
                                        onClick={() => setSelectedFeature({ name: f.feature?.name, description: f.feature?.description })}
                                        isReadOnly={true}
                                    />
                                );
                            })}
                        </div>
                    </div>
                ) : null}

                {newSubclassFeatures.length > 0 ? (
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1">Нові вміння підкласу:</h3>
                        <div className="grid grid-cols-1 gap-2">
                            {newSubclassFeatures.map((f: any) => {
                                const featureData = {
                                    ...f.feature,
                                    source: "subclass",
                                    sourceName: className
                                };
                                const isResource = f.feature?.displayType?.includes(FeatureDisplayType.CLASS_RESOURCE) || 
                                                 f.feature?.displayType?.includes(FeatureDisplayType.RESOURCE);

                                if (isResource) {
                                    return (
                                        <ResourceCard 
                                            key={f.featureId} 
                                            feature={featureData}
                                            onInfo={() => setSelectedFeature({ name: f.feature?.name, description: f.feature?.description })}
                                            isReadOnly={true}
                                        />
                                    );
                                }

                                return (
                                    <FeatureCard 
                                        key={f.featureId} 
                                        feature={featureData}
                                        onClick={() => setSelectedFeature({ name: f.feature?.name, description: f.feature?.description })}
                                        isReadOnly={true}
                                    />
                                );
                            })}
                        </div>
                    </div>
                ) : null}
            </CardContent>

            <Dialog open={!!selectedFeature} onOpenChange={() => setSelectedFeature(null)}>
                <DialogContent className="max-w-xl border-white/10 bg-slate-900/95 backdrop-blur text-slate-100">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold tracking-wide font-rpg-display uppercase">{selectedFeature?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                        {selectedFeature?.description && (
                            <FormattedDescription content={selectedFeature.description} className="text-sm text-slate-300 leading-relaxed" />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

function ConfirmStep({
    totalLevel,
    className,
    classLevelAfter,
    formData,
}: {
    totalLevel: number;
    className: string;
    classLevelAfter: number;
    formData: any;
}) {
    const asiChosen = Array.isArray(formData.customAsi) && formData.customAsi.length > 0;
    const featChosen = Boolean(formData.featId);
    const optionalChosen =
        formData.classOptionalFeatureSelections &&
        Object.values(formData.classOptionalFeatureSelections as Record<string, boolean>).some((v) => v === true);

    return (
        <Card className="glass-card backdrop-blur-xl border-white/10 bg-white/5">
            <CardHeader>
                <CardTitle className="text-xl font-light tracking-wide text-slate-100">Перевірка змін</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="glass-panel border-gradient-rpg rounded-xl p-4 bg-white/5 border-white/10">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Новий загальний рівень:</p>
                    <p className="text-lg font-semibold text-white">{totalLevel}</p>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-2 mb-1">Підвищується:</p>
                    <p className="text-lg font-semibold text-white">{className} (рівень {classLevelAfter})</p>
                </div>

                <div className="space-y-2">
                    {formData.subclassId ? (
                        <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-emerald-400" />
                            <span className="text-sm text-slate-200">Підклас обрано</span>
                        </div>
                    ) : null}

                    {Object.keys(formData.classChoiceSelections || {}).length > 0 ? (
                        <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-emerald-400" />
                            <span className="text-sm text-slate-200">Опції класу обрано</span>
                        </div>
                    ) : null}

                    {Object.keys(formData.subclassChoiceSelections || {}).length > 0 ? (
                        <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-emerald-400" />
                            <span className="text-sm text-slate-200">Опції підкласу обрано</span>
                        </div>
                    ) : null}

                    {asiChosen ? (
                        <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-emerald-400" />
                            <span className="text-sm text-slate-200">Покращення характеристик</span>
                        </div>
                    ) : null}

                    {featChosen ? (
                        <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-emerald-400" />
                            <span className="text-sm text-slate-200">Риса обрана</span>
                        </div>
                    ) : null}

                    {optionalChosen ? (
                        <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-emerald-400" />
                            <span className="text-sm text-slate-200">Прийнято заміни вмінь</span>
                        </div>
                    ) : null}

                    {typeof formData.levelUpHpIncrease === "number" ? (
                        <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-emerald-400" />
                            <span className="text-sm text-slate-200">Приріст HP: +{formData.levelUpHpIncrease}</span>
                        </div>
                    ) : null}
                </div>
            </CardContent>
        </Card>
    );
}

function PathStep({
    pers,
    classes,
    eligibleMulticlassClasses,
    mainClassLevel,
    onNextDisabledChange,
}: {
    pers: any;
    classes: ClassI[];
    eligibleMulticlassClasses: ClassI[];
    mainClassLevel: number;
    onNextDisabledChange?: (disabled: boolean) => void;
}) {
    const { formData, updateFormData } = usePersFormStore();

    const levelUpPath = formData.levelUpPath as "EXISTING" | "MULTICLASS" | undefined;
    const chosenClassId = useMemo(() => {
        const raw = formData.classId;
        const id = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
        return Number.isFinite(id) ? id : undefined;
    }, [formData.classId]);

    const existingEntries = useMemo(() => {
        const entries: Array<{ classId: number; classLevel: number; isMain: boolean }> = [];
        entries.push({ classId: pers.classId, classLevel: mainClassLevel, isMain: true });
        (pers.multiclasses || []).forEach((m: any) => {
            entries.push({ classId: m.classId, classLevel: m.classLevel, isMain: false });
        });
        return entries;
    }, [pers.classId, pers.multiclasses, mainClassLevel]);

    const getClassName = (classId: number) => {
        const cls = classes.find((c) => c.classId === classId);
        if (!cls) return `Клас #${classId}`;
        return classTranslations[cls.name] || classTranslationsEng[cls.name] || cls.name;
    };

    useEffect(() => {
        const disabled = !levelUpPath || !chosenClassId;
        onNextDisabledChange?.(disabled);
    }, [levelUpPath, chosenClassId, onNextDisabledChange]);

    const resetLevelUpChoices = () => {
        updateFormData({
            subclassId: undefined,
            classChoiceSelections: {},
            subclassChoiceSelections: {},
            classOptionalFeatureSelections: {},
            customAsi: [],
            featId: undefined,
            featChoiceSelections: {},
            levelUpHpIncrease: undefined,
        });
    };

    const selectPath = (path: "EXISTING" | "MULTICLASS") => {
        if (levelUpPath === path) return;
        updateFormData({ levelUpPath: path, classId: undefined });
        resetLevelUpChoices();
    };

    const selectExistingClass = (classId: number) => {
        updateFormData({ classId });
        resetLevelUpChoices();
    };

    const baseStats = {
        STR: pers.str,
        DEX: pers.dex,
        CON: pers.con,
        INT: pers.int,
        WIS: pers.wis,
        CHA: pers.cha,
    } as Record<Ability, number>;

    return (
        <div className="space-y-4">
            <Card className="glass-card">
                <CardHeader>
                    <CardTitle>Початок: оберіть шлях</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className={
                                "border-white/15 bg-white/5 text-slate-200 hover:bg-white/7 hover:text-white " +
                                (levelUpPath === "EXISTING" ? "border-gradient-rpg border-gradient-rpg-active glass-active text-slate-100" : "")
                            }
                            onClick={() => selectPath("EXISTING")}
                        >
                            Підняти рівень існуючого класу
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className={
                                "border-white/15 bg-white/5 text-slate-200 hover:bg-white/7 hover:text-white " +
                                (levelUpPath === "MULTICLASS" ? "border-gradient-rpg border-gradient-rpg-active glass-active text-slate-100" : "")
                            }
                            onClick={() => selectPath("MULTICLASS")}
                        >
                            Взяти новий клас (мультиклас)
                        </Button>
                    </div>

                    {levelUpPath === "EXISTING" ? (
                        <div className="space-y-3">
                            <p className="text-sm text-slate-400">Оберіть клас, який отримує +1 рівень.</p>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {existingEntries.map((entry) => {
                                    const isSelected = chosenClassId === entry.classId;
                                    const cls = classes.find(c => c.classId === entry.classId);
                                    return (
                                        <div key={entry.classId} className="relative group/card">
                                            <Card
                                                className={clsx(
                                                    "glass-card cursor-pointer backdrop-blur-xl transition hover:bg-white/10 active:scale-[0.98]",
                                                    isSelected ? "glass-active ring ring-cyan-500/30 border-cyan-500/50" : "border-white/10"
                                                )}
                                                onClick={() => selectExistingClass(entry.classId)}
                                            >
                                                <CardContent className="p-4">
                                                    <p className="text-lg font-semibold text-white">{getClassName(entry.classId)}</p>
                                                    <p className="text-xs text-slate-400">Рівень класу: {entry.classLevel}</p>
                                                    {entry.isMain ? (
                                                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-cyan-500/70">Основний клас</p>
                                                    ) : null}
                                                </CardContent>
                                            </Card>
                                            
                                            {cls && (
                                                <InfoDialog title={getClassName(entry.classId)} triggerLabel="Деталі класу">
                                                    <InfoGrid>
                                                        <InfoPill label="Кістка хітів" value={`d${cls.hitDie}`} />
                                                        <InfoPill label="Чаклунство" value={SPELLCASTING_LABELS[cls.spellcastingType] ?? "—"} />
                                                        <InfoPill label="Підклас з рівня" value={`Рівень ${cls.subclassLevel}`} />
                                                        <InfoPill label="Рятунки" value={formatAbilityList(cls.savingThrows)} />
                                                        <InfoPill label="Навички" value={formatSkillProficiencies(cls.skillProficiencies)} />
                                                        <InfoPill label="Інструменти" value={formatToolProficiencies(cls.toolProficiencies, cls.toolToChooseCount)} />
                                                        <InfoPill label="Зброя" value={formatWeaponProficiencies(cls.weaponProficiencies)} />
                                                        <InfoPill label="Броня" value={formatArmorProficiencies(cls.armorProficiencies)} />
                                                        <InfoPill label="Мови" value={formatLanguages(cls.languages, cls.languagesToChooseCount)} />
                                                        <InfoPill label="Мультиклас" value={formatMulticlassReqs(cls.multiclassReqs)} />
                                                        {cls.primaryCastingStat ? (
                                                            <InfoPill label="Ключова характеристика" value={attributesUkrShort[cls.primaryCastingStat]} />
                                                        ) : null}
                                                    </InfoGrid>

                                                    <div className="space-y-4 pt-4">
                                                        <InfoSectionTitle>Особливості класу</InfoSectionTitle>
                                                        {cls.features && cls.features.length > 0 ? (
                                                            <div className="space-y-2">
                                                                {[...cls.features]
                                                                    .sort((a, b) => (a.levelGranted || 0) - (b.levelGranted || 0))
                                                                    .map((f: any) => (
                                                                        <div key={f.classFeatureId} className="glass-panel border-gradient-rpg rounded-xl p-4 bg-white/5 border-white/10 shadow-inner">
                                                                            <div className="flex justify-between items-start mb-2">
                                                                                <span className="font-bold text-white">{f.feature?.name}</span>
                                                                                <Badge variant="outline" className="text-[10px] border-white/10 text-slate-400">Рівень {f.levelGranted}</Badge>
                                                                            </div>
                                                                            <FormattedDescription content={f.feature?.description} className="text-sm text-slate-300 leading-relaxed" />
                                                                        </div>
                                                                    ))
                                                                }
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-slate-400 italic">Наразі немає описаних вмінь.</p>
                                                        )}
                                                    </div>
                                                </InfoDialog>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}

                    {levelUpPath === "MULTICLASS" ? (
                        <div className="space-y-3">
                            <p className="text-sm text-slate-400">
                                Показано лише класи, для яких виконані вимоги мультикласу (зазвичай {" "}
                                <span className="font-semibold text-slate-200">13+</span>).
                            </p>

                            <div className="glass-panel border-gradient-rpg rounded-xl p-3 text-sm text-slate-300">
                                <p className="font-semibold text-slate-100">Ваші характеристики</p>
                                <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                                    {Object.entries(baseStats).map(([k, v]) => (
                                        <span key={k}>
                                            {attributesUkrShort[k as Ability]}: <span className="text-slate-100">{v}</span>
                                        </span>
                                    ))}
                                </p>
                            </div>

                            {eligibleMulticlassClasses.length ? (
                                <ClassesForm
                                    classes={eligibleMulticlassClasses}
                                    formId="multiclass-classes-form"
                                    mode="wizard"
                                    onClassSelected={(classId) => {
                                        updateFormData({ classId });
                                        resetLevelUpChoices();
                                    }}
                                    onNextDisabledChange={onNextDisabledChange}
                                />
                            ) : (
                                <Card className="glass-card p-4 text-center text-slate-200">
                                    Немає доступних класів для мультикласу (перевірте вимоги 13+).
                                </Card>
                            )}
                        </div>
                    ) : null}
                </CardContent>
            </Card>
        </div>
    );
}
