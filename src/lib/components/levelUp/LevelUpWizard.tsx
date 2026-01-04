"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { getLevelUpInfo, levelUpCharacter } from "@/lib/actions/levelup";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import SubclassForm from "@/lib/components/characterCreator/SubclassForm";
import ClassChoiceOptionsForm from "@/lib/components/characterCreator/ClassChoiceOptionsForm";
import SubclassChoiceOptionsForm from "@/lib/components/characterCreator/SubclassChoiceOptionsForm";
import FeatChoiceOptionsForm from "@/lib/components/characterCreator/FeatChoiceOptionsForm";
import LevelUpASIForm from "@/lib/components/levelUp/LevelUpASIForm";
import ClassesForm from "@/lib/components/characterCreator/ClassesForm";
import OptionalFeaturesForm from "@/lib/components/levelUp/OptionalFeaturesForm";
import LevelUpHPStep from "@/lib/components/levelUp/LevelUpHPStep";
import LevelUpInfusionsStep from "@/lib/components/levelUp/LevelUpInfusionsStep";
import clsx from "clsx";
import { classTranslations, subclassTranslations, classTranslationsEng, attributesUkrShort } from "@/lib/refs/translation";
import { Ability, FeatureDisplayType, SpellcastingType } from "@prisma/client";
import { Races } from "@prisma/client";
import { ClassI, SubclassI } from "@/lib/types/model-types";
import { ControlledInfoDialog, InfoDialog, InfoGrid, InfoPill, InfoSectionTitle } from "@/lib/components/characterCreator/EntityInfoDialog";
import { FeatureItemData, FeatureCard, ResourceCard } from "@/lib/components/characterSheet/shared/FeatureCards";
import {
  formatAbilityList,
  formatArmorProficiencies,
  formatLanguages,
  formatMulticlassReqs,
  formatSkillProficiencies,
  formatToolProficiencies,
  formatWeaponProficiencies,
} from "@/lib/components/characterCreator/infoUtils";
import { ClassInfoModal } from "@/lib/components/characterCreator/modals/ClassInfoModal";
import { SubclassInfoModal } from "@/lib/components/characterCreator/modals/SubclassInfoModal";

import {
    CHOICE_GROUPS,
    baseChoiceGroupName,
    getChoicePoolRule,
} from "@/lib/logic/choicePoolRules";

const stripSyntheticSuffix = (groupName: string) => baseChoiceGroupName(groupName);

type ChoiceSelections = Record<string, number | number[]>;

function detectSelectedPact(args: {
    pers: any;
    optionsAtThisLevel: any[];
    selections: ChoiceSelections | undefined;
}) {
    const fromPers = (args.pers?.choiceOptions || []).find(
        (co: any) => typeof co?.optionNameEng === "string" && co.optionNameEng.startsWith("Pact of")
    );
    if (fromPers?.optionNameEng) return String(fromPers.optionNameEng);

    const selectedIds = Object.values(args.selections || {})
        .flatMap((v) => (Array.isArray(v) ? v : [v]))
        .map((v) => Number(v))
        .filter((v) => Number.isFinite(v));

    for (const opt of args.optionsAtThisLevel) {
        if (!selectedIds.includes(opt.choiceOptionId)) continue;
        if (typeof opt.choiceOption?.optionNameEng === "string" && opt.choiceOption.optionNameEng.startsWith("Pact of")) {
            return String(opt.choiceOption.optionNameEng);
        }
    }

    return undefined;
}

function applyChoicePoolRulesToGroupedOptions(args: {
    scope: "class" | "subclass";
    grouped: Record<string, any[]>;
    levelAfter: number;
    className?: string;
    subclassName?: string;
    pers: any;
    optionsAtThisLevel: any[];
    selections: ChoiceSelections | undefined;
}) {
    const out: Record<string, any[]> = { ...args.grouped };
    const groupPickCounts: Record<string, number> = {};

    // Default all groups to 1 pick unless a pool rule overrides it.
    for (const groupName of Object.keys(args.grouped)) {
        groupPickCounts[groupName] = 1;
    }

    const existingChoiceOptionIds = new Set<number>();
    (args.pers?.choiceOptions || []).forEach((co: any) => {
        if (typeof co?.choiceOptionId === "number") existingChoiceOptionIds.add(co.choiceOptionId);
    });

    for (const [groupName, options] of Object.entries(args.grouped)) {
        const rule = getChoicePoolRule({
            scope: args.scope,
            groupName,
            className: args.className,
            subclassName: args.subclassName,
        });

        if (!rule) continue;

        const picks = Number(rule.picksAtLevel(args.levelAfter)) || 0;
        if (picks <= 0 || !Array.isArray(options) || !options.length) continue;

        const baseGroup = stripSyntheticSuffix(groupName);
        groupPickCounts[baseGroup] = picks;

        // Always prevent picking already-known options for pool-style groups.
        let eligible = options.filter((opt: any) => {
            const id = Number(opt.choiceOptionId);
            if (!Number.isFinite(id)) return false;
            if (existingChoiceOptionIds.has(id)) return false;
            return true;
        });

        // Warlock invocations: apply pact/level prerequisites at the pool level.
        if (rule.scope === "class" && rule.className === "WARLOCK_2014" && baseGroup === CHOICE_GROUPS.WARLOCK_INVOCATIONS) {
            const selectedPact = detectSelectedPact({
                pers: args.pers,
                optionsAtThisLevel: args.optionsAtThisLevel,
                selections: args.selections,
            });

            eligible = eligible.filter((opt: any) => {
                const prereq = opt.choiceOption?.prerequisites as any;
                const minLevel = prereq?.level ? Number(prereq.level) : undefined;
                if (typeof minLevel === "number" && Number.isFinite(minLevel) && args.levelAfter < minLevel) {
                    return false;
                }
                const pact = prereq?.pact ? String(prereq.pact) : undefined;
                if (pact && selectedPact && pact !== selectedPact) return false;
                if (pact && !selectedPact) return false;
                return true;
            });
        }

        // Replace group with eligible list (no synthetic splitting; UI handles multi-pick)
        if (groupName !== baseGroup) {
            delete (out as any)[groupName];
        }
        (out as any)[baseGroup] = eligible;
    }

    return { grouped: out, groupPickCounts };
}

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
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [nextDisabled, setNextDisabled] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const lastStepIdRef = useRef<string | undefined>(undefined);

    const onNextDisabledChange = useCallback((disabled: boolean) => {
        setNextDisabled(disabled);
    }, []);

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

    const selectedFeatId = useMemo(() => {
        const raw = (formData as any)?.featId;
        const id = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
        return Number.isFinite(id) ? (id as number) : undefined;
    }, [formData]);

    const selectedFeat = useMemo(() => {
        if (!selectedFeatId) return undefined;
        return (feats as any[])?.find((f: any) => Number(f?.featId) === selectedFeatId);
    }, [feats, selectedFeatId]);

    const selectedFeatHasChoices = useMemo(() => {
        const n = (selectedFeat as any)?.featChoiceOptions?.length ?? 0;
        return n > 0;
    }, [selectedFeat]);

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

    const featPrereqStats = useMemo(() => {
        if (!pers) return undefined;
        return {
            STR: pers.str,
            DEX: pers.dex,
            CON: pers.con,
            INT: pers.int,
            WIS: pers.wis,
            CHA: pers.cha,
        } as Record<Ability, number>;
    }, [pers]);

    const hasSpellcasting = useMemo(() => {
        if (!pers) return false;
        const main = (pers as any)?.class?.spellcastingType as SpellcastingType | undefined;
        if (main && main !== SpellcastingType.NONE) return true;
        const multi = ((pers as any)?.multiclasses || [])
            .map((m: any) => m?.class?.spellcastingType as SpellcastingType | undefined)
            .filter(Boolean);
        return multi.some((t: any) => t && t !== SpellcastingType.NONE);
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

    const persPactBoon = useMemo(() => {
        if (!pers) return undefined;
        const fromPers = (pers.choiceOptions || []).find(
            (co: any) => typeof co?.optionNameEng === "string" && co.optionNameEng.startsWith("Pact of")
        );
        return fromPers?.optionNameEng ? String(fromPers.optionNameEng) : undefined;
    }, [pers]);

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

    const needsInfusions = useMemo(() => {
        if (!selectedClass) return false;
        if (selectedClass.name !== "ARTIFICER_2014") return false;
        return classLevelAfter === 2;
    }, [selectedClass, classLevelAfter]);

    const classChoiceGroupsResult = useMemo(() => {
        if (!selectedClass) return { grouped: {} as Record<string, any[]>, groupPickCounts: {} as Record<string, number> };
        const options = (selectedClass.classChoiceOptions || []).filter((opt) => (opt.levelsGranted || []).includes(classLevelAfter));
        const grouped = options.reduce((acc, opt) => {
            const group = opt.choiceOption.groupName;
            if (!acc[group]) acc[group] = [];
            acc[group].push(opt);
            return acc;
        }, {} as Record<string, typeof options>);

                return applyChoicePoolRulesToGroupedOptions({
                    scope: "class",
                    grouped: grouped as any,
                    levelAfter: classLevelAfter,
                    className: selectedClass.name,
                    pers,
                    optionsAtThisLevel: options as any,
                    selections: formData.classChoiceSelections as ChoiceSelections | undefined,
                });
        }, [selectedClass, classLevelAfter, pers, formData.classChoiceSelections]);

    const classChoiceGroups = classChoiceGroupsResult.grouped;
    const classChoiceGroupPickCounts = classChoiceGroupsResult.groupPickCounts;

        const subclassChoiceGroupsResult = useMemo(() => {
                if (!effectiveSubclass) return { grouped: {} as Record<string, any[]>, groupPickCounts: {} as Record<string, number> };
        const options = (effectiveSubclass.subclassChoiceOptions || []).filter((opt) => (opt.levelsGranted || []).includes(classLevelAfter));
        const grouped = options.reduce((acc, opt) => {
            const group = opt.choiceOption.groupName;
            if (!acc[group]) acc[group] = [];
            acc[group].push(opt);
            return acc;
        }, {} as Record<string, typeof options>);

        return applyChoicePoolRulesToGroupedOptions({
          scope: "subclass",
          grouped: grouped as any,
          levelAfter: classLevelAfter,
          subclassName: effectiveSubclass.name,
          pers,
          optionsAtThisLevel: options as any,
                    selections: formData.subclassChoiceSelections as ChoiceSelections | undefined,
        });
        }, [effectiveSubclass, classLevelAfter, pers, formData.subclassChoiceSelections]);

        const subclassChoiceGroups = subclassChoiceGroupsResult.grouped;
        const subclassChoiceGroupPickCounts = subclassChoiceGroupsResult.groupPickCounts;

    const newClassFeatures = useMemo(() => {
        if (!selectedClass) return [] as any[];
        return (selectedClass.features || [])
            .filter((f) => f.levelGranted === classLevelAfter)
            .sort((a, b) => (a.classFeatureId || 0) - (b.classFeatureId || 0));
    }, [selectedClass, classLevelAfter]);

    const newSubclassFeatures = useMemo(() => {
        if (!effectiveSubclass) return [] as any[];
        return (effectiveSubclass.features || [])
            .filter((f) => f.levelGranted === classLevelAfter)
            .sort((a, b) => (a.subclassFeatureId || 0) - (b.subclassFeatureId || 0));
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
        const result: Array<{ id: string; title: string; initialDisabled: boolean }> = [];

        if (isError || !pers) {
            result.push({
                id: "error",
                title: "Помилка",
                initialDisabled: true,
            });
            return result;
        }

        result.push({
            id: "path",
            title: "Початок",
            initialDisabled: true,
        });

        if (!selectedClassId || !selectedClass) return result;

        result.push({
            id: "summary",
            title: "Огляд",
            initialDisabled: false,
        });

        if (needsSubclass) {
            result.push({
                id: "subclass",
                title: "Підклас",
                initialDisabled: true,
            });
        }

        if (Object.keys(classChoiceGroups).length > 0) {
            result.push({
                id: "class-choices",
                title: "Опції класу",
                initialDisabled: true,
            });
        }

        if (Object.keys(subclassChoiceGroups).length > 0) {
            result.push({
                id: "subclass-choices",
                title: "Опції підкласу",
                initialDisabled: true,
            });
        }

        if (isASILevel) {
            result.push({
                id: "asi",
                title: "Покращення",
                initialDisabled: true,
            });

            if (selectedFeatId && selectedFeatHasChoices) {
                result.push({
                    id: "feat-choices",
                    title: "Опції риси",
                    initialDisabled: true,
                });
            }
        }

        if (needsInfusions) {
            result.push({
                id: "infusions",
                title: "Вливання",
                initialDisabled: true,
            });
        }

        const optionalAtLevel = (selectedClass.classOptionalFeatures || []).filter((opt: any) =>
            (opt.grantedOnLevels || []).includes(classLevelAfter)
        );

        const isReplacementOptional = (opt: any) =>
            Boolean(
                opt?.replacesInvocation ||
                    opt?.replacesFightingStyle ||
                    opt?.replacesManeuver ||
                    (Array.isArray(opt?.replacesFeatures) && opt.replacesFeatures.length > 0)
            );

        const hasReplacements = optionalAtLevel.some(isReplacementOptional);
        const hasOptionalFeaturesOnly = optionalAtLevel.some((opt: any) => !isReplacementOptional(opt));

        if (hasOptionalFeaturesOnly) {
            result.push({
                id: "optional-features",
                title: "Опціональні фічі",
                initialDisabled: true,
            });
        }

        if (hasReplacements) {
            result.push({
                id: "replacements",
                title: "Заміни",
                initialDisabled: true,
            });
        }

        result.push({
            id: "hp",
            title: "HP",
            initialDisabled: true,
        });

        result.push({
            id: "confirm",
            title: "Підтвердження",
            initialDisabled: false,
        });

        return result;
    }, [
        classChoiceGroups,
        classLevelAfter,
        isASILevel,
        isError,
        needsInfusions,
        needsSubclass,
        selectedFeatHasChoices,
        selectedFeatId,
        pers,
        selectedClass,
        selectedClassId,
        subclassChoiceGroups,
    ]);

    const renderStepContent = (stepId: string) => {
        if (isError || !pers) {
            return (
                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle>Помилка</CardTitle>
                    </CardHeader>
                    <CardContent className="text-slate-200">{isError ? (info as any).error : "Невідомо"}</CardContent>
                </Card>
            );
        }

        switch (stepId) {
            case "path":
                return (
                    <PathStep
                        pers={pers}
                        classes={classes as unknown as ClassI[]}
                        eligibleMulticlassClasses={eligibleMulticlassClasses}
                        mainClassLevel={mainClassLevel}
                        onNextDisabledChange={onNextDisabledChange}
                    />
                );
            case "summary":
                return (
                    <SummaryStep
                        totalLevel={nextLevel}
                        className={selectedClassName}
                        classLevelAfter={classLevelAfter}
                        newClassFeatures={newClassFeatures}
                        newSubclassFeatures={newSubclassFeatures}
                        selectedClass={selectedClass as unknown as ClassI}
                        effectiveSubclass={effectiveSubclass as unknown as SubclassI}
                    />
                );
            case "subclass":
                return <SubclassForm cls={selectedClass as unknown as ClassI} formId="subclass-form" onNextDisabledChange={onNextDisabledChange} />;
            case "class-choices":
                return (
                    <ClassChoiceOptionsForm
                        selectedClass={selectedClass as unknown as ClassI}
                        availableOptions={Object.values(classChoiceGroups).flat()}
                        groupPickCounts={classChoiceGroupPickCounts}
                        initialLevel={classLevelAfter}
                        initialPact={persPactBoon}
                        formId="class-choice-form"
                        onNextDisabledChange={onNextDisabledChange}
                    />
                );
            case "subclass-choices":
                return (
                    <SubclassChoiceOptionsForm
                        availableOptions={Object.values(subclassChoiceGroups).flat()}
                        groupPickCounts={subclassChoiceGroupPickCounts}
                        formId="subclass-choice-form"
                        onNextDisabledChange={onNextDisabledChange}
                    />
                );
            case "asi":
                return (
                    <LevelUpASIForm
                        feats={feats as any}
                        race={pers.race as any}
                        subrace={(pers as any).subrace ?? null}
                        formId="asi-form"
                        onNextDisabledChange={onNextDisabledChange}
                        levelAfter={nextLevel}
                        baseStats={featPrereqStats}
                        hasSpellcasting={hasSpellcasting}
                        raceName={((pers as any)?.race?.name as Races | undefined) ?? undefined}
                        pers={pers as any}
                        renderFeatChoicesInline={false}
                    />
                );
            case "feat-choices":
                return selectedFeat ? (
                    <FeatChoiceOptionsForm
                        selectedFeat={selectedFeat as any}
                        formId="feat-choices-form"
                        onNextDisabledChange={onNextDisabledChange}
                        pers={pers as any}
                    />
                ) : null;
            case "infusions": {
                const known = (pers as any)?.persInfusions?.map((pi: any) => Number(pi?.infusionId)).filter((v: any) => Number.isFinite(v)) ?? [];
                return (
                    <LevelUpInfusionsStep
                        infusions={(info as any).infusions || []}
                        artificerLevelAfter={classLevelAfter}
                        alreadyKnownInfusionIds={known}
                        requiredCount={4}
                        formId="infusions-form"
                        onNextDisabledChange={onNextDisabledChange}
                    />
                );
            }
            case "optional-features":
                return (
                    <OptionalFeaturesForm
                        selectedClass={selectedClass!}
                        effectiveSubclass={effectiveSubclass}
                        persChoiceOptions={(pers as any)?.choiceOptions || []}
                        classLevel={classLevelAfter}
                        formId="optional-features"
                        mode="OPTIONAL"
                        onNextDisabledChange={onNextDisabledChange}
                    />
                );
            case "replacements":
                return (
                    <OptionalFeaturesForm
                        selectedClass={selectedClass!}
                        effectiveSubclass={effectiveSubclass}
                        persChoiceOptions={(pers as any)?.choiceOptions || []}
                        classLevel={classLevelAfter}
                        formId="replacements"
                        mode="REPLACEMENT"
                        onNextDisabledChange={onNextDisabledChange}
                    />
                );
            case "hp":
                return (
                    <LevelUpHPStep
                        hitDie={selectedClass!.hitDie}
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
                        onNextDisabledChange={onNextDisabledChange}
                    />
                );
            case "confirm":
                return (
                    <ConfirmStep
                        totalLevel={nextLevel}
                        className={selectedClassName}
                        classLevelAfter={classLevelAfter}
                        formData={formData}
                    />
                );
            default:
                return null;
        }
    };

    const safeCurrentStep = steps.length > 0 ? Math.min(currentStep, steps.length - 1) : 0;
    const currentStepId = steps[safeCurrentStep]?.id;

    useEffect(() => {
        if (currentStep !== safeCurrentStep) {
            setCurrentStep(safeCurrentStep);
        }
    }, [currentStep, safeCurrentStep]);

    useEffect(() => {
        if (lastStepIdRef.current !== currentStepId) {
            const initial = steps[currentStep]?.initialDisabled ?? true;
            setNextDisabled(initial);
            lastStepIdRef.current = currentStepId;
        }
    }, [currentStep, currentStepId, steps]);

    const handleNext = async () => {
        if (safeCurrentStep < steps.length - 1) {
            setCurrentStep(safeCurrentStep + 1);
        } else {
            if (isSubmitting || !pers) return;
            setIsSubmitting(true);
            try {
                const res = await levelUpCharacter(pers.persId, formData as any);
                if ('error' in res) {
                    toast.error(res.error || "Помилка при збереженні");
                } else {
                    toast.success("Рівень підвищено!");
                    router.push(`/char/${pers.persId}`);
                    // Clear level-up selections after navigation starts to avoid UI flash.
                    requestAnimationFrame(() => {
                      resetForm();
                      usePersFormStore.persist.clearStorage();
                    });
                }
            } catch (err) {
                console.error(err);
                toast.error("Сталася помилка");
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handlePrev = () => {
        if (safeCurrentStep > 0) {
            setCurrentStep(safeCurrentStep - 1);
        }
    };

  const CurrentComponent = currentStepId ? renderStepContent(currentStepId) : null;

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="space-y-4">
        <div className="glass-panel border-gradient-rpg w-full rounded-2xl px-3 py-4 sm:px-4 sm:py-4 md:px-6 md:py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
            <div className="space-y-1">
              <h1 className="font-rpg-display text-xl font-semibold uppercase tracking-widest text-slate-200 sm:text-2xl md:text-3xl">
                Підвищення рівня
              </h1>
              <div className="text-sm text-slate-400">До {nextLevel}-го рівня</div>
            </div>

          </div>
        </div>

        <Card className="shadow-2xl">
          <CardContent className="grid gap-3 p-3 sm:gap-4 sm:p-4 md:grid-cols-[1fr,300px] md:p-6">
            <div className="glass-panel border-gradient-rpg space-y-3 rounded-xl p-3 sm:space-y-4 sm:p-4 md:p-5">
              {CurrentComponent}
            </div>

            <aside className="hidden glass-panel border-gradient-rpg rounded-xl p-3 sm:p-4 md:block">
              <div className="sticky top-14 sm:top-16">
                <div className="flex items-center justify-between text-xs text-slate-400 sm:text-sm">
                  <span className="font-medium text-slate-200">Ваш прогрес</span>
                  <span>
                                        {safeCurrentStep + 1}/{steps.length}
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {steps.map((s, i) => {
                    const isActive = i === safeCurrentStep;
                    const isDone = i < safeCurrentStep;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        className={clsx(
                          "flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left sm:px-3",
                          isActive
                            ? "border-gradient-rpg border-gradient-rpg-active glass-active bg-white/5 text-white"
                            : "border-white/10 bg-white/5 text-slate-300",
                          isDone && "hover:bg-white/7"
                        )}
                        onClick={() => {
                                                    if (i <= safeCurrentStep) setCurrentStep(i);
                        }}
                                                disabled={i > safeCurrentStep}
                      >
                        <span className="truncate pr-2 text-xs sm:text-sm">{s.title}</span>
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[11px] text-slate-200">
                          {isDone ? <Check className="h-3 w-3" /> : i + 1}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>
          </CardContent>
        </Card>

        <div className="fixed bottom-[calc(70px+env(safe-area-inset-bottom))] inset-x-0 z-[60] w-full px-2 pb-3 sm:px-3 md:sticky md:bottom-0 md:px-0">
          <div className="border-gradient-rpg mx-auto flex w-full max-w-6xl items-center justify-between rounded-xl border-t border-white/10 bg-slate-900/95 px-2.5 py-2.5 backdrop-blur-xl shadow-xl shadow-black/30 sm:rounded-2xl sm:px-3 sm:py-3">
            <div className="flex items-center gap-2 text-xs text-slate-300 sm:gap-3 sm:text-sm">
              <Badge variant="secondary" className="bg-white/5 text-white text-[11px] sm:text-xs">
                                Крок {safeCurrentStep + 1} / {steps.length}
              </Badge>
                            <span className="hidden sm:inline">{steps[safeCurrentStep]?.title}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={currentStep === 0 || isSubmitting}
                className="border-white/15 bg-white/5 text-slate-300"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Назад
              </Button>

              <Button onClick={handleNext} disabled={nextDisabled || isSubmitting}>
                {currentStep === steps.length - 1 ? (
                  <>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? "Збереження..." : "Підвищити рівень"}
                  </>
                ) : (
                  <>
                    Далі <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
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
    selectedClass,
    effectiveSubclass,
}: {
    totalLevel: number;
    className: string;
    classLevelAfter: number;
    newClassFeatures: any[];
    newSubclassFeatures: any[];
    selectedClass: ClassI | null;
    effectiveSubclass: SubclassI | null;
}) {
    const [selectedFeature, setSelectedFeature] = useState<{name: string, description: string} | null>(null);

    const renderFeature = (f: any, source: string) => {
        const featureData: FeatureItemData = {
            ...f.feature,
            displayType: Array.isArray(f.feature?.displayType) ? f.feature.displayType : [f.feature?.displayType],
            source: source,
            sourceName: className
        };
        const isResource = featureData.displayType.includes(FeatureDisplayType.CLASS_RESOURCE);

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
    };

    return (
        <Card className="glass-card backdrop-blur-xl border-white/10 bg-white/5 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
            <CardHeader className="pb-2">
                <CardTitle className="text-xl font-light tracking-wide text-slate-100 font-rpg-display uppercase">Вітаємо з {totalLevel}-м рівнем!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
                <div className="space-y-3">
                    <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-indigo-400 px-1">Ви підвищуєте:</p>
                    <div className="grid grid-cols-1 gap-3">
                        {selectedClass && (
                            <ClassInfoModal 
                                cls={selectedClass} 
                                trigger={
                                    <button className="w-full text-left group">
                                        <div className="glass-panel border-gradient-rpg rounded-xl p-4 bg-white/5 border-white/10 group-hover:bg-white/10 transition-all duration-300 group-hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
                                                <ChevronRight className="w-5 h-5 text-indigo-300" />
                                            </div>
                                            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Клас</p>
                                            <p className="text-lg font-bold text-white group-hover:text-indigo-200 transition-colors">
                                                {className} <span className="text-slate-400 font-light ml-1">(рівень {classLevelAfter})</span>
                                            </p>
                                        </div>
                                    </button>
                                }
                            />
                        )}

                        {effectiveSubclass && (
                             <SubclassInfoModal 
                                subclass={effectiveSubclass}
                                trigger={
                                    <button className="w-full text-left group">
                                        <div className="glass-panel border-gradient-rpg rounded-xl p-4 bg-white/5 border-white/10 group-hover:bg-white/10 transition-all duration-300 group-hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
                                                <ChevronRight className="w-5 h-5 text-violet-300" />
                                            </div>
                                            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Підклас</p>
                                            <p className="text-lg font-bold text-white group-hover:text-violet-200 transition-colors">
                                                {subclassTranslations[effectiveSubclass.name as keyof typeof subclassTranslations] || effectiveSubclass.name}
                                            </p>
                                        </div>
                                    </button>
                                }
                             />
                        )}
                    </div>
                </div>

                {newClassFeatures.length > 0 ? (
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400 px-1">Нові класові вміння:</h3>
                        <div className="grid grid-cols-1 gap-3">
                            {newClassFeatures.map((f: any) => renderFeature(f, "class"))}
                        </div>
                    </div>
                ) : null}

                {newSubclassFeatures.length > 0 ? (
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400 px-1">Нові вміння підкласу:</h3>
                        <div className="grid grid-cols-1 gap-3">
                            {newSubclassFeatures.map((f: any) => renderFeature(f, "subclass"))}
                        </div>
                    </div>
                ) : null}
            </CardContent>

            <ControlledInfoDialog
                open={!!selectedFeature}
                onOpenChange={(open) => !open && setSelectedFeature(null)}
                title={selectedFeature?.name || "Вміння"}
            >
                {selectedFeature?.description ? (
                    <div className="glass-panel border-gradient-rpg rounded-xl border border-white/10 p-5 bg-white/5">
                        <FormattedDescription 
                            content={selectedFeature.description} 
                            className="text-base text-slate-300 leading-relaxed" 
                        />
                    </div>
                ) : (
                    <p className="text-sm text-slate-400 italic">Опис відсутній</p>
                )}
            </ControlledInfoDialog>
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
                            <span className="text-sm text-slate-200">Опціональні фічі / заміни обрано</span>
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
                            Підняти рівень наявного класу
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
