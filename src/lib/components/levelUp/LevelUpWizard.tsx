"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { getLevelUpInfo, levelUpCharacter } from "@/lib/actions/levelup";
import { characterLevelOnly } from "@/rules/character-level";
import { findMissingSpeciesTraits } from "@/rules/species-grants";
import { activateLevelUpDraftStorage, usePersFormStore } from "@/lib/stores/persFormStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlainTitleCard } from "@/components/no-ai/PlainTitleCard";
import { ARCANE } from "@/styles/palette";
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
import LevelUpSkillProficienciesForm from "@/lib/components/levelUp/LevelUpSkillProficienciesForm";
import ClassesForm from "@/lib/components/characterCreator/ClassesForm";
import OptionalFeaturesForm from "@/lib/components/levelUp/OptionalFeaturesForm";
import LevelUpHPStep from "@/lib/components/levelUp/LevelUpHPStep";
import LevelUpInfusionsStep from "@/lib/components/levelUp/LevelUpInfusionsStep";
import clsx from "clsx";
import {
  classTranslations,
  subclassTranslations,
  classTranslationsEng,
  attributesUkrShort,
  LanguageTranslations,
  featTranslations,
} from "@/lib/refs/translation";
import { Ability, FeatureDisplayType, SpellcastingType } from "@prisma/client";
import { Races } from "@prisma/client";
import { ClassI, SubclassI } from "@/lib/types/model-types";
import {
  ControlledInfoDialog,
  InfoDialog,
  InfoGrid,
  InfoPill,
  InfoSectionTitle,
} from "@/lib/components/characterCreator/EntityInfoDialog";
import {
  FeatureItemData,
  FeatureCard,
  ResourceCard,
} from "@/lib/components/characterSheet/shared/FeatureCards";
import {
  formatAbilityList,
  formatArmorProficiencies,
  formatLanguages,
  formatMulticlassReqs,
  formatSkillProficiencies,
  formatToolProficiencies,
  formatWeaponProficiencies,
  translateValue,
} from "@/lib/components/characterCreator/infoUtils";
import { calculateFinalAbilityScores, calculateFinalStat } from "@/lib/logic/bonus-calculator";
import { describeMulticlassEntryProblem, findMulticlassEntryProblem, type MulticlassRuleset } from "@/rules/multiclass-entry";
import { findAbilityScoresAfterLevelUp } from "@/rules/levelup-ability-scores";
import { getRulesStrategy } from "@/rules/strategies";
import { findInfusionPicksAtLevel } from "@/rules/artificer-infusions";
import { sumLevelUpFeatureHitPoints, toHitPointGrantingFeature } from "@/rules/hit-points";
import {
  extractSkillsFromChoiceOption,
  extractExpertisesFromChoiceOption,
} from "@/lib/logic/characterUtils";
import { ClassInfoModal } from "@/lib/components/characterCreator/modals/ClassInfoModal";
import { SubclassInfoModal } from "@/lib/components/characterCreator/modals/SubclassInfoModal";

import { LanguagesForm } from "@/lib/components/characterCreator/LanguagesForm";
import { ExpertiseForm } from "@/lib/components/characterCreator/ExpertiseForm";
import { LevelUpWeaponMasteryStep } from "@/lib/components/levelUp/LevelUpWeaponMasteryStep";
import { findLevelUpWeaponMastery } from "@/lib/components/levelUp/levelup-weapon-mastery";
import { LevelUpFeatSpellStep } from "@/lib/components/levelUp/LevelUpFeatSpellStep";
import { findVisibleOptionalFeatures } from "@/lib/components/levelUp/levelup-optional-features";

import {
  CHOICE_GROUPS,
  baseChoiceGroupName,
  getChoicePoolRule,
} from "@/lib/logic/choicePoolRules";

const stripSyntheticSuffix = (groupName: string) =>
  baseChoiceGroupName(groupName);

type ChoiceSelections = Record<string, number | number[]>;

function detectSelectedPact(args: {
  pers: any;
  optionsAtThisLevel: any[];
  selections: ChoiceSelections | undefined;
}) {
  const fromPers = (args.pers?.choiceOptions || []).find(
    (co: any) =>
      typeof co?.optionNameEng === "string" &&
      co.optionNameEng.startsWith("Pact of")
  );
  if (fromPers?.optionNameEng) return String(fromPers.optionNameEng);

  const selectedIds = Object.values(args.selections || {})
    .flatMap((v) => (Array.isArray(v) ? v : [v]))
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));

  for (const opt of args.optionsAtThisLevel) {
    if (!selectedIds.includes(opt.choiceOptionId)) continue;
    if (
      typeof opt.choiceOption?.optionNameEng === "string" &&
      opt.choiceOption.optionNameEng.startsWith("Pact of")
    ) {
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

  const isKnowledgeGroup = (name: string) => {
    const lower = String(name || "").toLowerCase();
    return (
      lower.includes("blessing of knowledge") ||
      lower.startsWith("благословення знань")
    );
  };

  // Default all groups to 1 pick unless a pool rule overrides it.
  for (const groupName of Object.keys(args.grouped)) {
    groupPickCounts[groupName] = isKnowledgeGroup(groupName) ? 2 : 1;
  }

  const existingChoiceOptionIds = new Set<number>();
  (args.pers?.choiceOptions || []).forEach((co: any) => {
    if (typeof co?.choiceOptionId === "number")
      existingChoiceOptionIds.add(co.choiceOptionId);
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
    if (
      rule.scope === "class" &&
      rule.className === "WARLOCK_2014" &&
      baseGroup === CHOICE_GROUPS.WARLOCK_INVOCATIONS
    ) {
      const selectedPact = detectSelectedPact({
        pers: args.pers,
        optionsAtThisLevel: args.optionsAtThisLevel,
        selections: args.selections,
      });

      eligible = eligible.filter((opt: any) => {
        const prereq = opt.choiceOption?.prerequisites as any;
        const minLevel = prereq?.level ? Number(prereq.level) : undefined;
        if (
          typeof minLevel === "number" &&
          Number.isFinite(minLevel) &&
          args.levelAfter < minLevel
        ) {
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
  activateLevelUpDraftStorage();

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
  const weapons = useMemo(() => info?.weapons || [], [info?.weapons]);

  const selectedFeatId = useMemo(() => {
    const raw = (formData as any)?.featId;
    const id =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
        ? Number(raw)
        : NaN;
    return Number.isFinite(id) ? (id as number) : undefined;
  }, [formData]);

  const selectedFeat = useMemo(() => {
    if (!selectedFeatId) return undefined;
    return (feats as any[])?.find(
      (f: any) => Number(f?.featId) === selectedFeatId
    );
  }, [feats, selectedFeatId]);

  const selectedFeatSpellOffer = useMemo(() => {
    const featName = (selectedFeat as { name?: string } | undefined)?.name;
    if (isError || !featName) return undefined;
    return info.featSpellChoiceOffers[featName];
  }, [info, isError, selectedFeat]);

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
    const extras = (pers.multiclasses || []).reduce(
      (acc: number, m: any) => acc + (m.classLevel || 0),
      0
    );
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
    const main = (pers as any)?.class?.spellcastingType as
      | SpellcastingType
      | undefined;
    if (main && main !== SpellcastingType.NONE) return true;
    const multi = ((pers as any)?.multiclasses || [])
      .map(
        (m: any) => m?.class?.spellcastingType as SpellcastingType | undefined
      )
      .filter(Boolean);
    return multi.some((t: any) => t && t !== SpellcastingType.NONE);
  }, [pers]);

  const selectedClassId = useMemo(() => {
    const raw = formData.classId;
    const id =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
        ? Number(raw)
        : NaN;
    return Number.isFinite(id) ? id : undefined;
  }, [formData.classId]);

  const selectedClass = useMemo(() => {
    if (!selectedClassId) return null;
    return (
      (classes as unknown as ClassI[]).find(
        (c) => c.classId === selectedClassId
      ) ?? null
    );
  }, [classes, selectedClassId]);

  const selectedClassName = useMemo(() => {
    if (!selectedClass) return "";
    return (
      classTranslations[selectedClass.name] ||
      classTranslationsEng[selectedClass.name] ||
      selectedClass.name
    );
  }, [selectedClass]);

  const selectedMulticlassRow = useMemo(() => {
    if (!pers || !selectedClassId) return null;
    return (
      (pers.multiclasses || []).find(
        (m: any) => m.classId === selectedClassId
      ) ?? null
    );
  }, [pers, selectedClassId]);

  const persPactBoon = useMemo(() => {
    if (!pers) return undefined;
    const fromPers = (pers.choiceOptions || []).find(
      (co: any) =>
        typeof co?.optionNameEng === "string" &&
        co.optionNameEng.startsWith("Pact of")
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

  const weaponMastery = useMemo(
    () =>
      findLevelUpWeaponMastery({
        pers,
        selectedClass,
        selectedClassId,
        classLevelAfter,
        mainClassLevel,
        weapons,
      }),
    [pers, selectedClass, selectedClassId, classLevelAfter, mainClassLevel, weapons],
  );

  const currentSubclassIdForSelectedClass = useMemo(() => {
    if (!pers || !selectedClassId) return undefined;
    if (selectedClassId === pers.classId) return pers.subclassId ?? undefined;
    return selectedMulticlassRow?.subclassId ?? undefined;
  }, [pers, selectedClassId, selectedMulticlassRow]);

  const effectiveSubclassId = useMemo(() => {
    const fromStore = formData.subclassId
      ? Number(formData.subclassId)
      : undefined;
    return fromStore ?? currentSubclassIdForSelectedClass;
  }, [formData.subclassId, currentSubclassIdForSelectedClass]);

  const effectiveSubclass = useMemo(() => {
    if (!selectedClass || !effectiveSubclassId) return null;
    return (
      selectedClass.subclasses?.find(
        (s) => s.subclassId === effectiveSubclassId
      ) ?? null
    );
  }, [selectedClass, effectiveSubclassId]);

  const currentLevelFeatures = useMemo(() => {
    if (!selectedClass) return [];
    const features = selectedClass.features
      .filter((f) => f.levelGranted === classLevelAfter)
      .map((f) => f.feature);

    if (effectiveSubclass) {
      features.push(
        ...effectiveSubclass.features
          .filter((f) => f.levelGranted === classLevelAfter)
          .map((f) => f.feature)
      );
    }

    // Optional features selected AT THIS LEVEL
    if (formData.classOptionalFeatureSelections) {
      selectedClass.classOptionalFeatures.forEach((cof) => {
        if (formData.classOptionalFeatureSelections![cof.optionalFeatureId] && cof.feature) {
          features.push(cof.feature);
        }
      });
    }

    const collectChoiceFeatures = (
      selections: ChoiceSelections | undefined,
      options: Array<{ choiceOptionId: number; choiceOption?: { features?: Array<{ feature?: any | null } | null> | null } | null }> | undefined
    ) => {
      if (!selections || !Array.isArray(options)) return;
      const map = new Map<number, any>();
      options.forEach((o: any) => map.set(Number(o.choiceOptionId), o));
      Object.values(selections).forEach((v) => {
        const ids = Array.isArray(v) ? v : [v];
        ids.forEach((raw) => {
          const id = Number(raw);
          if (!Number.isFinite(id)) return;
          const opt = map.get(id);
          if (!opt) return;
          (opt.choiceOption?.features || []).forEach((f: any) => {
            if (f?.feature) features.push(f.feature);
          });
        });
      });
    };

    collectChoiceFeatures(
      formData.classChoiceSelections as ChoiceSelections | undefined,
      selectedClass.classChoiceOptions as any
    );
    collectChoiceFeatures(
      formData.subclassChoiceSelections as ChoiceSelections | undefined,
      effectiveSubclass?.subclassChoiceOptions as any
    );
    collectChoiceFeatures(
      formData.featChoiceSelections as ChoiceSelections | undefined,
      (selectedFeat as any)?.featChoiceOptions as any
    );

    return features;
  }, [
    selectedClass,
    classLevelAfter,
    effectiveSubclass,
    formData.classOptionalFeatureSelections,
    formData.classChoiceSelections,
    formData.subclassChoiceSelections,
    formData.featChoiceSelections,
    selectedFeat,
  ]);

  const needsSkillProficiencies = useMemo(() => {
    return currentLevelFeatures.some((f) => {
      const sp = f.skillProficiencies as any;
      if (!sp) return false;
      if (Array.isArray(sp)) return false;
      const rawCount =
        typeof sp.choiceCount === "number"
          ? sp.choiceCount
          : typeof sp.any === "number"
            ? sp.any
            : Number(sp.choiceCount);
      return Number.isFinite(rawCount) && rawCount > 0;
    });
  }, [currentLevelFeatures]);

  const needsExpertise = useMemo(() => {
    const hasKnowledgeChoicesAtThisLevel = (effectiveSubclass?.subclassChoiceOptions || []).some((opt: any) => {
      if (!(opt?.levelsGranted || []).includes(classLevelAfter)) return false;
      const groupName = String(opt?.choiceOption?.groupName || "").toLowerCase();
      const effectKind = String(opt?.choiceOption?.effectKind || "").toUpperCase();
      return (
        groupName.includes("благословення знань") ||
        groupName.includes("blessings of knowledge") ||
        effectKind === "SKILL_EXPERTISE"
      );
    });

    return currentLevelFeatures.some((f) => {
      if (String((f as any)?.engName || "") === "Blessings of Knowledge" && hasKnowledgeChoicesAtThisLevel) {
        return false;
      }
      const se = f.skillExpertises as any;
      return (
        (se?.count || 0) > 0 ||
        se?.chooseFromCurrentProficiencies ||
        se?.options?.length > 0
      );
    });
  }, [classLevelAfter, currentLevelFeatures, effectiveSubclass]);

  const needsLanguages = useMemo(() => {
    let count = 0;
    currentLevelFeatures.forEach((f) => {
      count += f.languagesToChooseCount || 0;
    });
    return count > 0;
  }, [currentLevelFeatures]);

  const existingLanguageKeys = useMemo(() => {
    const raw = String((pers as any)?.customLanguagesKnown ?? "");
    if (!raw.trim()) return [] as string[];

    const reverse = new Map<string, string>();
    Object.entries(LanguageTranslations).forEach(([key, value]) => {
      reverse.set(String(value).toLowerCase(), key);
      reverse.set(String(key).toLowerCase(), key);
    });

    const out = new Set<string>();
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (/^Обери\b/i.test(trimmed)) return;

      trimmed.split(/[•,]/).forEach((part) => {
        const token = part.trim();
        if (!token) return;
        if (/^Обери\b/i.test(token)) return;
        const key = reverse.get(token.toLowerCase());
        if (key) out.add(key);
      });
    });

    return Array.from(out);
  }, [pers]);

  const needsSubclass = useMemo(() => {
    if (!selectedClass || !selectedClassId) return false;
    const hasSubclassAlready = Boolean(currentSubclassIdForSelectedClass);
    if (hasSubclassAlready) return false;
    return selectedClass.subclassLevel === classLevelAfter;
  }, [
    selectedClass,
    selectedClassId,
    currentSubclassIdForSelectedClass,
    classLevelAfter,
  ]);

  const isASILevel = useMemo(() => {
    if (!selectedClass) return false;
    return (selectedClass.abilityScoreUpLevels || []).includes(classLevelAfter);
  }, [selectedClass, classLevelAfter]);

  // 19-й рівень класу 2024 дає не підвищення, а рису: «You gain an Epic Boon feat or another
  // feat of your choice for which you qualify» (SRD 2024, classes.md). У 2014 рівня немає.
  const isEpicBoonLevel = useMemo(() => {
    if (!selectedClass) return false;
    return getRulesStrategy(pers?.ruleset ?? "RULES_2014").isEpicBoonLevel(selectedClass, classLevelAfter);
  }, [selectedClass, classLevelAfter, pers]);

  /// Вливання дає не лише 2 рівень: таблиця TCoE додає по два на 6 / 10 / 14 / 18 (BUG-007).
  const infusionPicks = useMemo(() => {
    if (!selectedClass) return 0;
    if (selectedClass.name !== "ARTIFICER_2014") return 0;
    return findInfusionPicksAtLevel(classLevelAfter);
  }, [selectedClass, classLevelAfter]);

  const needsInfusions = infusionPicks > 0;

  const classChoiceGroupsResult = useMemo(() => {
    if (!selectedClass)
      return {
        grouped: {} as Record<string, any[]>,
        groupPickCounts: {} as Record<string, number>,
      };
    const options = (selectedClass.classChoiceOptions || []).filter((opt) =>
      (opt.levelsGranted || []).includes(classLevelAfter)
    );
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
      selections: formData.classChoiceSelections as
        | ChoiceSelections
        | undefined,
    });
  }, [selectedClass, classLevelAfter, pers, formData.classChoiceSelections]);

  const classChoiceGroups = classChoiceGroupsResult.grouped;
  const classChoiceGroupPickCounts = classChoiceGroupsResult.groupPickCounts;

  const subclassChoiceGroupsResult = useMemo(() => {
    if (!effectiveSubclass)
      return {
        grouped: {} as Record<string, any[]>,
        groupPickCounts: {} as Record<string, number>,
      };
    const options = (effectiveSubclass.subclassChoiceOptions || []).filter(
      (opt) => (opt.levelsGranted || []).includes(classLevelAfter)
    );
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
      selections: formData.subclassChoiceSelections as
        | ChoiceSelections
        | undefined,
    });
  }, [
    effectiveSubclass,
    classLevelAfter,
    pers,
    formData.subclassChoiceSelections,
  ]);

  const subclassChoiceGroups = subclassChoiceGroupsResult.grouped;
  const subclassChoiceGroupPickCounts =
    subclassChoiceGroupsResult.groupPickCounts;

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

  /// Доданки мають бути ті самі, що й у `levelup-persistence`: без них майстер показував +8, а
  /// записував +9 (P4-regression-2014-04).
  const traitHitPointsPerLevel = sumLevelUpFeatureHitPoints({
    ownedFeatures: ((pers as any)?.features ?? []).map((entry: any) => toHitPointGrantingFeature(entry.feature)),
    gainedFeatures: [...newClassFeatures, ...newSubclassFeatures].map((entry: any) => ({
      featureId: entry.featureId,
      bonusHitPointsPerLevel: entry.feature?.bonusHitPointsPerLevel ?? null,
      grantingClassIds: selectedClass ? [selectedClass.classId] : [],
    })),
    leveledClassId: selectedClass?.classId ?? 0,
    classLevelAfter,
  });

  // Риса виду відкривається рівнем ПЕРСОНАЖА, тому обраний клас на неї не впливає (§4).
  const newSpeciesTraits = useMemo(() => {
    const owned = ((pers as any)?.features ?? []).map((f: any) => f.featureId);
    return findMissingSpeciesTraits((pers as any)?.race?.traits ?? [], characterLevelOnly(nextLevel), owned);
  }, [pers, nextLevel]);

  // Передумова мультикласу — попередження, не заборона (рішення власника 2026-09-06, KR31.9):
  // характеристика могла впасти вже після того, як клас узятий, а книга клас за це не забирає.
  // Список несе всі ще не взяті класи; сам факт «13+ не вистачає» показує PathStep попередженням.
  const eligibleMulticlassClasses = useMemo(() => {
    if (!pers) return [] as ClassI[];
    const allClasses = classes as unknown as ClassI[];
    return allClasses.filter((cls) => !existingClassIds.has(cls.classId));
  }, [classes, existingClassIds, pers]);

  const levelUpSelectedSkills = useMemo(() => {
    const out = new Set<string>();
    const collect = (
      selections: ChoiceSelections | undefined,
      options: any[] | undefined
    ) => {
      if (!selections || !Array.isArray(options)) return;
      const map = new Map<number, any>();
      options.forEach((o: any) => map.set(Number(o.choiceOptionId), o));
      Object.values(selections).forEach((v) => {
        const ids = Array.isArray(v) ? v : [v];
        ids.forEach((raw) => {
          const id = Number(raw);
          const opt = map.get(id);
          if (!opt) return;
          extractSkillsFromChoiceOption(opt.choiceOption).forEach((s) =>
            out.add(s)
          );
        });
      });
    };

    collect(
      formData.classChoiceSelections as ChoiceSelections | undefined,
      selectedClass?.classChoiceOptions as any
    );
    collect(
      formData.subclassChoiceSelections as ChoiceSelections | undefined,
      effectiveSubclass?.subclassChoiceOptions as any
    );
    collect(
      formData.featChoiceSelections as ChoiceSelections | undefined,
      (selectedFeat as any)?.featChoiceOptions as any
    );

    const levelUpSkillSelections = (formData as any).levelUpSkillSelections as
      | Record<string, string[]>
      | undefined;
    if (levelUpSkillSelections) {
      Object.values(levelUpSkillSelections).forEach((list) => {
        (Array.isArray(list) ? list : []).forEach((skill) => out.add(skill));
      });
    }

    return Array.from(out);
  }, [
    formData.classChoiceSelections,
    formData.subclassChoiceSelections,
    formData.featChoiceSelections,
    (formData as any).levelUpSkillSelections,
    selectedClass,
    effectiveSubclass,
    selectedFeat,
  ]);

  const levelUpSelectedExpertises = useMemo(() => {
    const out = new Set<string>();
    const collect = (
      selections: ChoiceSelections | undefined,
      options: any[] | undefined
    ) => {
      if (!selections || !Array.isArray(options)) return;
      const map = new Map<number, any>();
      options.forEach((o: any) => map.set(Number(o.choiceOptionId), o));
      Object.values(selections).forEach((v) => {
        const ids = Array.isArray(v) ? v : [v];
        ids.forEach((raw) => {
          const id = Number(raw);
          const opt = map.get(id);
          if (!opt) return;
          extractExpertisesFromChoiceOption(opt.choiceOption).forEach((s) =>
            out.add(s)
          );
        });
      });
    };

    collect(
      formData.classChoiceSelections as ChoiceSelections | undefined,
      selectedClass?.classChoiceOptions as any
    );
    collect(
      formData.subclassChoiceSelections as ChoiceSelections | undefined,
      effectiveSubclass?.subclassChoiceOptions as any
    );
    collect(
      formData.featChoiceSelections as ChoiceSelections | undefined,
      (selectedFeat as any)?.featChoiceOptions as any
    );

    return Array.from(out);
  }, [
    formData.classChoiceSelections,
    formData.subclassChoiceSelections,
    formData.featChoiceSelections,
    selectedClass,
    effectiveSubclass,
    selectedFeat,
  ]);

  const steps = useMemo(() => {
    const result: Array<{
      id: string;
      title: string;
      initialDisabled: boolean;
    }> = [];

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

    if (isASILevel || isEpicBoonLevel) {
      result.push({
        id: isEpicBoonLevel ? "epic-boon" : "asi",
        title: isEpicBoonLevel ? "Епічний дар" : "Покращення",
        initialDisabled: true,
      });

      if (selectedFeatId && selectedFeatHasChoices) {
        result.push({
          id: "feat-choices",
          title: "Опції риси",
          initialDisabled: true,
        });
      }

      if (selectedFeatSpellOffer) {
        result.push({
          id: "feat-spells",
          title: "Заклинання риси",
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

    if (weaponMastery.needsChoice) {
      result.push({
        id: "weapon-mastery",
        title: "Майстерність зброї",
        initialDisabled: true,
      });
    }

    if (needsSkillProficiencies) {
      result.push({
        id: "skills",
        title: "Навички",
        initialDisabled: true,
      });
    }

    if (needsExpertise) {
      result.push({
        id: "expertise",
        title: "Експертиза",
        initialDisabled: true,
      });
    }

    if (needsLanguages) {
      result.push({
        id: "languages",
        title: "Мови",
        initialDisabled: true,
      });
    }

    const { selectable: visibleOptionalSelectable, replacements: visibleReplacements } =
      findVisibleOptionalFeatures({
        persChoiceOptionIds: (pers.choiceOptions ?? []).map((option) => Number(option.choiceOptionId)),
        selections: [
          formData.classChoiceSelections,
          formData.subclassChoiceSelections,
          formData.featChoiceSelections,
        ],
        classOptionalFeatures: selectedClass.classOptionalFeatures ?? [],
        classLevelAfter,
      });

    if (visibleOptionalSelectable.length > 0) {
      result.push({
        id: "optional-features",
        title: "Опціональні фічі",
        initialDisabled: true,
      });
    }

    if (visibleReplacements.length > 0) {
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
    formData,
    isASILevel,
    isEpicBoonLevel,
    isError,
    needsExpertise,
    needsLanguages,
    weaponMastery.needsChoice,
    needsInfusions,
    needsSkillProficiencies,
    needsSubclass,
    selectedFeatHasChoices,
    selectedFeatId,
    selectedFeatSpellOffer,
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
          <CardContent className="text-slate-200">
            {isError ? (info as any).error : "Невідомо"}
          </CardContent>
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
            newSpeciesTraits={newSpeciesTraits}
            selectedClass={selectedClass as unknown as ClassI}
            effectiveSubclass={effectiveSubclass as unknown as SubclassI}
          />
        );
      case "subclass":
        return (
          <SubclassForm
            cls={selectedClass as unknown as ClassI}
            formId="subclass-form"
            onNextDisabledChange={onNextDisabledChange}
          />
        );
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
      case "weapon-mastery":
        return (
          <LevelUpWeaponMasteryStep
            capacity={weaponMastery.capacity}
            options={weaponMastery.options}
            currentWeaponIds={weaponMastery.currentWeaponIds}
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
      case "epic-boon":
      case "asi":
        return (
          <LevelUpASIForm
            allowAbilityScoreIncrease={!isEpicBoonLevel}
            feats={feats as any}
            race={pers.race as any}
            subrace={(pers as any).subrace ?? null}
            formId="asi-form"
            onNextDisabledChange={onNextDisabledChange}
            levelAfter={nextLevel}
            baseStats={featPrereqStats}
            hasSpellcasting={hasSpellcasting}
            raceName={
              ((pers as any)?.race?.name as Races | undefined) ?? undefined
            }
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
            extraExistingSkills={levelUpSelectedSkills}
            extraExistingExpertises={levelUpSelectedExpertises}
          />
        ) : null;
      case "feat-spells":
        return selectedFeatSpellOffer ? (
          <LevelUpFeatSpellStep
            featLabel={featTranslations[(selectedFeat as { name: string }).name] ?? (selectedFeat as { name: string }).name}
            offer={selectedFeatSpellOffer}
            onNextDisabledChange={onNextDisabledChange}
          />
        ) : null;
      case "infusions": {
        const known =
          (pers as any)?.persInfusions
            ?.map((pi: any) => Number(pi?.infusionId))
            .filter((v: any) => Number.isFinite(v)) ?? [];
        return (
          <LevelUpInfusionsStep
            infusions={(info as any).infusions || []}
            artificerLevelAfter={classLevelAfter}
            alreadyKnownInfusionIds={known}
            requiredCount={infusionPicks}
            formId="infusions-form"
            onNextDisabledChange={onNextDisabledChange}
          />
        );
      }
      case "skills": {
        const levelUpSkillSelections = (formData as any).levelUpSkillSelections as
          | Record<string, string[]>
          | undefined;
        const selectedBySkillForm = levelUpSkillSelections
          ? Object.values(levelUpSkillSelections).flat()
          : [];

        const extraExistingSkills = [
          ...pers!.skills.map((s: any) => s.name),
          ...levelUpSelectedSkills.filter((s) => !selectedBySkillForm.includes(s)),
          ...levelUpSelectedExpertises,
        ];

        return (
          <LevelUpSkillProficienciesForm
            activeFeatures={currentLevelFeatures}
            formId="levelup-skills-form"
            onNextDisabledChange={onNextDisabledChange}
            extraExistingSkills={extraExistingSkills}
          />
        );
      }
      case "expertise":
        return (
          <ExpertiseForm
            selectedClass={selectedClass!}
            subclass={effectiveSubclass}
            activeFeatures={currentLevelFeatures}
            race={pers!.race as any}
            background={{} as any}
            formId="expertise-form"
            onNextDisabledChange={onNextDisabledChange}
            extraSkills={[
              ...pers!.skills.map((s: any) => s.name),
              ...levelUpSelectedSkills,
              ...levelUpSelectedExpertises,
            ]}
            extraExpertises={[
              ...pers!.skills
                .filter((s: any) => s.proficiencyType === "EXPERTISE")
                .map((s: any) => s.name),
              ...levelUpSelectedExpertises,
            ]}
          />
        );
      case "languages":
        return (
          <LanguagesForm
            race={pers!.race as any}
            selectedClass={selectedClass!}
            subclass={effectiveSubclass}
            background={{} as any}
            selectedSubrace={pers!.subrace as any}
            activeFeatures={currentLevelFeatures}
            existingLanguages={existingLanguageKeys}
            forcedLanguagesToChooseCount={currentLevelFeatures.reduce(
              (acc, f) => acc + (f.languagesToChooseCount || 0),
              0
            )}
            formId="languages-form"
            onNextDisabledChange={onNextDisabledChange}
          />
        );
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
            traitHitPointsPerLevel={traitHitPointsPerLevel}
            baseStats={{
              str: pers.str,
              dex: pers.dex,
              con: pers.con,
              int: pers.int,
              wis: pers.wis,
              cha: pers.cha,
            }}
            feats={feats as any}
            persFeats={(pers as any).feats}
            nextLevel={nextLevel}
            ruleset={pers.ruleset}
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
            pers={pers}
            allFeats={feats}
            traitHitPointsPerLevel={traitHitPointsPerLevel}
          />
        );
      default:
        return null;
    }
  };

  const safeCurrentStep =
    steps.length > 0 ? Math.min(currentStep, steps.length - 1) : 0;
  const currentStepId = steps[safeCurrentStep]?.id;

  useEffect(() => {
    if (currentStep !== safeCurrentStep) {
      setCurrentStep(safeCurrentStep);
    }
  }, [currentStep, safeCurrentStep]);

  useLayoutEffect(() => {
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
        if ("error" in res) {
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

  const CurrentComponent = currentStepId
    ? renderStepContent(currentStepId)
    : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-3 py-4 pb-[calc(8.5rem+env(safe-area-inset-bottom))] sm:gap-4 sm:px-4 md:gap-6 md:px-0 md:py-6 md:pb-6">
        <div className="glass-panel border-gradient-rpg w-full rounded-2xl px-3 py-4 sm:px-4 sm:py-4 md:px-6 md:py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
            <div className="space-y-1">
              <h1 className="font-rpg-display text-xl font-semibold uppercase tracking-widest text-slate-200 sm:text-2xl md:text-3xl">
                Підвищення рівня
              </h1>
              <div className="text-sm text-slate-400">
                До {nextLevel}-го рівня
              </div>
            </div>
          </div>
        </div>

        <Card className="border-0 bg-transparent shadow-none md:border md:border-white/10 md:bg-slate-950/30 md:shadow-2xl">
          <CardContent className="grid gap-2 p-0 sm:gap-3 md:grid-cols-[1fr,300px] md:gap-6 md:p-6">
            <div className="space-y-2 p-0 sm:space-y-3 md:glass-panel md:border-gradient-rpg md:space-y-4 md:rounded-xl md:p-5">
              {CurrentComponent}
            </div>

            <aside className="hidden md:block md:glass-panel md:border-gradient-rpg md:rounded-xl md:p-4">
              <div className="sticky top-14 sm:top-16">
                <div className="flex items-center justify-between text-xs text-slate-400 sm:text-sm">
                  <span className="font-medium text-slate-200">
                    Ваш прогрес
                  </span>
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
                        <span className="truncate pr-2 text-xs sm:text-sm">
                          {s.title}
                        </span>
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

        <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] inset-x-0 z-[60] w-full px-2 pb-3 sm:px-3 md:sticky md:bottom-0 md:px-0">
          <div className="border-gradient-rpg mx-auto flex w-full max-w-6xl items-center justify-between rounded-xl border-t border-white/10 bg-slate-900/95 px-2.5 py-2.5 backdrop-blur-xl shadow-xl shadow-black/30 sm:rounded-2xl sm:px-3 sm:py-3">
            <div className="flex items-center gap-2 text-xs text-slate-300 sm:gap-3 sm:text-sm">
              <Badge
                variant="secondary"
                className="bg-white/5 text-white text-[11px] sm:text-xs"
              >
                Крок {safeCurrentStep + 1} / {steps.length}
              </Badge>
              <span className="hidden sm:inline">
                {steps[safeCurrentStep]?.title}
              </span>
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

              <Button
                onClick={handleNext}
                disabled={nextDisabled || isSubmitting}
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    {isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
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
  );
}
function SummaryStep({
  totalLevel,
  className,
  classLevelAfter,
  newClassFeatures,
  newSubclassFeatures,
  newSpeciesTraits,
  selectedClass,
  effectiveSubclass,
}: {
  totalLevel: number;
  className: string;
  classLevelAfter: number;
  newClassFeatures: any[];
  newSubclassFeatures: any[];
  newSpeciesTraits: any[];
  selectedClass: ClassI | null;
  effectiveSubclass: SubclassI | null;
}) {
  const [selectedFeature, setSelectedFeature] = useState<{
    name: string;
    description: string;
  } | null>(null);

  const renderFeature = (f: any, source: string) => {
    const featureData: FeatureItemData = {
      ...f.feature,
      displayType: Array.isArray(f.feature?.displayType)
        ? f.feature.displayType
        : [f.feature?.displayType],
      source: source,
      sourceName: className,
    };
    const isResource = featureData.displayType.includes(
      FeatureDisplayType.CLASS_RESOURCE
    );

    if (isResource) {
      return (
        <ResourceCard
          key={f.featureId}
          feature={featureData}
          onInfo={() =>
            setSelectedFeature({
              name: f.feature?.name,
              description: f.feature?.description,
            })
          }
          isReadOnly={true}
        />
      );
    }

    return (
      <FeatureCard
        key={f.featureId}
        feature={featureData}
        onClick={() =>
          setSelectedFeature({
            name: f.feature?.name,
            description: f.feature?.description,
          })
        }
        isReadOnly={true}
      />
    );
  };

  return (
    <Card className="glass-card overflow-hidden shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-500">
      <CardHeader className="px-4 pb-1 pt-4 sm:px-6 sm:pb-2 sm:pt-6">
        <CardTitle className="font-rpg-display text-lg font-light uppercase tracking-wide text-slate-100 sm:text-xl">
          Вітаємо з {totalLevel}-м рівнем!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4 pt-1 sm:space-y-6 sm:px-6 sm:pb-6 sm:pt-2">
        <div className="space-y-2.5 sm:space-y-3">
          <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-indigo-400 px-1">
            Ви підвищуєте:
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
            {selectedClass && (
              <ClassInfoModal
                cls={selectedClass}
                asyncFetchSubclasses={false}
                trigger={
                  <button className="w-full text-left group">
                    <div className="glass-panel border-gradient-rpg relative overflow-hidden rounded-xl border-white/10 bg-white/5 p-3 transition-all duration-300 group-hover:scale-[1.01] group-hover:bg-white/10 active:scale-[0.99] sm:p-4">
                      <div className="absolute right-0 top-0 p-2.5 opacity-20 transition-opacity group-hover:opacity-40 sm:p-3">
                        <ChevronRight className="h-5 w-5 text-indigo-300" />
                      </div>
                      <p className="mb-1 text-[10px] uppercase tracking-widest text-slate-400">
                        Клас
                      </p>
                      <p className="text-base font-bold text-white transition-colors group-hover:text-indigo-200 sm:text-lg">
                        {className}{" "}
                        <span className="ml-1 font-light text-slate-400">
                          (рівень {classLevelAfter})
                        </span>
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
                    <div className="glass-panel border-gradient-rpg relative overflow-hidden rounded-xl border-white/10 bg-white/5 p-3 transition-all duration-300 group-hover:scale-[1.01] group-hover:bg-white/10 active:scale-[0.99] sm:p-4">
                      <div className="absolute right-0 top-0 p-2.5 opacity-20 transition-opacity group-hover:opacity-40 sm:p-3">
                        <ChevronRight className="h-5 w-5 text-violet-300" />
                      </div>
                      <p className="mb-1 text-[10px] uppercase tracking-widest text-slate-400">
                        Підклас
                      </p>
                      <p className="text-base font-bold text-white transition-colors group-hover:text-violet-200 sm:text-lg">
                        {subclassTranslations[
                          effectiveSubclass.name as keyof typeof subclassTranslations
                        ] || effectiveSubclass.name}
                      </p>
                    </div>
                  </button>
                }
              />
            )}
          </div>
        </div>

        {[
          { title: "Нові класові вміння:", tone: "text-cyan-400", source: "class", items: newClassFeatures },
          { title: "Нові вміння підкласу:", tone: "text-violet-400", source: "subclass", items: newSubclassFeatures },
          { title: "Нові риси виду:", tone: "text-sky-400", source: "race", items: newSpeciesTraits },
        ].map((group) =>
          group.items.length === 0 ? null : (
            <div key={group.source} className="space-y-3 sm:space-y-4">
              <h3 className={`text-[10px] font-bold uppercase tracking-[0.2em] ${group.tone} px-1`}>{group.title}</h3>
              <div className="grid grid-cols-1 gap-2.5 sm:gap-3">{group.items.map((f: any) => renderFeature(f, group.source))}</div>
            </div>
          ),
        )}
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
  pers,
  allFeats,
  traitHitPointsPerLevel,
}: {
  totalLevel: number;
  className: string;
  classLevelAfter: number;
  formData: any;
  pers: any;
  allFeats: any[];
  traitHitPointsPerLevel: number;
}) {
  const asiChosen =
    Array.isArray(formData.customAsi) && formData.customAsi.length > 0;
  const featChosen = Boolean(formData.featId);

  // 1) CON calculation
  const oldConMod = Math.floor((pers.con - 10) / 2);
  const selectedFeat = formData.featId
    ? allFeats.find((f) => f.featId === Number(formData.featId))
    : null;
  const nextCon = findAbilityScoresAfterLevelUp({
    scores: { STR: pers.str, DEX: pers.dex, CON: pers.con, INT: pers.int, WIS: pers.wis, CHA: pers.cha },
    ruleset: pers.ruleset,
    classIncreases: formData.customAsi,
    feat: selectedFeat,
  }).CON;
  const newConMod = Math.floor((nextCon - 10) / 2);
  const conModDiff = newConMod - oldConMod;
  const retroactiveConHp = conModDiff * pers.level;

  // 2) Tough logic
  const alreadyHasTough = (pers?.feats || []).some(
    (pf: any) => pf.feat?.name === "TOUGH"
  );
  const takingTough = selectedFeat?.name === "TOUGH";
  const hitDiePart = Number(formData.levelUpHpIncrease) || 0;


  let toughBonus = 0;
  let toughText = null as string | null;
  if (takingTough) {
    toughBonus = 2 * totalLevel;
    toughText = `Риса Здоровань [Tough] при отриманні дає рівень (${totalLevel}) * 2 хп = +${toughBonus} хп.`;
  } else if (alreadyHasTough) {
    toughBonus = 2;
    toughText = `Риса Здоровань [Tough] дає +2 хп за новий рівень.`;
  }

  const totalHpIncrease =
    hitDiePart + newConMod + toughBonus + retroactiveConHp + traitHitPointsPerLevel;

  const optionalChosen =
    formData.classOptionalFeatureSelections &&
    Object.values(
      formData.classOptionalFeatureSelections as Record<string, boolean>
    ).some((v) => v === true);

  return (
    <Card className="glass-card backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-xl font-light tracking-wide text-slate-100">
          Перевірка змін
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="glass-panel border-gradient-rpg rounded-xl p-4 bg-white/5 border-white/10">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">
            Новий загальний рівень:
          </p>
          <p className="text-lg font-semibold text-white">{totalLevel}</p>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-2 mb-1">
            Підвищується:
          </p>
          <p className="text-lg font-semibold text-white">
            {className} (рівень {classLevelAfter})
          </p>

          {toughText && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-xs text-emerald-400 font-medium">
                {toughText}
              </p>
            </div>
          )}

          {retroactiveConHp > 0 && (
            <div className="mt-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs text-blue-400 font-medium">
                Ретроактивне HP (збільшення СТАТУРИ): +{retroactiveConHp} за
                минулі рівні ({pers.level} рівнів * {conModDiff}).
              </p>
            </div>
          )}
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
              <span className="text-sm text-slate-200">
                Опції підкласу обрано
              </span>
            </div>
          ) : null}

          {asiChosen ? (
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400" />
              <span className="text-sm text-slate-200">
                Покращення характеристик
              </span>
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
              <span className="text-sm text-slate-200">
                Опціональні фічі / заміни обрано
              </span>
            </div>
          ) : null}

          {typeof formData.levelUpHpIncrease === "number" ? (
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400" />
              <div className="flex flex-col">
                <span className="text-sm text-slate-200 font-bold">
                  Приріст HP: +{totalHpIncrease}
                </span>
                <span className="text-[10px] text-slate-400">
                  (Кістка {hitDiePart} + СТАТ{" "}
                  {newConMod >= 0 ? `+${newConMod}` : newConMod}
                  {toughBonus > 0 ? ` + Здоровань +${toughBonus}` : ""}
                  {retroactiveConHp > 0
                    ? ` + Ретроактивне +${retroactiveConHp}`
                    : ""}
                  )
                </span>
              </div>
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

  const levelUpPath = formData.levelUpPath as
    | "EXISTING"
    | "MULTICLASS"
    | undefined;
  const chosenClassId = useMemo(() => {
    const raw = formData.classId;
    const id =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
        ? Number(raw)
        : NaN;
    return Number.isFinite(id) ? id : undefined;
  }, [formData.classId]);

  const existingEntries = useMemo(() => {
    const entries: Array<{
      classId: number;
      classLevel: number;
      isMain: boolean;
    }> = [];
    entries.push({
      classId: pers.classId,
      classLevel: mainClassLevel,
      isMain: true,
    });
    (pers.multiclasses || []).forEach((m: any) => {
      entries.push({
        classId: m.classId,
        classLevel: m.classLevel,
        isMain: false,
      });
    });
    return entries;
  }, [pers.classId, pers.multiclasses, mainClassLevel]);

  const selectedMulticlassClass = useMemo(() => {
    if (levelUpPath !== "MULTICLASS" || !chosenClassId) return null;
    return classes.find((c) => c.classId === chosenClassId) ?? null;
  }, [levelUpPath, chosenClassId, classes]);

  // Попередження, не заборона (KR31.9, рішення власника 2026-09-06) — див. коментар біля
  // eligibleMulticlassClasses вище.
  const multiclassEntryProblem = useMemo(() => {
    if (!selectedMulticlassClass) return null;
    const existingClassIds = new Set(existingEntries.map((entry) => entry.classId));
    const currentClasses = classes.filter((c) => existingClassIds.has(c.classId));
    return findMulticlassEntryProblem({
      ruleset: (pers.ruleset as MulticlassRuleset) ?? "RULES_2014",
      abilityScores: calculateFinalAbilityScores(pers),
      currentClasses,
      newClass: selectedMulticlassClass,
    });
  }, [selectedMulticlassClass, existingEntries, classes, pers]);

  const getClassName = (classId: number) => {
    const cls = classes.find((c) => c.classId === classId);
    if (!cls) return `Клас #${classId}`;
    return (
      classTranslations[cls.name] || classTranslationsEng[cls.name] || cls.name
    );
  };

  useEffect(() => {
    const disabled = !levelUpPath || !chosenClassId;
    onNextDisabledChange?.(disabled);
  }, [levelUpPath, chosenClassId, onNextDisabledChange]);

  useEffect(() => {
    const topExistingClassId = [...existingEntries]
      .sort((a, b) => {
        if (a.classLevel !== b.classLevel) return b.classLevel - a.classLevel;
        if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
        return a.classId - b.classId;
      })[0]?.classId;

    if (!Number.isFinite(topExistingClassId)) return;

    if (!levelUpPath) {
      updateFormData({
        levelUpPath: "EXISTING",
        classId: Number(topExistingClassId),
      });
      return;
    }

    if (levelUpPath === "EXISTING") {
      const hasChosenExisting = existingEntries.some((entry) => entry.classId === chosenClassId);
      if (!hasChosenExisting) {
        updateFormData({ classId: Number(topExistingClassId) });
      }
    }
  }, [existingEntries, levelUpPath, chosenClassId, updateFormData]);

  const resetLevelUpChoices = () => {
    updateFormData({
      subclassId: undefined,
      classChoiceSelections: {},
      subclassChoiceSelections: {},
      classOptionalFeatureSelections: {},
      customAsi: [],
      featId: undefined,
      featChoiceSelections: {},
      levelUpSkillSelections: {},
      levelUpHpIncrease: undefined,
    });
  };

  const getTopExistingClassId = () => {
    return [...existingEntries]
      .sort((a, b) => {
        if (a.classLevel !== b.classLevel) return b.classLevel - a.classLevel;
        if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
        return a.classId - b.classId;
      })[0]?.classId;
  };

  const selectPath = (path: "EXISTING" | "MULTICLASS") => {
    if (levelUpPath === path) return;
    if (path === "EXISTING") {
      const topExistingClassId = getTopExistingClassId();
      updateFormData({
        levelUpPath: path,
        classId: Number.isFinite(topExistingClassId) ? Number(topExistingClassId) : undefined,
      });
    } else {
      updateFormData({ levelUpPath: path, classId: undefined });
    }
    resetLevelUpChoices();
  };

  const selectExistingClass = (classId: number) => {
    updateFormData({ classId });
    resetLevelUpChoices();
  };

  const baseStats = {
    STR: calculateFinalStat(pers as any, Ability.STR),
    DEX: calculateFinalStat(pers as any, Ability.DEX),
    CON: calculateFinalStat(pers as any, Ability.CON),
    INT: calculateFinalStat(pers as any, Ability.INT),
    WIS: calculateFinalStat(pers as any, Ability.WIS),
    CHA: calculateFinalStat(pers as any, Ability.CHA),
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
                (levelUpPath === "EXISTING"
                  ? "border-gradient-rpg border-gradient-rpg-active glass-active text-slate-100"
                  : "")
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
                (levelUpPath === "MULTICLASS"
                  ? "border-gradient-rpg border-gradient-rpg-active glass-active text-slate-100"
                  : "")
              }
              onClick={() => selectPath("MULTICLASS")}
            >
              Взяти новий клас (мультиклас)
            </Button>
          </div>

          {levelUpPath === "EXISTING" ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">
                Оберіть клас, який отримує +1 рівень.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {existingEntries.map((entry) => {
                  const isSelected = chosenClassId === entry.classId;
                  const cls = classes.find((c) => c.classId === entry.classId);
                  return (
                    <div
                      key={entry.classId}
                      className="group relative cursor-pointer"
                      onClick={() => selectExistingClass(entry.classId)}
                    >
                      <PlainTitleCard
                        title={getClassName(entry.classId)}
                        isSelected={isSelected}
                        selectedTitleClassName="text-arcane-300"
                        hoverTitleClassName="group-hover:text-arcane-200"
                        highlightColor={isSelected ? ARCANE[800] : null}
                        glowColor={isSelected ? "rgba(65,37,116,0.6)" : null}
                        meta={
                          <>
                            <span>Рівень класу: {entry.classLevel}</span>
                            {entry.isMain ? (
                              <span className="font-bold uppercase tracking-widest text-arcane-300/80">
                                Основний клас
                              </span>
                            ) : null}
                          </>
                        }
                      />

                      {cls && (
                        <InfoDialog
                          title={getClassName(entry.classId)}
                          triggerLabel="Деталі класу"
                        >
                          <InfoGrid>
                            <InfoPill
                              label="Кістка хітів"
                              value={`d${cls.hitDie}`}
                            />
                            <InfoPill
                              label="Чаклунство"
                              value={
                                SPELLCASTING_LABELS[cls.spellcastingType] ?? "—"
                              }
                            />
                            <InfoPill
                              label="Підклас з рівня"
                              value={`Рівень ${cls.subclassLevel}`}
                            />
                            <InfoPill
                              label="Рятунки"
                              value={formatAbilityList(cls.savingThrows)}
                            />
                            <InfoPill
                              label="Навички"
                              value={formatSkillProficiencies(
                                cls.skillProficiencies
                              )}
                            />
                            <InfoPill
                              label="Інструменти"
                              value={formatToolProficiencies(
                                cls.toolProficiencies,
                                cls.toolToChooseCount
                              )}
                            />
                            <InfoPill
                              label="Зброя"
                              value={formatWeaponProficiencies(
                                cls.weaponProficiencies,
                                cls.weaponProficienciesSpecial
                              )}
                            />
                            <InfoPill
                              label="Броня"
                              value={formatArmorProficiencies(
                                cls.armorProficiencies
                              )}
                            />
                            <InfoPill
                              label="Мови"
                              value={formatLanguages(
                                cls.languages,
                                cls.languagesToChooseCount
                              )}
                            />
                            <InfoPill
                              label="Мультиклас"
                              value={formatMulticlassReqs(cls.multiclassReqs)}
                            />
                            {cls.primaryCastingStat ? (
                              <InfoPill
                                label="Ключова характеристика"
                                value={
                                  attributesUkrShort[cls.primaryCastingStat]
                                }
                              />
                            ) : null}
                          </InfoGrid>

                          <div className="space-y-4 pt-4">
                            <InfoSectionTitle>
                              Особливості класу
                            </InfoSectionTitle>
                            {cls.features && cls.features.length > 0 ? (
                              <div className="space-y-2">
                                {[...cls.features]
                                  .sort(
                                    (a, b) =>
                                      (a.levelGranted || 0) -
                                      (b.levelGranted || 0)
                                  )
                                  .map((f: any) => (
                                    <div
                                      key={f.classFeatureId}
                                      className="glass-panel border-gradient-rpg rounded-xl p-4 bg-white/5 border-white/10 shadow-inner"
                                    >
                                      <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-white">
                                          {f.feature?.name}
                                        </span>
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] border-white/10 text-slate-400"
                                        >
                                          Рівень {f.levelGranted}
                                        </Badge>
                                      </div>
                                      <FormattedDescription
                                        content={f.feature?.description}
                                        className="text-sm text-slate-300 leading-relaxed"
                                      />
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <p className="text-sm text-slate-400 italic">
                                Наразі немає описаних вмінь.
                              </p>
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
                Вимога мультикласу — зазвичай{" "}
                <span className="font-semibold text-slate-200">13+</span> у
                ключовій характеристиці. Це підказка, не заборона: обрати
                можна будь-який клас.
              </p>

              <div className="glass-panel border-gradient-rpg rounded-xl p-3 text-sm text-slate-300">
                <p className="font-semibold text-slate-100">
                  Ваші характеристики
                </p>
                <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  {Object.entries(baseStats).map(([k, v]) => (
                    <span key={k}>
                      {attributesUkrShort[k as Ability]}:{" "}
                      <span className="text-slate-100">{v}</span>
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
                  Немає інших класів для мультикласу — усі вже взято.
                </Card>
              )}

              {multiclassEntryProblem ? (
                <div className="glass-panel rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                  ⚠ Не за правилами: {describeMulticlassEntryProblem(multiclassEntryProblem, translateValue)}{" "}
                  Мультиклас усе одно дозволено — це попередження, не заборона.
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
