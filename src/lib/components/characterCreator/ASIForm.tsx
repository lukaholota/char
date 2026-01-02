"use client";

import { useStepForm } from "@/hooks/useStepForm";
import { Ability, Classes } from "@prisma/client";
import { asiSchema } from "@/lib/zod/schemas/persCreateSchema";
import { useFieldArray, useWatch } from "react-hook-form";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { classAbilityScores } from "@/lib/refs/classesBaseASI";
import { ClassI, RaceI, RaceASI } from "@/lib/types/model-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, ArrowUp, ArrowDown, Check, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RaceVariant } from "@prisma/client";
import { normalizeRaceASI } from "@/lib/components/characterCreator/infoUtils";
import { toast } from "sonner";


interface Props {
  race: RaceI
  raceVariant?: RaceVariant | null
  selectedClass: ClassI
  prevRaceId: number | null
  setPrevRaceId: (id: number) => void;
  formId: string
  onNextDisabledChange?: (disabled: boolean) => void
}

const attributes = [
  { eng: Ability.STR, ukr: 'Сила' },
  { eng: Ability.DEX, ukr: 'Спритність' },
  { eng: Ability.CON, ukr: 'Статура' },
  { eng: Ability.INT, ukr: 'Інтелект' },
  { eng: Ability.WIS, ukr: 'Мудрість' },
  { eng: Ability.CHA, ukr: 'Харизма' }
];

const attributesUrkShort = [
  { eng: Ability.STR, ukr: 'СИЛ' }, // Strength — Сила
  { eng: Ability.DEX, ukr: 'СПР' }, // Dexterity — Спритність
  { eng: Ability.CON, ukr: 'СТА' }, // Constitution — Статура
  { eng: Ability.INT, ukr: 'ІНТ' }, // Intelligence — Інтелект
  { eng: Ability.WIS, ukr: 'МУД' }, // Wisdom — Мудрість
  { eng: Ability.CHA, ukr: 'ХАР' }, // Charisma — Харизма
];

const asiSystems = {
  POINT_BUY: 'POINT_BUY',
  SIMPLE: 'SIMPLE',
  CUSTOM: 'CUSTOM'
}


export const ASIForm = (
  { race, raceVariant, selectedClass, prevRaceId, setPrevRaceId, formId, onNextDisabledChange }: Props
) => {
  const { updateFormData, nextStep } = usePersFormStore();

  const racialBonusesCardRef = useRef<HTMLDivElement | null>(null);
  const [highlightRacialBonuses, setHighlightRacialBonuses] = useState(false);

  const subraceId = usePersFormStore((s) => s.formData.subraceId);
  const storeRaceVariantId = usePersFormStore((s) => s.formData.raceVariantId);

  const subrace = useMemo(() => {
    return (race.subraces || []).find((sr: any) => sr.subraceId === (subraceId ?? undefined));
  }, [race, subraceId]);
  
  const raceAsi = useMemo(() => {
    if (raceVariant?.overridesRaceASI) {
      return normalizeRaceASI(raceVariant.overridesRaceASI) as unknown as RaceASI;
    }
    return normalizeRaceASI(race.ASI) as RaceASI;
  }, [race, raceVariant]);

  const subraceFixedAsi = useMemo(() => {
    const map = (subrace as any)?.additionalASI as Record<string, unknown> | undefined;
    if (!map || typeof map !== "object") return {} as Record<string, number>;

    const abilityKeys = new Set(Object.values(Ability));
    const entries = Object.entries(map)
      .filter(([k]) => abilityKeys.has(k as Ability))
      .map(([k, raw]) => {
        const value =
          typeof raw === "number"
            ? raw
            : typeof raw === "string"
              ? Number(raw)
              : NaN;
        return [k, value] as const;
      })
      .filter(([, v]) => Number.isFinite(v) && Number(v) !== 0);

    return Object.fromEntries(entries) as Record<string, number>;
  }, [subrace]);

  const scrollToRacialBonuses = () => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    racialBonusesCardRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });

    setHighlightRacialBonuses(true);
    window.setTimeout(() => setHighlightRacialBonuses(false), 1800);
  };

  const { form, onSubmit } = useStepForm(asiSchema, (data) => {
    // Custom validation: if the race has flexible ASI groups, user must allocate all of them.
    const groups: Array<{
      groupIndex: number;
      choiceCount: number;
      selectedAbilities: Ability[];
    }> = form.getValues(racialBonusSchemaPath as any) || [];

    const hasRacialChoices = (racialBonusGroups?.length ?? 0) > 0;
    const missingSomeChoice = hasRacialChoices && (racialBonusGroups ?? []).some((group: any, groupIndex: number) => {
      const current = groups.find((g) => g.groupIndex === groupIndex);
      const selectedCount = (current?.selectedAbilities ?? []).length;
      return selectedCount < Number(group.choiceCount ?? 0);
    });

    if (missingSomeChoice) {
      form.setError("racialBonusChoiceSchema", {
        type: "manual",
        message: "Оберіть потрібну кількість расових бонусів.",
      });
      toast.error("Оберіть расові бонуси", {
        description: "Потрібно заповнити всі варіанти бонусів до статів.",
      });
      scrollToRacialBonuses();
      return;
    }

    // Save the entire ASI data object
    updateFormData({
      isDefaultASI: data.isDefaultASI,
      asiSystem: data.asiSystem,
      points: data.points,
      simpleAsi: data.simpleAsi,
      asi: data.asi,
      racialBonusChoiceSchema: data.racialBonusChoiceSchema,
    });
    nextStep();
  });

  const { fields: asiFields, replace: replaceAsi } = useFieldArray({
    control: form.control,
    name: "asi",
  });
  const { fields: simpleAsiFields, replace: replaceSimpleAsi } = useFieldArray({
    control: form.control,
    name: "simpleAsi",
  });
  const { fields: customAsiFields, replace: replaceCustomAsi } = useFieldArray({
    control: form.control,
    name: "customAsi",
  });
  const watchedSimpleAsi = useWatch({
    control: form.control,
    name: 'simpleAsi'
  })

  const isDefaultASI = form.watch('isDefaultASI') ?? true
  const asiSystem = form.watch('asiSystem') || asiSystems.POINT_BUY
  const points = form.watch('points') || 0

  useEffect(() => {
    onNextDisabledChange?.(asiSystem === asiSystems.POINT_BUY && points < 0);
  }, [asiSystem, points, onNextDisabledChange])

  const racialBonusSchemaPath = `racialBonusChoiceSchema.${ isDefaultASI ? 'basicChoices' : 'tashaChoices' }` as const;

  const watchedRacialBonusChoices = useWatch({
    control: form.control,
    name: racialBonusSchemaPath as any,
  })

  const sortedSimpleAsi = useMemo(() => {
    if (!watchedSimpleAsi || watchedSimpleAsi.length === 0) {
      return [...simpleAsiFields].sort((a, b) => b.value - a.value);
    }

    const enrichedFields = simpleAsiFields.map((field, index) => ({
      ...field,
      ability: field.ability,
      value: watchedSimpleAsi[index]?.value ?? field.value
    }));

    return enrichedFields.sort((a, b) => b.value - a.value);
  }, [watchedSimpleAsi, simpleAsiFields])

  const incrementValue = (index: number) => {
    const currentValue = form.getValues(`asi.${ index }.value`) || 0;
    form.setValue('points', currentValue >= 13 ? points - 2 : points - 1, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
    form.setValue(`asi.${ index }.value`, currentValue + 1, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
  }
  const decrementValue = (index: number) => {
    const currentValue = form.getValues(`asi.${ index }.value`) || 0;
    if (currentValue > 8) {
      form.setValue('points', currentValue >= 14 ? points + 2 : points + 1, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
      form.setValue(`asi.${ index }.value`, currentValue - 1, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
    }
  }

  const swapValues = ({ sortedIndexA, isDirectionUp }: { sortedIndexA: number, isDirectionUp: boolean }) => { // index == 0-5
    if (isDirectionUp ? sortedIndexA > 0 : sortedIndexA < 5) {
      const sortedIndexB = isDirectionUp ? sortedIndexA - 1 : sortedIndexA + 1

      const itemA = sortedSimpleAsi[sortedIndexA]
      const itemB = sortedSimpleAsi[sortedIndexB]

      const originalIndexA = simpleAsiFields.findIndex(field => field.id === itemA.id);
      const originalIndexB = simpleAsiFields.findIndex(field => field.id === itemB.id);

      if (originalIndexA === -1 || originalIndexB === -1) return;

      form.setValue(`simpleAsi.${ originalIndexA }.value`, itemB.value, {
        shouldTouch: true,
        shouldDirty: true,
        shouldValidate: true
      });

      form.setValue(`simpleAsi.${ originalIndexB }.value`, itemA.value, {
        shouldTouch: true,
        shouldDirty: true,
        shouldValidate: true
      });
    }
  }

  const handleToggleRacialBonus = ({ groupIndex, choiceCount, ability }: {
    groupIndex: number,
    choiceCount: number,
    ability: Ability
  }) => {
    const schemaPath = racialBonusSchemaPath;

    const groups: {
      groupIndex: number;
      choiceCount: number;
      selectedAbilities: Ability[];
    }[] = form.getValues(schemaPath) || []

    const arrayIndex = groups.findIndex((g) => g.groupIndex === groupIndex)

    if (arrayIndex !== -1) {
      const currentAbilities = groups[arrayIndex]?.selectedAbilities ?? []
      const hasAbility = currentAbilities.includes(ability)

      if (!hasAbility && currentAbilities.length >= choiceCount) return null

      const newAbilities = hasAbility
        ? currentAbilities.filter((a) => a !== ability)
        : [...currentAbilities, ability]

      const nextGroups = groups.map((g, idx) =>
        idx === arrayIndex
          ? {
              ...g,
              choiceCount,
              selectedAbilities: newAbilities,
            }
          : g
      )

      form.setValue(schemaPath, nextGroups, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
      return
    }

    const newGroup = {
      groupIndex,
      choiceCount,
      selectedAbilities: [ability],
    }
    form.setValue(schemaPath, [...groups, newGroup], {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
  }

  const getRacialBonusGroup = (groupIndex: number) => {
    const groups: {
      groupIndex: number;
      choiceCount: number;
      selectedAbilities: Ability[];
    }[] = form.getValues(racialBonusSchemaPath) || []
    return groups.find((g) => g.groupIndex === groupIndex)
  }

  const isRacialBonusSelected = (groupIndex: number, ability: Ability) => {
    const group = getRacialBonusGroup(groupIndex)
    return (group?.selectedAbilities ?? []).includes(ability)
  }

  const getCurrentSelectedCount = (groupIndex: number) => {
    const group = getRacialBonusGroup(groupIndex)
    return (group?.selectedAbilities ?? []).length
  }

  useEffect(() => {
    if (selectedClass) {
      const defaultClassASI = classAbilityScores[selectedClass.name as Classes]
      if (defaultClassASI) {
        const currentAsi = form.getValues('asi')
        const currentSimpleAsi = form.getValues('simpleAsi')
        const currentCustomAsi = form.getValues('customAsi')

        if (!currentAsi || currentAsi.length === 0) {
          replaceAsi(defaultClassASI.map(asi => ({
            ability: asi.ability,
            value: asi.value,
          })));
        }
        if (!currentSimpleAsi || currentSimpleAsi.length === 0) {
          replaceSimpleAsi(defaultClassASI.map(asi => ({
            ability: asi.ability,
            value: asi.value,
          })));
        }
        if (!currentCustomAsi || currentCustomAsi.length === 0) {
          replaceCustomAsi(defaultClassASI.map(asi => ({
            ability: asi.ability,
            value: String(asi.value),
          })));
        }
      }
    }
  }, [selectedClass, replaceAsi, replaceSimpleAsi, replaceCustomAsi, form])

  useEffect(() => {
    form.register('points')

    const p = form.getValues('points');
    if (typeof p !== 'number') {
      form.setValue('points', 0, { shouldDirty: false, shouldTouch: false })
    }
  }, [form])

  useEffect(() => {form.register('racialBonusChoiceSchema')},
    [form])

  useEffect(() => {
    if (prevRaceId !== null && prevRaceId !== race.raceId) {
      form.setValue(`racialBonusChoiceSchema.tashaChoices`, [])
      form.setValue(`racialBonusChoiceSchema.basicChoices`, [])
    }

    setPrevRaceId(race.raceId)
  }, [form, prevRaceId, race.raceId, setPrevRaceId])

  const prevRaceDetailsRef = useRef<{
    subraceId: number | undefined;
    raceVariantId: number | null | undefined;
  }>({
    subraceId,
    raceVariantId: storeRaceVariantId,
  });

  useEffect(() => {
    const prev = prevRaceDetailsRef.current;
    if (prev.subraceId !== subraceId || prev.raceVariantId !== storeRaceVariantId) {
      form.setValue(`racialBonusChoiceSchema.tashaChoices`, [])
      form.setValue(`racialBonusChoiceSchema.basicChoices`, [])
    }

    prevRaceDetailsRef.current = {
      subraceId,
      raceVariantId: storeRaceVariantId,
    };
  }, [form, storeRaceVariantId, subraceId]);

  const subraceAsiGroups = useMemo(() => {
    // Convert fixed additionalASI into "flexible" groups for Tasha-style picking.
    // Example: { STR: 2, CON: 1 } -> groups: (+2 choose 1 unique), (+1 choose 1 unique)
    const entries = Object.entries(subraceFixedAsi);
    if (!entries.length) {
      return [] as Array<{ groupName: string; value: number; choiceCount: number; unique: boolean }>;
    }

    // Under Tasha-style allocation we want these bonuses to be free-pick (any ability),
    // but preserve how many bonuses of a given value exist.
    const byValue = new Map<number, number>();
    for (const [_ability, value] of entries) {
      const num = Number(value);
      if (!Number.isFinite(num) || num === 0) continue;
      byValue.set(num, (byValue.get(num) ?? 0) + 1);
    }

    // Each distinct value becomes its own group. choiceCount = count of bonuses with that value.
    // In Tasha mode, user can assign them to any abilities (unique rules prevent duplicates between groups).
    const groups = Array.from(byValue.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([value, count]) => ({
        groupName: `+${value} до ${count}`,
        value,
        choiceCount: count,
        unique: true,
      }));

    return groups;
  }, [subraceFixedAsi]);

  const racialBonusGroups = useMemo(() => {
    const baseGroups = isDefaultASI
      ? (raceAsi.basic?.flexible?.groups ?? [])
      : (raceAsi.tasha?.flexible.groups ?? []);

    if (!isDefaultASI && subraceAsiGroups.length) {
      return [...baseGroups, ...subraceAsiGroups];
    }

    return baseGroups;
  }, [isDefaultASI, raceAsi, subraceAsiGroups])

  const isRacialBonusComplete = useMemo(() => {
    if (!(racialBonusGroups?.length ?? 0)) return true;
    const groups: Array<{ groupIndex: number; selectedAbilities: Ability[] }> =
      (watchedRacialBonusChoices as any) || [];

    return (racialBonusGroups ?? []).every((group: any, groupIndex: number) => {
      const current = groups.find((g) => g.groupIndex === groupIndex);
      const selectedCount = (current?.selectedAbilities ?? []).length;
      return selectedCount >= Number(group.choiceCount ?? 0);
    });
  }, [racialBonusGroups, watchedRacialBonusChoices]);

  useEffect(() => {
    if (form.formState.errors.racialBonusChoiceSchema && isRacialBonusComplete) {
      form.clearErrors('racialBonusChoiceSchema');
    }
  }, [form, form.formState.errors.racialBonusChoiceSchema, isRacialBonusComplete]);

  const lastSubmitCountRef = useRef(0);
  useEffect(() => {
    const submitCount = form.formState.submitCount;
    if (submitCount <= lastSubmitCountRef.current) return;
    lastSubmitCountRef.current = submitCount;

    if (form.formState.errors.racialBonusChoiceSchema) {
      scrollToRacialBonuses();
    }
  }, [form.formState.submitCount, form.formState.errors.racialBonusChoiceSchema]);

  const systemCopy: Record<string, string> = {
    [asiSystems.POINT_BUY]: 'Розподіляйте бюджет очок і отримайте контроль над кожною характеристикою.',
    [asiSystems.SIMPLE]: 'Швидкий старт — пересувайте значення вгору та вниз без калькулятора.',
    [asiSystems.CUSTOM]: 'Повна свобода: введіть будь-які значення вручну, якщо ви знаєте що робите.',
  }

  return (
    <form id={formId} onSubmit={onSubmit} className="w-full space-y-6">
      <Card className="shadow-xl">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl text-white md:text-2xl">Розподіл характеристик</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <input type="hidden" {...form.register('asiSystem')} value={asiSystem} />

          {asiFields.map((field, index) => (
            <React.Fragment key={field.id}>
              <input type="hidden" {...form.register(`asi.${index}.ability`)} />
              <input type="hidden" {...form.register(`asi.${index}.value`, { valueAsNumber: true })} />
            </React.Fragment>
          ))}

          {simpleAsiFields.map((field, index) => (
            <React.Fragment key={field.id}>
              <input type="hidden" {...form.register(`simpleAsi.${index}.ability`)} />
              <input type="hidden" {...form.register(`simpleAsi.${index}.value`, { valueAsNumber: true })} />
            </React.Fragment>
          ))}

          {customAsiFields.map((field, index) => (
            <React.Fragment key={field.id}>
              <input type="hidden" {...form.register(`customAsi.${index}.ability`)} />
              <input type="hidden" {...form.register(`customAsi.${index}.value`)} />
            </React.Fragment>
          ))}

          <Tabs
            value={asiSystem}
            onValueChange={(value) => form.setValue('asiSystem', value)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 bg-white/5 text-slate-300">
              <TabsTrigger
                value={asiSystems.POINT_BUY}
                className="data-[state=active]:bg-white/7 data-[state=active]:text-white"
              >
                За очками
              </TabsTrigger>
              <TabsTrigger
                value={asiSystems.SIMPLE}
                className="data-[state=active]:bg-white/7 data-[state=active]:text-white"
              >
                Просто
              </TabsTrigger>
              <TabsTrigger
                value={asiSystems.CUSTOM}
                className="data-[state=active]:bg-white/7 data-[state=active]:text-white"
              >
                Вільно
              </TabsTrigger>
            </TabsList>

            <p className="mt-3 text-sm text-slate-400">{systemCopy[asiSystem]}</p>

            <TabsContent value={asiSystems.POINT_BUY} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                {asiFields.map((field, index) => {
                  const attr = attributes.find((a) => a.eng === field.ability);
                  const currentValue = form.watch(`asi.${index}.value`) || field.value;
                  const bonus = Math.floor((currentValue - 10) / 2)

                  return (
                    <Card
                      key={field.id}
                      className="shadow-sm transition hover:-translate-y-0.5 hover:ring-1 hover:ring-white/10"
                    >
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-400">{attr?.ukr || field.ability}</p>
                        </div>
                        <Badge variant="outline" className="border-white/15 bg-white/5 text-slate-200">
                          {bonus > 0 ? `+${bonus}` : bonus}
                        </Badge>
                      </CardHeader>
                      <CardContent className="flex items-center justify-between pt-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => decrementValue(index)}
                          disabled={(currentValue as number) <= 8}
                          className="border-indigo-500/60 bg-indigo-500/10 text-indigo-50 hover:bg-indigo-500/20"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-lg font-semibold text-white">
                          {currentValue as number}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => incrementValue(index)}
                          disabled={(currentValue as number) > 14}
                          className="border-emerald-400/60 bg-emerald-500/10 text-emerald-50 hover:bg-emerald-500/20"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm">
                <span className="text-slate-300">Залишок очок</span>
                <Badge
                  variant="outline"
                  className={`px-3 text-base ${points < 0 ? 'border-red-500/60 text-red-200' : 'border-emerald-500/50 text-emerald-200'}`}
                >
                  {points}
                </Badge>
              </div>
            </TabsContent>

            <TabsContent value={asiSystems.SIMPLE} className="space-y-3">
              <div className="flex flex-col gap-2">
                {sortedSimpleAsi.map((field, sortedIndex) => {
                  const attr = attributes.find((a) => a.eng === field.ability);
                  const currentValue = field.value;
                  return (
                    <Card
                    key={field.id}
                    className="shadow-sm transition hover:-translate-y-0.5 hover:ring-1 hover:ring-white/10 p-2"
                  >
                    <CardContent className="flex items-center justify-between gap-1 pt-0 pb-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-6 w-6 border-indigo-500/60 bg-indigo-500/10 text-indigo-50 hover:bg-indigo-500/20"
                        onClick={() => swapValues({ sortedIndexA: sortedIndex, isDirectionUp: true })}
                        disabled={sortedIndex === 0 || currentValue >= 15}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                  
                      <div className="flex flex-col items-center justify-center">
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">{attr?.ukr || field.ability}</p>
                        <p className="text-lg font-semibold text-white leading-none">{currentValue}</p>
                      </div>
                  
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-6 w-6 border-emerald-500/60 bg-emerald-500/10 text-emerald-50 hover:bg-emerald-500/20"
                        onClick={() => swapValues({ sortedIndexA: sortedIndex, isDirectionUp: false })}
                        disabled={sortedIndex === sortedSimpleAsi.length - 1 || currentValue <= 8}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value={asiSystems.CUSTOM} className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                {customAsiFields.map((field, index) => {
                  const attr = attributes.find((a) => a.eng === field.ability);
                  const currentValue = form.watch(`customAsi.${index}.value`);
                  // const shortName = attributesUrkShort.find((a) => a.eng === field.ability)?.ukr || attr?.ukr;

                  return (
                    <Card
                      key={field.id}
                      className="shadow-sm transition hover:-translate-y-0.5 hover:ring-1 hover:ring-white/10"
                    >
                      <CardHeader className="flex items-center justify-between pb-2">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-400">{attr?.ukr || field.ability}</p>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Input
                          type="number"
                          inputMode="numeric"
                          placeholder="14"
                          value={currentValue ?? ''}
                          onChange={(e) => form.setValue(`customAsi.${index}.value`, e.target.value)}
                          className="border-white/10 bg-white/5 text-white focus-visible:ring-cyan-400/30"
                        />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card
        ref={racialBonusesCardRef}
        className={
          highlightRacialBonuses
            ? "shadow-xl ring-2 ring-red-500/40"
            : "shadow-xl"
        }
      >
        <CardHeader>
          <CardTitle className="text-white">Расові бонуси</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.formState.errors.racialBonusChoiceSchema && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              <AlertCircle className="h-4 w-4" />
              <span>{form.formState.errors.racialBonusChoiceSchema.message}</span>
            </div>
          )}

          {racialBonusGroups?.length ? (
            racialBonusGroups.map((group: any, index) => (
              <div
                key={index}
                className="glass-panel border-gradient-rpg rounded-xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{group.groupName}</p>
                    <p className="text-xs text-slate-400">Оберіть {group.choiceCount}</p>
                  </div>
                  <Badge variant="secondary" className="bg-white/5 text-white">
                    +{group.value}
                  </Badge>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {attributesUrkShort.map((attr, i) => {
                    const isSelected = isRacialBonusSelected(index, attr.eng);
                    const currentCount = getCurrentSelectedCount(index);
                    const isMaxReached = currentCount >= group.choiceCount;
                    const formGroups: {
                      groupIndex: number;
                      choiceCount: number;
                      selectedAbilities: Ability[];
                    }[] = form.getValues(racialBonusSchemaPath) || [];

                    const currentGroup = formGroups.find((g) => g.groupIndex === index);

                    const areAllUnique = (racialBonusGroups?.length ?? 0) > 0
                      && racialBonusGroups.every((flexGroup: any) => flexGroup.unique);

                    const uniqueDisabled = isDefaultASI
                      ? (
                        raceAsi.basic?.simple
                        && (raceAsi.basic?.flexible?.groups?.length ?? 0) > 0
                        && (raceAsi.basic?.flexible?.groups?.every((flexGroup) => flexGroup.unique))
                        && (Object.keys({
                          ...(raceAsi.basic?.simple ?? {}),
                          ...subraceFixedAsi,
                        }).includes(attr.eng))
                      )
                      : (
                        (racialBonusGroups.length ?? 0) > 1
                        && areAllUnique
                        && (formGroups?.some((flexGroup) =>
                          (flexGroup.groupIndex !== (currentGroup?.groupIndex ?? index))
                          && (flexGroup.selectedAbilities.includes(attr.eng))
                        ))
                      );

                    const isDisabled = (!isSelected && isMaxReached) || uniqueDisabled;

                    return (
                      <Button
                        key={i}
                        type="button"
                        variant={isSelected ? 'secondary' : 'outline'}
                        className={`justify-between border-white/15 bg-white/5 text-slate-200 hover:bg-white/7 hover:text-white ${isSelected ? 'border-gradient-rpg border-gradient-rpg-active glass-active text-slate-100' : ''} ${isDisabled ? 'opacity-60' : ''}`}
                        disabled={isDisabled}
                        onClick={() =>
                          handleToggleRacialBonus({
                            groupIndex: index,
                            choiceCount: group.choiceCount,
                            ability: attr.eng,
                          })
                        }
                      >
                        <span className="text-sm">{attr.ukr}</span>
                        {isSelected && <Check className="h-4 w-4" />}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">Для цієї раси немає гнучких бонусів.</p>
          )}

          {isDefaultASI && (
            Object.entries({
              ...(raceAsi.basic?.simple || {}),
              ...subraceFixedAsi,
            }).length > 0
          ) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries({
                ...(raceAsi.basic?.simple || {}),
                ...subraceFixedAsi,
              }).map(([attrEng, value], index) => {
                const attr = attributes.find((a) => a.eng === attrEng);

                return (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <span className="font-semibold text-white">{attr?.ukr}</span>
                    <Badge variant="outline" className="border-white/15 bg-white/5 text-slate-100">
                      +{value}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}

        </CardContent>
      </Card>

      <div className="glass-panel border-gradient-rpg space-y-3 rounded-2xl p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Базові расові бонуси</p>
            <p className="text-xs text-slate-400">Вимкніть, щоб перейти на правила Таші з вільним розподілом.</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              className="sr-only"
              {...form.register('isDefaultASI')}
              checked={isDefaultASI}
              onChange={(event) => form.setValue('isDefaultASI', event.target.checked)}
            />
            <Switch
              id="isDefaultASI"
              checked={isDefaultASI}
              onCheckedChange={(checked) => form.setValue('isDefaultASI', checked)}
            />
            <Label htmlFor="isDefaultASI" className="text-slate-200">
              Базові
            </Label>
          </div>
        </div>
      </div>
    </form>
  )
};

export default ASIForm;
