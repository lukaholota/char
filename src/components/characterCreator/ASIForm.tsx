"use client";

import { useStepForm } from "@/hooks/useStepForm";
import { Ability, Classes,  } from "@prisma/client";
import { asiSchema } from "@/zod/schemas/persCreateSchema";
import { useFieldArray, useWatch } from "react-hook-form";
import React, { useEffect, useMemo } from "react";
import { classAbilityScores } from "@/refs/classesBaseASI";
import { ClassI, RaceI } from "@/types/model-types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, ArrowUp, ArrowDown, Check, Sparkles, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";


interface Props {
  race: RaceI
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
  { race, selectedClass, prevRaceId, setPrevRaceId, formId, onNextDisabledChange }: Props
) => {
  const raceAsi = race.ASI

  const { form, onSubmit } = useStepForm(asiSchema)

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

  const isDefaultASI = form.watch('isDefaultASI') || false
  const asiSystem = form.watch('asiSystem') || asiSystems.POINT_BUY
  const points = form.watch('points') || 0

  useEffect(() => {
    onNextDisabledChange?.(asiSystem === asiSystems.POINT_BUY && points < 0);
  }, [asiSystem, points, onNextDisabledChange])

  const racialBonusSchemaPath = `racialBonusChoiceSchema.${ isDefaultASI ? 'basicChoices' : 'tashaChoices' }` as const;

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
    form.setValue('points', currentValue >= 13 ? points - 2 : points - 1)
    form.setValue(`asi.${ index }.value`, currentValue + 1)
  }
  const decrementValue = (index: number) => {
    const currentValue = form.getValues(`asi.${ index }.value`) || 0;
    if (currentValue > 8) {
      form.setValue('points', currentValue >= 14 ? points + 2 : points + 1)
      form.setValue(`asi.${ index }.value`, currentValue - 1)
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

    const groups = form.getValues(schemaPath) || []

    const arrayIndex = groups.findIndex(g => g.groupIndex === groupIndex);

    if (arrayIndex !== -1) {
      const currentAbilities = groups[arrayIndex].selectedAbilities;
      const hasAbility = currentAbilities.includes(ability);

      if (!hasAbility && currentAbilities.length === groups[arrayIndex].choiceCount) return null;

      const newAbilities = hasAbility
        ? currentAbilities.filter(a => a !== ability)
        : [...currentAbilities, ability]

      form.setValue(
        `${ schemaPath }.${ arrayIndex }.selectedAbilities`,
        newAbilities
      )
    } else {
      const newGroup = {
        groupIndex: groupIndex,
        choiceCount: choiceCount,
        selectedAbilities: [ability]
      }
      const newGroups = [...groups, newGroup]

      form.setValue(`${ schemaPath }`, newGroups)
    }
  }

  const isRacialBonusSelected = (index: number, attr: Ability) => {
    const abilities = form.getValues(`${ racialBonusSchemaPath }.${ index }.selectedAbilities`) || [];

    return abilities.includes(attr)
  }

  const getCurrentSelectedCount = (index: number) => {
    const abilities = form.getValues(`${ racialBonusSchemaPath }.${ index }.selectedAbilities`) || [];

    return abilities.length;
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
  }, [selectedClass, replaceAsi, replaceSimpleAsi, replaceCustomAsi])

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

  const racialBonusGroups = useMemo(() => {
    return isDefaultASI
      ? raceAsi.basic?.flexible?.groups
      : raceAsi.tasha?.flexible.groups
  }, [isDefaultASI, raceAsi])

  const systemCopy: Record<string, string> = {
    [asiSystems.POINT_BUY]: 'Розподіляйте бюджет очок і отримайте контроль над кожною характеристикою.',
    [asiSystems.SIMPLE]: 'Швидкий старт — пересувайте значення вгору та вниз без калькулятора.',
    [asiSystems.CUSTOM]: 'Повна свобода: введіть будь-які значення вручну, якщо ви знаєте що робите.',
  }

  return (
    <form id={formId} onSubmit={onSubmit} className="w-full space-y-6">
      <Card className="border border-slate-800/70 bg-slate-950/70 shadow-xl">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl text-white md:text-2xl">Розподіл характеристик</CardTitle>
            <CardDescription className="text-slate-400">
              Чистий, мінімалістичний контроль над силами персонажа. Оберіть систему, яка підходить вам.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-800/70 bg-slate-900/70 px-3 py-2 text-xs uppercase tracking-[0.18em] text-slate-300">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            мінімалістичний режим
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
            <TabsList className="grid w-full grid-cols-3 bg-slate-900/70 text-slate-300">
              <TabsTrigger
                value={asiSystems.POINT_BUY}
                className="data-[state=active]:bg-slate-800 data-[state=active]:text-white"
              >
                За очками
              </TabsTrigger>
              <TabsTrigger
                value={asiSystems.SIMPLE}
                className="data-[state=active]:bg-slate-800 data-[state=active]:text-white"
              >
                Просто
              </TabsTrigger>
              <TabsTrigger
                value={asiSystems.CUSTOM}
                className="data-[state=active]:bg-slate-800 data-[state=active]:text-white"
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
                  const shortName = attributesUrkShort.find((a) => a.eng === field.ability)?.ukr || attr?.ukr;

                  return (
                    <Card
                      key={field.id}
                      className="border border-slate-800/80 bg-slate-900/70 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-500/60"
                    >
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-400">{attr?.ukr || field.ability}</p>
                          <p className="text-3xl font-semibold text-white">{currentValue as number}</p>
                        </div>
                        <Badge variant="outline" className="border-slate-700 text-slate-200">
                          {shortName}
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
                        <div className="rounded-lg border border-slate-800/70 bg-slate-900/80 px-4 py-2 text-lg font-semibold text-white">
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
              <div className="flex items-center justify-between rounded-lg border border-slate-800/70 bg-slate-900/80 px-4 py-3 text-sm">
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
                  const shortName = attributesUrkShort.find((a) => a.eng === field.ability)?.ukr || attr?.ukr;

                  return (
                    <Card
                      key={field.id}
                      className="border border-slate-800/80 bg-slate-900/70 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-500/60"
                    >
                      <CardHeader className="flex items-center justify-between pb-1">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-400">{attr?.ukr || field.ability}</p>
                          <p className="text-xl font-semibold text-white">{currentValue}</p>
                        </div>
                        <Badge variant="outline" className="border-slate-700 text-slate-200">
                          {shortName}
                        </Badge>
                      </CardHeader>
                      <CardContent className="flex items-center justify-between gap-3 pt-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="border-indigo-500/60 bg-indigo-500/10 text-indigo-50 hover:bg-indigo-500/20"
                          onClick={() => swapValues({ sortedIndexA: sortedIndex, isDirectionUp: true })}
                          disabled={sortedIndex === 0 || currentValue >= 15}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="border-emerald-500/60 bg-emerald-500/10 text-emerald-50 hover:bg-emerald-500/20"
                          onClick={() => swapValues({ sortedIndexA: sortedIndex, isDirectionUp: false })}
                          disabled={sortedIndex === sortedSimpleAsi.length - 1 || currentValue <= 8}
                        >
                          <ArrowDown className="h-4 w-4" />
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
                  const shortName = attributesUrkShort.find((a) => a.eng === field.ability)?.ukr || attr?.ukr;

                  return (
                    <Card
                      key={field.id}
                      className="border border-slate-800/80 bg-slate-900/70 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-500/60"
                    >
                      <CardHeader className="flex items-center justify-between pb-2">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-400">{attr?.ukr || field.ability}</p>
                          <p className="text-sm text-slate-400">Введіть будь-яке значення</p>
                        </div>
                        <Badge variant="outline" className="border-slate-700 text-slate-200">
                          {shortName}
                        </Badge>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Input
                          type="number"
                          inputMode="numeric"
                          placeholder="14"
                          value={currentValue ?? ''}
                          onChange={(e) => form.setValue(`customAsi.${index}.value`, e.target.value)}
                          className="border-slate-800/80 bg-slate-900/70 text-white"
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

      <Card className="border border-slate-800/70 bg-slate-950/70 shadow-xl">
        <CardHeader>
          <CardTitle className="text-white">Расові бонуси</CardTitle>
          <CardDescription className="text-slate-400">
            Додайте акценти раси до характеристик. Вибирайте інтуїтивно — кнопки підкажуть доступні варіанти.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.formState.errors.racialBonusChoiceSchema && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              <AlertCircle className="h-4 w-4" />
              <span>{form.formState.errors.racialBonusChoiceSchema.message}</span>
            </div>
          )}

          {racialBonusGroups?.length ? (
            racialBonusGroups.map((group, index) => (
              <div
                key={index}
                className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-4 shadow-inner"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{group.groupName}</p>
                    <p className="text-xs text-slate-400">Оберіть {group.choiceCount}</p>
                  </div>
                  <Badge variant="secondary" className="bg-white/5 text-white">
                    +{group.choiceCount}
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

                    const currentGroupIndex = formGroups.findIndex((g) => g.groupIndex === index);

                    const uniqueDisabled = isDefaultASI
                      ? (
                        raceAsi.basic?.simple
                        && (raceAsi.basic?.flexible?.groups?.length ?? 0) > 0
                        && (raceAsi.basic?.flexible?.groups?.every((flexGroup) => flexGroup.unique))
                        && (Object.keys(raceAsi.basic?.simple ?? {}).includes(attr.eng))
                      )
                      : (
                        (raceAsi.tasha?.flexible.groups.length ?? 0) > 1
                        && (raceAsi.tasha?.flexible?.groups?.every((flexGroup) => flexGroup.unique))
                        && (formGroups?.some((flexGroup) =>
                          (flexGroup.groupIndex !== currentGroupIndex)
                          && (flexGroup.selectedAbilities.includes(attr.eng))
                        ))
                      );

                    const isDisabled = (!isSelected && isMaxReached) || uniqueDisabled;

                    return (
                      <Button
                        key={i}
                        type="button"
                        variant={isSelected ? 'secondary' : 'outline'}
                        className={`justify-between ${isDisabled ? 'opacity-60' : ''}`}
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

          {isDefaultASI && Object.entries(raceAsi.basic?.simple || {}).length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(raceAsi.basic?.simple || {}).map(([attrEng, value], index) => {
                const attr = attributes.find((a) => a.eng === attrEng);

                return (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/70 px-4 py-3"
                  >
                    <span className="font-semibold text-white">{attr?.ukr}</span>
                    <Badge variant="outline" className="border-slate-700 text-indigo-200">
                      +{value}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3 rounded-2xl border border-slate-800/70 bg-slate-950/70 p-4 shadow-xl">
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
        <p className="text-xs text-right text-slate-500">
          Кнопки навігації завжди внизу екрана.
        </p>
      </div>
    </form>
  )
};

export default ASIForm;
