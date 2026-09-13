"use client";

import { ClassI } from "@/lib/types/model-types";
import {
  ControlledInfoDialog,
  InfoDialog,
  InfoGrid,
  InfoPill,
  InfoSectionTitle,
} from "@/lib/components/characterCreator/EntityInfoDialog";
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
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { classTranslations, attributesUkrShort } from "@/lib/refs/translation";
import { SPELL_SLOT_PROGRESSION, sneakAttackDice } from "@/lib/refs/static";
import { INFUSIONS_KNOWN_BY_ARTIFICER_LEVEL } from "@/rules/artificer-infusions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layers3 } from "lucide-react";
import { SubclassInfoModal } from "@/lib/components/characterCreator/modals/SubclassInfoModal";
import { getSubclassesByClassId } from "@/lib/actions/class-actions";

import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";

const CANTRIPS_BY_CLASS: Record<string, number[]> = {
  BARD_2014: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  CLERIC_2014: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  DRUID_2014: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  SORCERER_2014: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
  WARLOCK_2014: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  ARTIFICER_2014: [2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4],
};

type CustomClassTableColumn = {
  key: string;
  label: string;
  values: Record<number, string | number>;
  mode?: "STEP" | "EXACT";
};

const CLASS_TABLE_CUSTOM_COLUMNS: Partial<
  Record<string, CustomClassTableColumn[]>
> = {
  BARBARIAN_2014: [
    {
      key: "rage_damage",
      label: "Шкода люті",
      values: {
        1: "+2",
        9: "+3",
        16: "+4",
      },
      mode: "STEP",
    },
  ],
  BARD_2014: [
    {
      key: "bardic_inspiration_die",
      label: "Кістка натхнення",
      values: {
        1: "к6",
        5: "к8",
        10: "к10",
        15: "к12",
      },
      mode: "STEP",
    },
  ],
  WARLOCK_2014: [
    {
      key: "invocations_known",
      label: "Знані інвокації",
      values: {
        2: 2,
        5: 3,
        7: 4,
        9: 5,
        12: 6,
        15: 7,
        18: 8,
      },
      mode: "STEP",
    },
  ],
  ARTIFICER_2014: [
    {
      key: "infusions_known",
      label: "Знані вливання",
      values: INFUSIONS_KNOWN_BY_ARTIFICER_LEVEL,
      mode: "STEP",
    },
    {
      key: "infused_items",
      label: "Вливання в предмети",
      values: {
        2: 2,
        6: 3,
        10: 4,
        14: 5,
        18: 6,
      },
      mode: "STEP",
    },
  ],
  ROGUE_2014: [
    {
      key: "sneak_attack",
      label: "Підступна атака",
      values: {
        1: "1к6",
        3: "2к6",
        5: "3к6",
        7: "4к6",
        9: "5к6",
        11: "6к6",
        13: "7к6",
        15: "8к6",
        17: "9к6",
        19: "10к6",
      },
      mode: "STEP",
    },
  ],
};

const LEVELS = Array.from({ length: 20 }, (_, index) => index + 1);
const ARTIFICER_RESOURCE_FEATURES_TO_HIDE = new Set([
  "Infuse Item",
  "Spell-Storing Item",
]);

const getProficiencyBonus = (level: number) => 2 + Math.floor((level - 1) / 4);

const getCustomColumnValueAtLevel = (
  column: CustomClassTableColumn,
  level: number,
): string | null => {
  if (column.mode === "EXACT") {
    const exact = column.values[level];
    return exact === undefined || exact === null ? null : String(exact);
  }

  const valuesByLevel = Object.entries(column.values)
    .map(([lvl, value]) => ({ lvl: Number(lvl), value }))
    .filter((item) => Number.isFinite(item.lvl) && item.lvl > 0)
    .sort((a, b) => a.lvl - b.lvl);

  if (!valuesByLevel.length) return null;

  const bestMatch = valuesByLevel.filter((item) => level >= item.lvl).at(-1);
  return bestMatch ? String(bestMatch.value) : null;
};

const normalizeSlots = (value: unknown): number[] | null => {
  if (!Array.isArray(value)) return null;
  const normalized = value.slice(0, 9).map((entry) => {
    const numeric = Number(entry);
    return Number.isFinite(numeric) ? Math.max(0, Math.trunc(numeric)) : 0;
  });

  if (!normalized.some((slot) => slot > 0)) return null;
  while (normalized.length < 9) normalized.push(0);
  return normalized;
};

const ARTIFICER_LEVEL_ONE_SLOTS = [2, 0, 0, 0, 0, 0, 0, 0, 0] as const;

const getSpellSlotsByLevel = (cls: ClassI, level: number): number[] | null => {
  const special = cls.specialSpellSlotProgression as any;
  if (special && typeof special === "object" && !Array.isArray(special)) {
    const fromSpecial = normalizeSlots(
      special[level] ?? special[String(level)],
    );
    if (fromSpecial) return fromSpecial;
  }

  if (cls.spellcastingType === "FULL") {
    return normalizeSlots((SPELL_SLOT_PROGRESSION as any).FULL?.[level]);
  }
  if (cls.spellcastingType === "HALF") {
    if (String(cls.name) === "ARTIFICER_2014" && level === 1) {
      return [...ARTIFICER_LEVEL_ONE_SLOTS];
    }
    return normalizeSlots((SPELL_SLOT_PROGRESSION as any).HALF?.[level]);
  }
  if (cls.spellcastingType === "THIRD") {
    return normalizeSlots((SPELL_SLOT_PROGRESSION as any).THIRD?.[level]);
  }
  if (cls.spellcastingType === "PACT") {
    const pact = (SPELL_SLOT_PROGRESSION as any).PACT?.[level];
    if (!pact) return null;
    const pactSlots = Number(pact.slots);
    const slotLevel = Number(pact.level);
    if (!Number.isFinite(pactSlots) || !Number.isFinite(slotLevel)) return null;
    const result = Array.from({ length: 9 }, () => 0);
    if (slotLevel >= 1 && slotLevel <= 9) result[slotLevel - 1] = pactSlots;
    return result;
  }

  return null;
};

interface Props {
  cls: ClassI;
  triggerClassName?: string;
  trigger?: ReactNode;
  asyncFetchSubclasses?: boolean;
}

export const ClassInfoModal = ({
  cls,
  triggerClassName,
  trigger,
  asyncFetchSubclasses = false,
}: Props) => {
  const [classTableOpen, setClassTableOpen] = useState(false);
  const [subclassesOpen, setSubclassesOpen] = useState(false);
  const [isLoadingSubclasses, setIsLoadingSubclasses] = useState(false);

  const preloadedSubclasses = useMemo(() => {
    const raw = Array.isArray((cls as any)?.subclasses)
      ? (cls as any).subclasses
      : [];
    return raw;
  }, [cls]);

  const [loadedSubclasses, setLoadedSubclasses] = useState<any[] | null>(
    asyncFetchSubclasses ? null : preloadedSubclasses,
  );

  useEffect(() => {
    setLoadedSubclasses(asyncFetchSubclasses ? null : preloadedSubclasses);
    setIsLoadingSubclasses(false);
  }, [asyncFetchSubclasses, cls.classId, preloadedSubclasses]);

  const ensureSubclassesLoaded = useCallback(async () => {
    if (!asyncFetchSubclasses) return;
    if (loadedSubclasses !== null || isLoadingSubclasses) return;

    setIsLoadingSubclasses(true);
    try {
      const subclasses = await getSubclassesByClassId(cls.classId);
      setLoadedSubclasses(Array.isArray(subclasses) ? subclasses : []);
    } catch (error) {
      console.error("Failed to fetch subclasses:", error);
      setLoadedSubclasses([]);
    } finally {
      setIsLoadingSubclasses(false);
    }
  }, [
    asyncFetchSubclasses,
    cls.classId,
    isLoadingSubclasses,
    loadedSubclasses,
  ]);

  const handleOpenClassTable = async () => {
    setClassTableOpen(true);
    await ensureSubclassesLoaded();
  };

  const handleOpenSubclasses = async () => {
    setSubclassesOpen(true);

    await ensureSubclassesLoaded();
  };

  const features = [...(cls.features || [])].sort((a, b) => {
    const lvlA = a.levelGranted ?? 0;
    const lvlB = b.levelGranted ?? 0;
    if (lvlA !== lvlB) return lvlA - lvlB;
    return (a.classFeatureId || 0) - (b.classFeatureId || 0);
  });

  const subclassesForTable = useMemo(() => {
    return loadedSubclasses ?? preloadedSubclasses;
  }, [loadedSubclasses, preloadedSubclasses]);

  const subclassFeatureLevels = useMemo(() => {
    const levels = new Set<number>();

    for (const subclass of subclassesForTable) {
      const subclassFeatures = Array.isArray((subclass as any)?.features)
        ? (subclass as any).features
        : [];

      for (const feature of subclassFeatures) {
        const level = Number(feature?.levelGranted ?? 0);
        if (level > 0) levels.add(level);
      }
    }

    return levels;
  }, [subclassesForTable]);

  const featuresByLevel = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const f of features) {
      const level = Number(f.levelGranted ?? 0);
      if (!level) continue;
      const name = String((f as any)?.feature?.name ?? "").trim();
      if (!name) continue;
      map.set(level, [...(map.get(level) ?? []), name]);
    }

    for (const level of subclassFeatureLevels) {
      const existing = map.get(level) ?? [];
      if (!existing.includes("Фіча підкласу")) {
        map.set(level, [...existing, "Фіча підкласу"]);
      }
    }

    return map;
  }, [features, subclassFeatureLevels]);

  const resourceFeatures = useMemo(() => {
    const isArtificer = String(cls.name) === "ARTIFICER_2014";

    return features
      .filter((f) => {
        const displayType = ((f as any)?.feature?.displayType ||
          []) as string[];
        if (
          !Array.isArray(displayType) ||
          !displayType.includes("CLASS_RESOURCE")
        ) {
          return false;
        }

        if (!isArtificer) return true;
        const engName = String((f as any)?.feature?.engName ?? "").trim();
        return !ARTIFICER_RESOURCE_FEATURES_TO_HIDE.has(engName);
      })
      .map((f) => ({
        levelGranted: Number(f.levelGranted ?? 0),
        feature: (f as any)?.feature,
      }))
      .filter((item) => item.levelGranted > 0 && item.feature);
  }, [features, cls.name]);

  const renderResourceValueAtLevel = useMemo(() => {
    return (
      resource: { levelGranted: number; feature: any },
      level: number,
    ): string | null => {
      if (level < resource.levelGranted) return null;

      const feature = resource.feature;
      const usesCount =
        typeof feature?.usesCount === "number" ? feature.usesCount : null;
      const dependsOnPB = Boolean(feature?.usesCountDependsOnProficiencyBonus);
      const special = feature?.usesCountSpecial as any;

      if (Array.isArray(special)) {
        const best = [...special]
          .filter(
            (entry) =>
              typeof entry?.lvl === "number" && level >= Number(entry.lvl),
          )
          .sort((a, b) => Number(b.lvl) - Number(a.lvl))[0];
        if (best && typeof best.uses === "number") return String(best.uses);
      }

      if (special && typeof special === "object") {
        if (special.equalsToClassLevel === true) {
          return String(level);
        }

        if (special.type === "STATIC_FROM_STAT") {
          const stat = String(special.stat || "").toUpperCase();
          const statLabel =
            attributesUkrShort[stat as keyof typeof attributesUkrShort] ||
            stat ||
            "характеристики";
          return `мод. ${statLabel}`;
        }

        if (special.type === "FORMULA") {
          const operation = String(special.operation || "ADD").toUpperCase();
          const minimum =
            typeof special.minimum === "number"
              ? Number(special.minimum)
              : null;

          if (special.group === "LEVEL_BASED") {
            const multiplier = Number(special.multiplier ?? 1);
            const base = Number(special.base ?? 0);
            const computed =
              operation === "MULTIPLY" ? level * multiplier : base + level;
            const finalValue =
              minimum !== null ? Math.max(minimum, computed) : computed;
            return Number.isFinite(finalValue) ? String(finalValue) : null;
          }

          if (special.group === "PROFICIENCY_BONUS") {
            const pb = getProficiencyBonus(level);
            const multiplier = Number(special.multiplier ?? 1);
            const base = Number(special.base ?? 0);
            const computed =
              operation === "MULTIPLY" ? pb * multiplier : base + pb;
            const finalValue =
              minimum !== null ? Math.max(minimum, computed) : computed;
            return Number.isFinite(finalValue) ? String(finalValue) : null;
          }

          if (special.group === "STAT_BASED") {
            const base = Number(special.base ?? 0);
            const stat = String(special.stat || "").toUpperCase();
            const statLabel =
              attributesUkrShort[stat as keyof typeof attributesUkrShort] ||
              stat ||
              "характеристики";
            if (operation === "MULTIPLY") return `${base}×мод. ${statLabel}`;
            return `${base} + мод. ${statLabel}`;
          }
        }
      }

      if (dependsOnPB) return String(getProficiencyBonus(level));
      if (usesCount !== null) return String(usesCount);
      return null;
    };
  }, []);

  const resourceColumnNames = useMemo(() => {
    const ordered = resourceFeatures
      .map((resource) => String(resource.feature?.name ?? "").trim())
      .filter(Boolean);
    return Array.from(new Set(ordered));
  }, [resourceFeatures]);

  const resourceValuesByLevel = useMemo(() => {
    const map = new Map<number, Record<string, string>>();

    for (const level of LEVELS) {
      const values: Record<string, string> = {};

      for (const resource of resourceFeatures) {
        const name = String(resource.feature?.name ?? "").trim();
        if (!name) continue;

        const value = renderResourceValueAtLevel(resource, level);
        if (!value) continue;

        values[name] = value;
      }

      map.set(level, values);
    }

    return map;
  }, [resourceFeatures, renderResourceValueAtLevel]);

  const customTableColumns = useMemo(() => {
    const className = String(cls.name);
    const classColumns = CLASS_TABLE_CUSTOM_COLUMNS[className] ?? [];

    if (className === "ROGUE_2014") {
      return classColumns.map((column) => {
        if (column.key !== "sneak_attack") return column;
        return {
          ...column,
          values: Object.keys(sneakAttackDice).length
            ? (sneakAttackDice as Record<number, string>)
            : column.values,
        };
      });
    }

    return classColumns;
  }, [cls.name]);

  const cantripsTable = CANTRIPS_BY_CLASS[String(cls.name)] || null;
  const hasClassResources = resourceFeatures.length > 0;
  const hasCustomColumns = customTableColumns.length > 0;
  const hasCantripsColumn = Boolean(cantripsTable);
  const hasSpellSlotsColumn = cls.spellcastingType !== "NONE";

  const classTableMinWidth = useMemo(() => {
    const levelCol = 64;
    const proficiencyCol = 112;
    const featuresCol = 240;
    const compactCol = 96;
    const spellSlotCol = 36;

    let minWidth = levelCol + proficiencyCol + featuresCol;
    minWidth += customTableColumns.length * compactCol;
    minWidth += resourceColumnNames.length * compactCol;

    if (hasCantripsColumn) minWidth += compactCol;
    if (hasSpellSlotsColumn) minWidth += spellSlotCol * 9;

    return minWidth;
  }, [
    customTableColumns.length,
    resourceColumnNames.length,
    hasCantripsColumn,
    hasSpellSlotsColumn,
  ]);

  const sortedSubclasses = useMemo(() => {
    const raw = loadedSubclasses ?? [];
    return [...raw].sort((a: any, b: any) => {
      const aName =
        classTranslations[a?.name as keyof typeof classTranslations] ||
        translateValue(a?.name || "") ||
        String(a?.name || "");
      const bName =
        classTranslations[b?.name as keyof typeof classTranslations] ||
        translateValue(b?.name || "") ||
        String(b?.name || "");
      return aName.localeCompare(bName, "uk");
    });
  }, [loadedSubclasses]);

  const showSubclassCount = !asyncFetchSubclasses || loadedSubclasses !== null;

  const title =
    classTranslations[cls.name as keyof typeof classTranslations] || cls.name;

  return (
    <>
      <InfoDialog
        title={title}
        triggerLabel={`Показати деталі ${title}`}
        triggerClassName={triggerClassName}
        trigger={trigger}
      >
        <InfoGrid>
          <InfoPill label="Кістка хітів" value={`d${cls.hitDie}`} />
          <InfoPill
            label="Чаклунство"
            value={translateValue(cls.spellcastingType)}
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
            value={formatSkillProficiencies(cls.skillProficiencies)}
          />
          <InfoPill
            label="Інструменти"
            value={formatToolProficiencies(
              cls.toolProficiencies,
              cls.toolToChooseCount,
            )}
          />
          <InfoPill
            label="Зброя"
            value={formatWeaponProficiencies(
              cls.weaponProficiencies,
              cls.weaponProficienciesSpecial,
            )}
          />
          <InfoPill
            label="Броня"
            value={formatArmorProficiencies(cls.armorProficiencies)}
          />
          <InfoPill
            label="Мови"
            value={formatLanguages(cls.languages, cls.languagesToChooseCount)}
          />
          <InfoPill
            label="Мультиклас"
            value={formatMulticlassReqs(cls.multiclassReqs)}
          />
          {cls.primaryCastingStat && (
            <InfoPill
              label="Ключова характеристика"
              value={
                attributesUkrShort[
                  cls.primaryCastingStat as keyof typeof attributesUkrShort
                ]
              }
            />
          )}
        </InfoGrid>

        <div className="space-y-2">
          <Button
            type="button"
            variant="secondary"
            className="glass-panel border-gradient-rpg w-full justify-between text-slate-100 hover:text-white"
            onClick={handleOpenClassTable}
          >
            <span>Таблиця класу</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            className="glass-panel border-gradient-rpg w-full justify-between text-slate-100 hover:text-white"
            onClick={handleOpenSubclasses}
          >
            <span className="inline-flex items-center gap-2">
              <Layers3 className="h-4 w-4" />
              Підкласи
            </span>
            {showSubclassCount ? (
              <span className="text-xs text-slate-300">
                {sortedSubclasses.length}
              </span>
            ) : null}
          </Button>
        </div>

        <div className="space-y-4">
          {Array.from(new Set(features.map((f) => f.levelGranted)))
            .sort((a, b) => (a || 0) - (b || 0))
            .map((lvl) => (
              <div key={lvl} className="space-y-2">
                <InfoSectionTitle>Вміння {lvl}-го рівня</InfoSectionTitle>
                <div className="space-y-2">
                  {features
                    .filter((f) => f.levelGranted === lvl)
                    .map((f: any) => (
                      <div
                        key={f.classFeatureId}
                        className="glass-panel border-gradient-rpg rounded-lg px-3 py-2.5"
                      >
                        <p className="font-bold text-slate-200">
                          {f.feature.name}
                        </p>
                        <FormattedDescription
                          content={f.feature.description}
                          className="text-sm text-slate-400"
                        />
                      </div>
                    ))}
                </div>
              </div>
            ))}
        </div>
      </InfoDialog>

      <ControlledInfoDialog
        open={classTableOpen}
        onOpenChange={setClassTableOpen}
        title={`Таблиця класу: ${title}`}
        contentClassName="w-[95vw] max-w-[95vw] sm:max-w-[860px]"
      >
        <div className="w-full max-w-full">
          <div className="max-h-[72vh] w-full overflow-auto rounded-xl border border-white/10 bg-white/5">
            <table
              className="w-full table-auto text-left text-xs sm:text-sm"
              style={{ minWidth: `${classTableMinWidth}px` }}
            >
              <thead className="bg-white/10 text-slate-100">
                <tr>
                  <th className="w-14 px-2 py-2 font-semibold sm:w-16">
                    Рівень
                  </th>
                  <th className="w-24 px-2 py-2 font-semibold sm:w-28">
                    Бонус майстерності
                  </th>
                  <th className="min-w-[220px] px-2 py-2 font-semibold">
                    Фічі
                  </th>
                  {hasCustomColumns
                    ? customTableColumns.map((column) => (
                        <th
                          key={column.key}
                          className="w-20 px-2 py-2 text-center font-semibold sm:w-24"
                        >
                          <span className="block whitespace-normal break-words leading-tight">
                            {column.label}
                          </span>
                        </th>
                      ))
                    : null}
                  {hasClassResources
                    ? resourceColumnNames.map((resourceName) => (
                        <th
                          key={resourceName}
                          className="w-20 px-2 py-2 text-center font-semibold sm:w-24"
                        >
                          <span className="block whitespace-normal break-words leading-tight">
                            {resourceName}
                          </span>
                        </th>
                      ))
                    : null}
                  {hasCantripsColumn ? (
                    <th className="w-20 px-1 py-2 text-center font-semibold sm:w-24">
                      К-сть знаних замовлянь
                    </th>
                  ) : null}
                  {hasSpellSlotsColumn ? (
                    <>
                      <th className="w-8 px-1 py-2 text-center font-semibold sm:w-9">
                        1
                      </th>
                      <th className="w-8 px-1 py-2 text-center font-semibold sm:w-9">
                        2
                      </th>
                      <th className="w-8 px-1 py-2 text-center font-semibold sm:w-9">
                        3
                      </th>
                      <th className="w-8 px-1 py-2 text-center font-semibold sm:w-9">
                        4
                      </th>
                      <th className="w-8 px-1 py-2 text-center font-semibold sm:w-9">
                        5
                      </th>
                      <th className="w-8 px-1 py-2 text-center font-semibold sm:w-9">
                        6
                      </th>
                      <th className="w-8 px-1 py-2 text-center font-semibold sm:w-9">
                        7
                      </th>
                      <th className="w-8 px-1 py-2 text-center font-semibold sm:w-9">
                        8
                      </th>
                      <th className="w-8 px-1 py-2 text-center font-semibold sm:w-9">
                        9
                      </th>
                    </>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {LEVELS.map((level) => {
                  const levelFeatures = featuresByLevel.get(level) || [];
                  const resourceValues = resourceValuesByLevel.get(level) || {};
                  const cantrips = cantripsTable
                    ? cantripsTable[level - 1]
                    : null;
                  const slots = hasSpellSlotsColumn
                    ? getSpellSlotsByLevel(cls, level)
                    : null;

                  return (
                    <tr
                      key={level}
                      className="border-t border-white/10 align-top text-slate-200"
                    >
                      <td className="px-2 py-2">{level}</td>
                      <td className="px-2 py-2">
                        +{getProficiencyBonus(level)}
                      </td>
                      <td className="px-2 py-2 whitespace-normal break-normal leading-snug">
                        {levelFeatures.length > 0
                          ? levelFeatures.join(", ")
                          : "—"}
                      </td>
                      {hasCustomColumns
                        ? customTableColumns.map((column) => {
                            const value = getCustomColumnValueAtLevel(
                              column,
                              level,
                            );
                            return (
                              <td
                                key={`${level}-${column.key}`}
                                className="px-1 py-2 text-center"
                              >
                                {value ?? "—"}
                              </td>
                            );
                          })
                        : null}
                      {hasClassResources
                        ? resourceColumnNames.map((resourceName) => (
                            <td
                              key={`${level}-${resourceName}`}
                              className="px-1 py-2 text-center"
                            >
                              {resourceValues[resourceName] ?? "—"}
                            </td>
                          ))
                        : null}
                      {hasCantripsColumn ? (
                        <td className="px-1 py-2 text-center">
                          {typeof cantrips === "number" ? cantrips : "—"}
                        </td>
                      ) : null}
                      {hasSpellSlotsColumn
                        ? Array.from({ length: 9 }, (_, index) => {
                            const slotValue = slots?.[index] ?? 0;
                            return (
                              <td
                                key={`${level}-${index}`}
                                className="px-1 py-2 text-center"
                              >
                                {slotValue > 0 ? slotValue : "-"}
                              </td>
                            );
                          })
                        : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </ControlledInfoDialog>

      <ControlledInfoDialog
        open={subclassesOpen}
        onOpenChange={setSubclassesOpen}
        title={`Підкласи: ${title}`}
        contentClassName="w-[95vw] max-w-[95vw] sm:max-w-2xl overflow-x-hidden"
      >
        <div className="space-y-3">
          {isLoadingSubclasses && !sortedSubclasses.length ? (
            <p className="text-sm text-slate-400">Завантаження підкласів…</p>
          ) : sortedSubclasses.length ? (
            <div className="grid grid-cols-1 gap-3">
              {sortedSubclasses.map((subclass: any) => {
                const localizedName =
                  translateValue(subclass?.name) ||
                  String(subclass?.name || "");
                return (
                  <SubclassInfoModal
                    key={subclass.subclassId}
                    subclass={subclass}
                    trigger={
                      <button
                        type="button"
                        className="glass-panel border-gradient-rpg w-full max-w-full overflow-hidden rounded-xl p-3 text-left transition-colors hover:bg-white/10"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-white">
                              {localizedName}
                            </p>
                            {subclass?.description ? (
                              <p className="mt-1 line-clamp-2 text-sm text-slate-300">
                                {String(subclass.description)}
                              </p>
                            ) : null}
                          </div>
                          <Badge
                            variant="outline"
                            className="border-white/15 bg-white/5 text-[10px] text-slate-300"
                          >
                            Фічі:{" "}
                            {Array.isArray(subclass?.features)
                              ? subclass.features.length
                              : 0}
                          </Badge>
                        </div>
                      </button>
                    }
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              Для цього класу підкласи ще не додані.
            </p>
          )}
        </div>
      </ControlledInfoDialog>
    </>
  );
};
