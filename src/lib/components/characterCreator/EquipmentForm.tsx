import {equipmentSchema} from "@/lib/zod/schemas/persCreateSchema";
import {useStepForm} from "@/hooks/useStepForm";
import {ClassI, RaceI} from "@/lib/types/model-types";
import {useEffect, useMemo, useState} from "react";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { ClassStartingEquipmentOption, Weapon, WeaponType } from "@prisma/client";
import {groupBy} from "@/lib/server/formatters/generalFormatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/lib/components/ui/card";
import { Badge } from "@/lib/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/lib/components/ui/dialog";
import { Button } from "@/lib/components/ui/Button";
import { Tabs, TabsList, TabsTrigger } from "@/lib/components/ui/tabs";
import { WeaponKindType } from "@/lib/types/enums";
import { weaponTranslations, weaponTranslationsEng } from "@/lib/refs/translation";

interface Props {
  race: RaceI
  selectedClass: ClassI
  weapons: Weapon[]
  formId: string
  onNextDisabledChange?: (disabled: boolean) => void
}

const constToCamel: Record<string, WeaponKindType> = {
  SIMPLE_WEAPON: "meleeSimple", 
  MARTIAL_WEAPON: "meleeMartial",  
}

export const EquipmentForm = ({selectedClass, weapons, formId, onNextDisabledChange}: Props) => {
  const { updateFormData, nextStep } = usePersFormStore();
  
  const {form, onSubmit} = useStepForm(equipmentSchema, (data) => {
    updateFormData({ equipmentSchema: data });
    nextStep();
  });

  const choiceGroupToId = (form.watch('choiceGroupToId') ?? {}) as Record<string, number[]>
  const anyWeaponSelection = form.watch('anyWeaponSelection') as Record<string, number[]>

  const choiceGroups = selectedClass.startingEquipmentOption
  const choiceGroupsGroupedRaw = groupBy(choiceGroups, group => group.choiceGroup)
  const choiceGroupsGrouped: Record<string, Record<string, ClassStartingEquipmentOption[]>> = useMemo(() => ({}), []); // HERE

  for (const [choiceGroup, group] of Object.entries(choiceGroupsGroupedRaw)) {
      choiceGroupsGrouped[choiceGroup] = groupBy(group, g => g.option)
  }

  const meleeSimple = useMemo(() => weapons.filter(w => !w.isRanged && w.weaponType === WeaponType.SIMPLE_WEAPON).sort((a, b) => a.sortOrder - b.sortOrder), [weapons]);
  const meleeMartial = useMemo(() => weapons.filter(w => !w.isRanged && w.weaponType === WeaponType.MARTIAL_WEAPON).sort((a, b) => a.sortOrder - b.sortOrder), [weapons]);
  
  const rangedSimple = useMemo(() => weapons.filter(w => w.isRanged && w.weaponType === WeaponType.SIMPLE_WEAPON).sort((a, b) => a.sortOrder - b.sortOrder), [weapons]);
  const rangedMartial= useMemo(() => weapons.filter(w => w.isRanged && (w.weaponType === WeaponType.MARTIAL_WEAPON || (w.weaponType === WeaponType.FIREARMS && !w.isAdditional))).sort((a, b) => a.sortOrder - b.sortOrder), [weapons]);
  const firearmsAdditional = useMemo(() => weapons.filter(w => w.isRanged && w.isAdditional).sort((a, b) => a.sortOrder - b.sortOrder), [weapons]);
  const weaponsByKind = useMemo(() => ({
    'meleeSimple': meleeSimple,
    'meleeMartial': meleeMartial,
    'rangedSimple': rangedSimple,
    'rangedMartial': rangedMartial,
    'firearmsAdditional': firearmsAdditional
  }), 
  [meleeSimple, meleeMartial, rangedSimple, rangedMartial, firearmsAdditional])

  const [weaponDialogOpen, setWeaponDialogOpen] = useState(false);
  const [weaponDialogIsMartial, setWeaponDialogIsMartial] = useState(false);
  const [weaponDialogGroup, setWeaponDialogGroup] = useState<string | null>(null);
  const [weaponDialogIndex, setWeaponDialogIndex] = useState<number>(0);
  const [weaponFilter, setWeaponFilter] = useState<WeaponKindType | undefined>(() => {
    const weaponType = choiceGroups.find(g => g.chooseAnyWeapon)?.weaponType;
    return weaponType 
      ? constToCamel[weaponType]
      : undefined;
  });
  const [selectedWeaponId, setSelectedWeaponId] = useState<number | null>(null);

  const chooseOption = (optionGroup: ClassStartingEquipmentOption[]) => {
    const choiceGroup = optionGroup[0].choiceGroup
    const newOptions = optionGroup.map(g => g.optionId)

    form.setValue(`choiceGroupToId.${choiceGroup}`, newOptions, { shouldDirty: true });

    if (weaponFilter) {
      const weaponCount = optionGroup[0]?.weaponCount ?? 1;
      const existing = (form.getValues(`anyWeaponSelection.${choiceGroup}`) as number[] | undefined) ?? [];
      const defaults = weaponsByKind[weaponFilter]
        .slice(0, weaponCount)
        .map(w => w.weaponId);
      const fallback = weaponsByKind[weaponFilter][0]?.weaponId ?? weapons[0]?.weaponId;
      const selection = Array.from({ length: weaponCount }, (_, idx) => existing[idx] ?? defaults[idx] ?? fallback).filter((id): id is number => typeof id === 'number');
      form.setValue(`anyWeaponSelection.${choiceGroup}`, selection, { shouldDirty: true });
    }
  }

  const openWeaponDialog = (choiceGroup: string, isMartial: boolean, weaponIndex: number) => {
    if (!weaponFilter) return;
    setWeaponDialogIndex(weaponIndex);
    setWeaponDialogGroup(choiceGroup);
    const currentWeapons = (form.getValues(`anyWeaponSelection.${choiceGroup}`) as number[] | undefined) ?? [];
    const fallback = weaponsByKind[weaponFilter][weaponIndex]?.weaponId ?? weaponsByKind[weaponFilter][0]?.weaponId ?? null;
    setSelectedWeaponId(currentWeapons[weaponIndex] ?? fallback);
    setWeaponDialogOpen(true);
    setWeaponDialogIsMartial(isMartial);
  }

  const saveWeaponSelection = () => {
    if (!weaponDialogGroup || selectedWeaponId == null) {
      setWeaponDialogOpen(false);
      return;
    }
    const currentWeapons = (form.getValues(`anyWeaponSelection.${weaponDialogGroup}`) as number[] | undefined) ?? [];
    const updatedWeapons = [...currentWeapons];
    updatedWeapons[weaponDialogIndex] = selectedWeaponId;
    form.setValue(`anyWeaponSelection.${weaponDialogGroup}`, updatedWeapons, { shouldDirty: true });
    setWeaponDialogOpen(false);
  }

  useEffect(() => {
    if (!weaponFilter) return;
    const list = weaponsByKind[weaponFilter]
    if (selectedWeaponId != null && list?.some(w => w.weaponId === selectedWeaponId)) return;
    const fallback = list[0]?.weaponId ?? weapons[0]?.weaponId ?? null;
    setSelectedWeaponId(fallback);
  }, [weaponFilter, weaponsByKind, selectedWeaponId, weapons]);

  useEffect(() => {
    form.register("choiceGroupToId");
    form.register("anyWeaponSelection");
  }, [form]);

  useEffect(() => {
    onNextDisabledChange?.(false);
  }, [onNextDisabledChange]);

  useEffect(() => {
    const current = form.getValues('choiceGroupToId')

    if (!current) return

    if (Object.keys(current).length > 0) return

    const { initialChoiceGroupToId, initialAnyWeaponSelection } = Object.entries(choiceGroupsGrouped).reduce(
      (acc, [choiceGroup, choiceGroupToOptionGroup]) => {
        const optionA = choiceGroupToOptionGroup['a']
        acc.initialChoiceGroupToId[choiceGroup] = [optionA[0].optionId]
        const hasAny = optionA.some(o => o.chooseAnyWeapon);
        if (hasAny && weaponFilter) {
          const weaponCount = optionA[0].weaponCount ?? 1;
          const defaults = weaponsByKind[weaponFilter].slice(0, weaponCount).map(w => w.weaponId);
          const fallback = weaponsByKind[weaponFilter][0]?.weaponId ?? weapons[0]?.weaponId;
          acc.initialAnyWeaponSelection[choiceGroup] = Array.from({ length: weaponCount }, (_, idx) => defaults[idx] ?? fallback).filter((id): id is number => typeof id === 'number');
        }
        return acc
      }, { initialChoiceGroupToId: {} as Record<string, number[]>, initialAnyWeaponSelection: {} as Record<string, number[]> }
    )

    form.setValue('choiceGroupToId', initialChoiceGroupToId)
    form.setValue('anyWeaponSelection', initialAnyWeaponSelection, { shouldDirty: false })
  }, [choiceGroupsGrouped, form, weaponsByKind, weaponFilter, weapons])


  const renderWeaponDialog = () => {
    if (!weaponFilter) return;
    const isMartial = weaponDialogIsMartial;
    const list = weaponsByKind[weaponFilter];
    return (
      <Dialog open={weaponDialogOpen} onOpenChange={setWeaponDialogOpen}>
        <DialogContent className="sm:max-w-[520px] border border-slate-800 bg-slate-950/90">
          <DialogHeader>
            <DialogTitle className="text-white">Оберіть {isMartial && 'бойову'} зброю</DialogTitle>
            <DialogDescription className="text-slate-400">
              Виберіть тип та конкретну зброю.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={weaponFilter} onValueChange={(val: string) => setWeaponFilter(val as WeaponKindType)}>
            <TabsList className="grid grid-cols-2 bg-slate-900/70">
              <TabsTrigger value={isMartial ? 'meleeMartial' : 'meleeSimple'} className="data-[state=active]:bg-slate-800 data-[state=active]:text-white">
                Ближній бій
              </TabsTrigger>
              <TabsTrigger value={isMartial ? 'rangedMartial' : 'rangedSimple'} className="data-[state=active]:bg-slate-800 data-[state=active]:text-white">
                Дальній бій
              </TabsTrigger>
            </TabsList>
            {/* <TabsContent value={isMartial ? 'meleeMartial' : 'meleeSimple'} />
            <TabsContent value={isMartial ? 'rangedMartial' : 'rangedSimple'} /> */} {/* No need for content, we just filter the list above based on selected tab */}
          </Tabs>

          <div className="space-y-2">
            <label className="text-sm text-slate-200">{isMartial ? 'Бойова ' : 'Проста '}Зброя</label>
            <select
              className="w-full rounded-md border border-slate-800 bg-slate-900/80 px-3 py-2 text-white"
              value={selectedWeaponId ?? ''}
              onChange={(e) => setSelectedWeaponId(Number(e.target.value))}
            >
              {list.map((w) => (
                <option key={w.weaponId} value={w.weaponId} title={weaponTranslationsEng[w.name]}>
                  {weaponTranslations[w.name]}
                </option>
              ))}
            </select>
          </div>

          <DialogFooter className="mt-4 flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="ghost">Скасувати</Button>
            </DialogClose>
            <Button onClick={saveWeaponSelection} className="bg-indigo-500 text-white">Зберегти</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  const weaponNameById = (id?: number) => weapons.find(w => w.weaponId === id);

  return (
    <form id={formId} onSubmit={onSubmit} className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-4 shadow-inner space-y-4">
      <Card className="border border-slate-800/70 bg-slate-950/70 shadow-xl">
        <CardHeader>
          <CardTitle className="text-white">Спорядження</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(choiceGroupsGrouped).map(([choiceGroup, choiceGroupToOptionGroup], index) => (
            <div key={index} className="rounded-lg border border-slate-800/70 bg-slate-900/60 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Опція {choiceGroup}</p>
                <Badge className="bg-slate-800/70 text-slate-200 border border-slate-700 cursor-default">Оберіть одну</Badge>
              </div>
              <div className="mt-3 space-y-2">
                {Object.values(choiceGroupToOptionGroup).map((optionGroup, idx) => {
                  const entry = optionGroup[0]
                  const output = optionGroup.map(g => g.description).join(', ')
                  const checked = !!(choiceGroupToId[choiceGroup]?.includes?.(entry.optionId))
                  const hasAnyWeapon = optionGroup.some(g => g.chooseAnyWeapon)
                  const selectedWeapons = anyWeaponSelection?.[choiceGroup] ?? [];

                  return (
                    <div
                      key={idx}
                      className={`rounded-lg border px-3 py-2 ${checked ? "border-indigo-400/60 bg-indigo-500/10" : "border-slate-800/70 bg-slate-900/70"}`}
                    >
                      <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                        <input
                          type="radio"
                          name={ choiceGroup }
                          onChange={ () => chooseOption(optionGroup) }
                          checked={checked}
                          className="h-4 w-4"
                        />
                        <span>{output}</span>
                      </label>
                      {hasAnyWeapon && checked && (
                        <div className="mt-2 space-y-2">
                          {Array.from({ length: entry.weaponCount || 1 }).map((_, weaponIdx) => {
                            const selectedWeaponName = weaponTranslations[weaponNameById(selectedWeapons?.[weaponIdx])?.name ?? ''] ?? 'Не обрано';
                            return (
                              <div key={weaponIdx} className="flex items-center justify-between rounded-md border border-slate-800/70 bg-slate-900/70 px-3 py-2 text-sm text-slate-200">
                                <div>
                                  <p className="text-xs text-slate-400">Зброя #{weaponIdx + 1}</p>
                                  <p>{selectedWeaponName}</p>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  className="bg-indigo-500/20 text-indigo-50 border border-indigo-400/60"
                                  onClick={() => openWeaponDialog(choiceGroup, entry.weaponType === WeaponType.MARTIAL_WEAPON, weaponIdx)}
                                >
                                  Обрати зброю
                                </Button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      {renderWeaponDialog()}
    </form>
  )
};

export default EquipmentForm
