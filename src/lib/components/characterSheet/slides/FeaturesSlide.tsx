"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { CharacterFeatureItem, CharacterFeaturesGroupedResult, PersWithRelations } from "@/lib/actions/pers";
import { FeatureDisplayType } from "@prisma/client";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { spendFeatureUse, restoreFeatureUse } from "@/lib/actions/feature-uses";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { FeatureCard } from "@/lib/components/characterSheet/shared/FeatureCards";
import { MagicItemInfoModal } from "@/lib/components/levelUp/MagicItemInfoModal";
import { FeatsSheetManagerModal } from "@/lib/components/characterSheet/FeatsSheetManagerModal";
import { FeaturesHeaderCards } from "@/lib/components/characterSheet/slides/FeaturesHeaderCards";
import { ClassInfoModal } from "@/lib/components/characterCreator/modals/ClassInfoModal";
import { SubclassInfoModal } from "@/lib/components/characterCreator/modals/SubclassInfoModal";
import { toast } from "sonner";

import {
  ControlledInfoDialog,
  InfoGrid,
  InfoPill,
  InfoSectionTitle,
} from "@/lib/components/characterCreator/EntityInfoDialog";
import {
  formatASI,
  formatArmorProficiencies,
  formatLanguages,
  formatList,
  formatRaceAC,
  formatSkillProficiencies,
  formatSpeeds,
  formatToolProficiencies,
  formatWeaponProficiencies,
  translateValue,
} from "@/lib/components/characterCreator/infoUtils";
import {
  backgroundTranslations,
  featTranslations,
  raceTranslations,
  sourceTranslations,
  subraceTranslations,
  variantTranslations,
} from "@/lib/refs/translation";

function translateFeatName(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return raw;
  const normalized = raw
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  return featTranslations[raw] ?? featTranslations[raw.toUpperCase()] ?? featTranslations[normalized] ?? raw;
}

interface FeaturesSlideProps {
  pers: PersWithRelations;
  groupedFeatures: CharacterFeaturesGroupedResult | null;
  onPersUpdate?: (next: PersWithRelations) => void;
  isReadOnly?: boolean;
}

type CategoryKind = "passive" | "action" | "bonus" | "reaction" | "resource";
type Category = { title: string; items: CharacterFeatureItem[]; kind: CategoryKind };

type EntityDialogKind = "race" | "raceVariant" | "subrace" | "background";

// safeText removed - no longer used

function categoryVariant(kind: CategoryKind) {
  switch (kind) {
    case "resource":
      return {
        container: "border-l-cyan-500/50 from-cyan-950/20",
        chevron: "text-cyan-300",
        title: "text-cyan-50",
        count: "text-cyan-200/70",
        cardBorder: "border-cyan-600/30 hover:border-cyan-500/60",
        cardBg: "bg-cyan-900/25 hover:bg-cyan-900/45",
      };
    case "action":
      return {
        container: "border-l-red-500/50 from-red-950/20",
        chevron: "text-red-300",
        title: "text-red-50",
        count: "text-red-200/70",
        cardBorder: "border-red-600/30 hover:border-red-500/60",
        cardBg: "bg-red-900/25 hover:bg-red-900/45",
      };
    case "bonus":
      return {
        container: "border-l-blue-500/50 from-blue-950/20",
        chevron: "text-blue-300",
        title: "text-blue-50",
        count: "text-blue-200/70",
        cardBorder: "border-blue-600/30 hover:border-blue-500/60",
        cardBg: "bg-blue-900/25 hover:bg-blue-900/45",
      };
    case "reaction":
      return {
        container: "border-l-purple-500/50 from-purple-950/20",
        chevron: "text-purple-300",
        title: "text-purple-50",
        count: "text-purple-200/70",
        cardBorder: "border-purple-600/30 hover:border-purple-500/60",
        cardBg: "bg-purple-900/25 hover:bg-purple-900/45",
      };
    case "passive":
    default:
      return {
        container: "border-l-amber-600/50 from-amber-950/20",
        chevron: "text-amber-300",
        title: "text-amber-50",
        count: "text-amber-200/70",
        cardBorder: "border-amber-700/30 hover:border-amber-600/60",
        cardBg: "bg-amber-900/20 hover:bg-amber-900/40",
      };
  }
}

// getKindFromPrimaryType removed - no longer used

// Redundant local FeatureCard removed - using shared/FeatureCards.tsx

const FeaturesSlide = memo(function FeaturesSlide({ pers, groupedFeatures, isReadOnly }: FeaturesSlideProps) {
  const router = useRouter();

  const [selected, setSelected] = useState<CharacterFeatureItem | null>(null);
  const [entityOpen, setEntityOpen] = useState(false);
  const [entityKind, setEntityKind] = useState<EntityDialogKind>("race");
  const [entityVariantIndex, setEntityVariantIndex] = useState(0);
  const [magicItemToShow, setMagicItemToShow] = useState<any>(null);
  const [featsManagerOpen, setFeatsManagerOpen] = useState(false);

  const [usesOverrideByKey, setUsesOverrideByKey] = useState<Record<string, number | null>>({});
  const [usesOverrideByPoolKey, setUsesOverrideByPoolKey] = useState<Record<string, number | null>>({});
  const mutationVersionRef = useRef<Record<string, number>>({});

  useEffect(() => {
    setUsesOverrideByKey({});
    setUsesOverrideByPoolKey({});
  }, [groupedFeatures, pers.persId]);

  const classEntries = useMemo(() => {
    const multiclasses = ((pers as any).multiclasses || []) as any[];
    const multiclassLevels = multiclasses.reduce((acc, m) => acc + (Number(m.classLevel) || 0), 0);
    const mainLevel = Math.max(1, (Number(pers.level) || 1) - multiclassLevels);

    const entries: Array<{
      key: string;
      kind: "main" | "multiclass";
      classLevel: number;
      cls: any;
    }> = [];

    entries.push({
      key: `main:${pers.classId}`,
      kind: "main",
      classLevel: mainLevel,
      cls: pers.class,
    });

    multiclasses.forEach((m) => {
      if (!m?.class) return;
      entries.push({
        key: `multi:${m.classId}`,
        kind: "multiclass",
        classLevel: Number(m.classLevel) || 1,
        cls: m.class,
      });
    });

    return entries;
  }, [pers]);

  const subclassEntries = useMemo(() => {
    const multiclasses = ((pers as any).multiclasses || []) as any[];
    const multiclassLevels = multiclasses.reduce((acc, m) => acc + (Number(m.classLevel) || 0), 0);
    const mainLevel = Math.max(1, (Number(pers.level) || 1) - multiclassLevels);

    const entries: Array<{
      key: string;
      kind: "main" | "multiclass";
      classLevel: number;
      cls: any;
      subclass: any;
    }> = [];

    if (pers.subclass) {
      entries.push({
        key: `main:${pers.classId}:${pers.subclassId ?? "none"}`,
        kind: "main",
        classLevel: mainLevel,
        cls: pers.class,
        subclass: pers.subclass,
      });
    }

    multiclasses.forEach((m) => {
      if (!m?.class || !m?.subclass) return;
      entries.push({
        key: `multi:${m.classId}:${m.subclassId ?? "none"}`,
        kind: "multiclass",
        classLevel: Number(m.classLevel) || 1,
        cls: m.class,
        subclass: m.subclass,
      });
    });

    return entries;
  }, [pers]);

  const allItems = useMemo(() => {
    if (!groupedFeatures) return [] as CharacterFeatureItem[];
    return [
      ...(groupedFeatures.actions ?? []),
      ...(groupedFeatures.bonusActions ?? []),
      ...(groupedFeatures.reactions ?? []),
      ...(groupedFeatures.passive ?? []),
    ];
  }, [groupedFeatures]);

  const resourceItems = useMemo(() => {
    return allItems
      .filter((it) => Array.isArray(it.displayTypes) && (it.displayTypes.includes(FeatureDisplayType.CLASS_RESOURCE)))
      .filter((it) => typeof it.usesPer === "number" || (it.usesRemaining !== null && it.usesRemaining !== undefined));
  }, [allItems]);

  const categories = useMemo<Category[]>(() => {
    if (!groupedFeatures) return [];
    
    // Filter out items that are already in resourceItems to prevent duplication
    // Also filter out CHOICE sources as they are redundant with the features they grant
    const resourceKeys = new Set(resourceItems.map(r => r.key));
    const filterItems = (items: CharacterFeatureItem[]) => 
      items
        .filter(it => !resourceKeys.has(it.key));

    const sortItems = (items: CharacterFeatureItem[]) => {
      const sourcePriority: Record<string, number> = {
        CLASS: 1,
        SUBCLASS: 2,
        RACE: 3,
        SUBRACE: 4,
        BACKGROUND: 5,
        FEAT: 6,
        PERS: 7, // Custom
        INFUSION: 7.5,
        CHOICE: 8,
        RACE_CHOICE: 9
      };

      return [...items].sort((a, b) => {
        // 1. Sort by Source
        const pA = sourcePriority[a.source] ?? 99;
        const pB = sourcePriority[b.source] ?? 99;
        if (pA !== pB) return pA - pB;

        // 2. Sort by Date/Index (using createdAt if available, or implicitly preserve order)
        // If createdAt is present (number), sort ASC (smaller ID first).
        if (typeof a.createdAt === 'number' && typeof b.createdAt === 'number') {
           return a.createdAt - b.createdAt;
        }
        
        return 0;
      });
    };

    const list: Category[] = [];

    if (resourceItems.length > 0) {
      list.push({ title: "Ресурси класу", items: sortItems(resourceItems), kind: "resource" });
    }

    list.push(
      { title: "Основна дія", items: sortItems(filterItems(groupedFeatures.actions)), kind: "action" },
      { title: "Бонусна дія", items: sortItems(filterItems(groupedFeatures.bonusActions)), kind: "bonus" },
      { title: "Реакція", items: sortItems(filterItems(groupedFeatures.reactions)), kind: "reaction" },
      { title: "Пасивні здібності", items: sortItems(filterItems(groupedFeatures.passive)), kind: "passive" },
    );

    return list;
  }, [groupedFeatures, resourceItems]);

// limitedUseGroups removed

  const getUsesRemaining = (item: CharacterFeatureItem) => {
    if (item.usesPoolKey) {
      const pooled = usesOverrideByPoolKey[item.usesPoolKey];
      if (typeof pooled === "number") return pooled;
    }
    const overridden = usesOverrideByKey[item.key];
    if (typeof overridden === "number") return overridden;
    // If no override, use actual value from item. 
    // If item value is null (not in DB yet), default to max uses (usesPer).
    return item.usesRemaining ?? item.usesPer ?? 0;
  };

  const getMutationKey = (item: CharacterFeatureItem) => item.usesPoolKey ? `pool:${item.usesPoolKey}` : `feature:${item.key}`;

  const bumpMutationVersion = (item: CharacterFeatureItem) => {
    const mutationKey = getMutationKey(item);
    const nextVersion = (mutationVersionRef.current[mutationKey] ?? 0) + 1;
    mutationVersionRef.current[mutationKey] = nextVersion;
    return { mutationKey, version: nextVersion };
  };

  const isLatestMutation = (mutationKey: string, version: number) => mutationVersionRef.current[mutationKey] === version;

  const applyOptimisticRemaining = (
    item: CharacterFeatureItem,
    updater: (current: number, max: number) => number
  ) => {
    const max = Math.max(0, Number(item.usesPer ?? 0));

    if (item.usesPoolKey) {
      setUsesOverrideByPoolKey((prev) => {
        const current = typeof prev[item.usesPoolKey as string] === "number"
          ? (prev[item.usesPoolKey as string] as number)
          : (item.usesRemaining ?? item.usesPer ?? 0);

        return {
          ...prev,
          [item.usesPoolKey as string]: Math.max(0, Math.min(max, updater(current, max))),
        };
      });
      return;
    }

    setUsesOverrideByKey((prev) => {
      const current = typeof prev[item.key] === "number"
        ? (prev[item.key] as number)
        : (item.usesRemaining ?? item.usesPer ?? 0);

      return {
        ...prev,
        [item.key]: Math.max(0, Math.min(max, updater(current, max))),
      };
    });
  };

  const applyServerRemaining = (item: CharacterFeatureItem, usesRemaining: number | null) => {
    if (item.usesPoolKey) {
      setUsesOverrideByPoolKey((prev) => ({ ...prev, [item.usesPoolKey as string]: usesRemaining }));
      return;
    }

    setUsesOverrideByKey((prev) => ({ ...prev, [item.key]: usesRemaining }));
  };

  const spendOneUse = (item: CharacterFeatureItem) => {
    if (isReadOnly || !item.featureId) return;
    const cur = getUsesRemaining(item);
    const cost = Math.max(1, Number(item.usePrice ?? 1));
    if (typeof cur !== "number" || cur < cost) return;

    applyOptimisticRemaining(item, (current) => current - cost);
    const { mutationKey, version } = bumpMutationVersion(item);

    void (async () => {
      const res = await spendFeatureUse({ persId: pers.persId, featureId: item.featureId! });
      if (!res.success) {
        if (isLatestMutation(mutationKey, version)) {
          toast.error(res.error);
          router.refresh();
        }
        return;
      }

      if (isLatestMutation(mutationKey, version)) {
        applyServerRemaining(item, res.usesRemaining);
        router.refresh();
      }
    })();
  };

  const restoreOneUse = (item: CharacterFeatureItem) => {
    if (isReadOnly || !item.featureId) return;
    const cur = getUsesRemaining(item);
    const cost = Math.max(1, Number(item.usePrice ?? 1));
    const max = item.usesPer ?? 0;
    if (typeof cur !== "number" || cur >= max) return;

    applyOptimisticRemaining(item, (current, currentMax) => Math.min(currentMax, current + cost));
    const { mutationKey, version } = bumpMutationVersion(item);

    void (async () => {
      const res = await restoreFeatureUse({ persId: pers.persId, featureId: item.featureId! });
      if (!res.success) {
        if (isLatestMutation(mutationKey, version)) {
          toast.error(res.error);
          router.refresh();
        }
        return;
      }

      if (isLatestMutation(mutationKey, version)) {
        applyServerRemaining(item, res.usesRemaining);
        router.refresh();
      }
    })();
  };

  const raceName = useMemo(
    () => raceTranslations[pers.race.name as keyof typeof raceTranslations] || pers.race.name,
    [pers.race.name]
  );
  const subraceName = useMemo(() => {
    if (!pers.subrace) return null;
    return subraceTranslations[pers.subrace.name as keyof typeof subraceTranslations] || pers.subrace.name;
  }, [pers.subrace]);
  const backgroundName = useMemo(
    () => backgroundTranslations[pers.background.name as keyof typeof backgroundTranslations] || pers.background.name,
    [pers.background.name]
  );

  const openEntity = (kind: EntityDialogKind, variantIndex?: number) => {
    setEntityKind(kind);
    if (typeof variantIndex === "number") setEntityVariantIndex(variantIndex);
    setEntityOpen(true);
  };

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

  const entityDialog = useMemo(() => {
    if (entityKind === "race") {
      const race = pers.race as any;
      const rawTraits = (race.traits || []) as any[];
      const traitList = [...rawTraits].sort((a, b) => {
        const lvlA = a.levelUnlock ?? a.levelGranted ?? 0;
        const lvlB = b.levelUnlock ?? b.levelGranted ?? 0;
        if (lvlA !== lvlB) return lvlA - lvlB;
        return (a.raceTraitId || 0) - (b.raceTraitId || 0);
      });

      return {
        title: raceName,
        subtitle: undefined,
        content: (
          <>
            <InfoGrid>
              <InfoPill label="Джерело" value={sourceTranslations[race.source] ?? race.source} />
              <InfoPill label="Розмір" value={formatList(race.size)} />
              <InfoPill label="Швидкості" value={formatSpeeds(race)} />
              <InfoPill label="Базовий КБ" value={formatRaceAC(race.ac)} />
              <InfoPill label="Бонуси характеристик" value={formatASI(race.ASI)} />
              <InfoPill label="Мови" value={formatLanguages(race.languages, race.languagesToChooseCount)} />
              <InfoPill label="Навички" value={formatSkillProficiencies(race.skillProficiencies)} />
              <InfoPill label="Інструменти" value={formatToolProficiencies(race.toolProficiencies, race.toolToChooseCount)} />
              <InfoPill label="Зброя" value={formatWeaponProficiencies(race.weaponProficiencies)} />
              <InfoPill label="Броня" value={formatArmorProficiencies(race.armorProficiencies)} />
            </InfoGrid>

            <div className="space-y-2">
              <InfoSectionTitle>Риси</InfoSectionTitle>
              {traitList.length ? (
                traitList.map((trait, idx) => (
                  <div
                    key={trait.raceTraitId ?? `feature:${trait.feature?.featureId ?? "unknown"}:${idx}`}
                    className="rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2.5 shadow-inner"
                  >
                    <p className="text-sm font-semibold text-white">{trait.feature?.name}</p>
                    {trait.feature?.description ? (
                      <div className="mt-1">
                        <FormattedDescription content={trait.feature.description} className="text-slate-200/90" />
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">Для цієї раси ще немає опису рис.</p>
              )}
            </div>
          </>
        ),
      };
    }

    if (entityKind === "raceVariant") {
      const variants = (pers as any).raceVariants as any[] | undefined;
      const variant = variants?.[entityVariantIndex];
      if (!variant) {
        return {
          title: "Варіант раси",
          subtitle: undefined,
          content: <div className="text-sm text-slate-400">Немає даних про варіант.</div>,
        };
      }

      const name = variantTranslations[variant.name as keyof typeof variantTranslations] ?? String(variant.name);
      const rawTraits = (variant.traits || []) as any[];
      const traitList = [...rawTraits].sort((a, b) => {
        const lvlA = a.levelUnlock ?? a.levelGranted ?? 0;
        const lvlB = b.levelUnlock ?? b.levelGranted ?? 0;
        if (lvlA !== lvlB) return lvlA - lvlB;
        return (a.raceVariantTraitId || 0) - (b.raceVariantTraitId || 0);
      });

      return {
        title: name,
        subtitle: undefined,
        content: (
          <>
            <InfoGrid>
              <InfoPill label="Джерело" value={sourceTranslations[variant.source] ?? variant.source} />
              <InfoPill
                label="Швидкості"
                value={
                  formatSpeeds({
                    speed: variant.overridesRaceSpeed,
                    flightSpeed: variant.overridesFlightSpeed,
                  })
                }
              />
              <InfoPill label="Бонуси характеристик" value={formatASI(variant.overridesRaceASI)} />
              <div className="col-span-full">
                {variant.description ? <FormattedDescription content={variant.description} className="text-slate-200/90" /> : null}
              </div>
            </InfoGrid>

            <div className="space-y-2">
              <InfoSectionTitle>Риси</InfoSectionTitle>
              {traitList.length ? (
                traitList.map((trait, idx) => (
                  <div
                    key={trait.raceVariantTraitId ?? `feature:${trait.feature?.featureId ?? "unknown"}:${idx}`}
                    className="rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2.5 shadow-inner"
                  >
                    <p className="text-sm font-semibold text-white">{trait.feature?.name}</p>
                    {trait.feature?.description ? (
                      <div className="mt-1">
                        <FormattedDescription content={trait.feature.description} className="text-slate-200/90" />
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">Для цього варіанту ще немає опису рис.</p>
              )}
            </div>
          </>
        ),
      };
    }

    if (entityKind === "subrace") {
      if (!pers.subrace) {
        return {
          title: "Підраса",
          subtitle: undefined,
          content: <div className="text-sm text-slate-400">Підраса не обрана.</div>,
        };
      }

      const subrace = pers.subrace as any;
      const rawTraits = (subrace.traits || []) as any[];
      const traitList = [...rawTraits].sort((a, b) => {
        const lvlA = a.levelUnlock ?? a.levelGranted ?? 0;
        const lvlB = b.levelUnlock ?? b.levelGranted ?? 0;
        if (lvlA !== lvlB) return lvlA - lvlB;
        return (a.subraceTraitId || 0) - (b.subraceTraitId || 0);
      });

      return {
        title: subraceName || subrace.name,
        subtitle: undefined,
        content: (
          <>
            <InfoGrid>
              <InfoPill label="Джерело" value={sourceTranslations[subrace.source] ?? subrace.source} />
              <InfoPill label="Швидкості" value={formatSpeeds(subrace)} />
              <InfoPill label="Бонуси характеристик" value={formatASI(subrace.additionalASI)} />
              <InfoPill label="Мови" value={formatLanguages(subrace.additionalLanguages, subrace.languagesToChooseCount)} />
              <InfoPill label="Інструменти" value={formatToolProficiencies(subrace.toolProficiencies)} />
            </InfoGrid>

            <div className="space-y-2">
              <InfoSectionTitle>Риси</InfoSectionTitle>
              {traitList.length ? (
                traitList.map((trait, idx) => (
                  <div
                    key={trait.subraceTraitId ?? `feature:${trait.feature?.featureId ?? "unknown"}:${idx}`}
                    className="rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2.5 shadow-inner"
                  >
                    <p className="text-sm font-semibold text-white">{trait.feature?.name}</p>
                    {trait.feature?.description ? (
                      <div className="mt-1">
                        <FormattedDescription content={trait.feature.description} className="text-slate-200/90" />
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">Для цієї підраси ще немає опису рис.</p>
              )}
            </div>
          </>
        ),
      };
    }

    const background = pers.background as any;
    const items = parseItems(background.items);
    const resolvedSource = background.source ? translateValue(background.source) : "—";

    return {
      title: backgroundName,
      subtitle: undefined,
      content: (
        <>
          <InfoGrid>
            <InfoPill label="Джерело" value={resolvedSource} />
            <InfoPill label="Навички" value={formatSkillProficiencies(background.skillProficiencies)} />
            <InfoPill label="Інструменти" value={formatToolProficiencies(background.toolProficiencies)} />
            <InfoPill label="Мови" value={formatLanguages([], background.languagesToChooseCount)} />
            <InfoPill label="Особливість" value={background.specialAbilityName || "-"} />
          </InfoGrid>

          {items.length ? (
            <div className="space-y-1.5">
              <InfoSectionTitle>Стартове спорядження</InfoSectionTitle>
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

          {(background.specialAbilityName || background.description) ? (
            <div className="space-y-1">
              <InfoSectionTitle>Опис особливості</InfoSectionTitle>
              {background.specialAbilityName ? (
                <p className="text-sm font-semibold text-white">{background.specialAbilityName}</p>
              ) : null}
              {background.description ? (
                <FormattedDescription content={background.description} className="text-slate-200/90" />
              ) : null}
            </div>
          ) : null}
        </>
      ),
    };
  }, [backgroundName, entityKind, entityVariantIndex, pers, raceName, subraceName]);

  return (
    <div className="flex min-h-0 flex-col">
      <div
        className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3 touch-pan-y"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <h2 className="text-xl sm:text-2xl font-bold text-slate-50">Здібності</h2>

        <FeaturesHeaderCards
          raceName={raceName}
          subraceName={subraceName}
          backgroundName={backgroundName}
          raceVariants={(pers as any).raceVariants || []}
          classEntries={classEntries}
          subclassEntries={subclassEntries}
          featsCount={pers.feats?.length || 0}
          openEntity={openEntity}
          onOpenFeatsManager={() => setFeatsManagerOpen(true)}
        />



      {!groupedFeatures ? (
        <div className="text-sm text-slate-400">Завантаження фіч…</div>
      ) : (
        <div className="space-y-2">
          {categories.map((category) => {
            const variant = categoryVariant(category.kind);
            const total = category.items.length;

            return (
              <Collapsible
                key={category.title}
                defaultOpen={total > 0}
                className={
                  "group border-l-2 bg-gradient-to-r to-transparent rounded-r-lg p-3 sm:p-4 transition-all duration-300 " +
                  variant.container
                }
              >
                <CollapsibleTrigger className="flex items-center gap-3 w-full">
                  <ChevronRight className={"w-5 h-5 transition-transform group-data-[state=open]:rotate-90 " + variant.chevron} />
                  <span className={"font-bold uppercase tracking-wider text-xs sm:text-sm " + variant.title}>{category.title}</span>
                  <span className={"ml-auto text-[10px] sm:text-xs " + variant.count}>[{total}]</span>
                </CollapsibleTrigger>

                <CollapsibleContent className="mt-3 sm:mt-4 pl-1">
                  {total === 0 ? (
                    <div className="text-xs text-slate-400">Немає в цій категорії</div>
                  ) : (
                    <div className="space-y-2">
                      {category.items.map((item) => {
                        const remaining = getUsesRemaining(item);
                        const featureRef = {
                            ...item,
                            displayType: item.displayTypes,
                            usesRemaining: remaining,
                          usesCount: item.usesPer,
                          usePrice: item.usePrice ?? 1
                        };

                        return (
                          <FeatureCard 
                              key={item.key} 
                              feature={featureRef} 
                              onClick={() => {
                                  if (item.magicItem) setMagicItemToShow(item.magicItem);
                                  else setSelected(item);
                              }}
                              isReadOnly={isReadOnly}
                              onSpend={() => spendOneUse(item)}
                              onRestore={() => restoreOneUse(item)}
                          />
                        );
                      })}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {selected?.source === "FEAT" ? translateFeatName(selected?.name) : selected?.name}
            </DialogTitle>
          </DialogHeader>
          {selected?.description ? (
            <div className="glass-panel rounded-xl border border-slate-800/70 p-4">
              <FormattedDescription content={selected.description} className="text-slate-200/90" />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <ControlledInfoDialog
        open={entityOpen}
        onOpenChange={(open) => setEntityOpen(open)}
        title={entityDialog.title}
        subtitle={entityDialog.subtitle}
      >
        {entityDialog.content}
      </ControlledInfoDialog>

        <MagicItemInfoModal 
          item={magicItemToShow || {}} 
          open={!!magicItemToShow} 
          onOpenChange={(open) => !open && setMagicItemToShow(null)} 
        />

        <FeatsSheetManagerModal
          persId={pers.persId}
          ruleset={pers.ruleset}
          persFeats={(pers as any).feats ?? []}
          open={featsManagerOpen}
          onOpenChange={setFeatsManagerOpen}
          isReadOnly={isReadOnly}
        />
      </div>
    </div>
  );
});

export default FeaturesSlide;
