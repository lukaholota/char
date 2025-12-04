import {equipmentSchema} from "@/lib/zod/schemas/persCreateSchema";
import {useStepForm} from "@/hooks/useStepForm";
import {ClassI, RaceI} from "@/lib/types/model-types";
import {useEffect, useMemo, useState} from "react";
import { ClassStartingEquipmentOption, Weapon } from "@prisma/client";
import {groupBy} from "@/lib/server/formatters/generalFormatters";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/lib/components/ui/card";
import { Badge } from "@/lib/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/lib/components/ui/dialog";
import { Button } from "@/lib/components/ui/Button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/lib/components/ui/tabs";

interface Props {
  race: RaceI
  selectedClass: ClassI
  weapons: Weapon[]
  formId: string
  onNextDisabledChange?: (disabled: boolean) => void
}

export const EquipmentForm = ({race, selectedClass, weapons, formId, onNextDisabledChange}: Props) => {
  const {form, onSubmit} = useStepForm(equipmentSchema);

  const choiceGroupToId = (form.watch('choiceGroupToId') ?? {}) as Record<string, number[]>
  const anyWeaponSelection = form.watch('anyWeaponSelection') as Record<string, number>

  const choiceGroups = selectedClass.startingEquipmentOption
  const choiceGroupsGroupedRaw = groupBy(choiceGroups, group => group.choiceGroup)
  const choiceGroupsGrouped: Record<string, Record<string, ClassStartingEquipmentOption[]>> = useMemo(() => ({}), []); // HERE

  for (const [choiceGroup, group] of Object.entries(choiceGroupsGroupedRaw)) {
      choiceGroupsGrouped[choiceGroup] = groupBy(group, g => g.option)
  }

  const meleeWeapons = useMemo(() => weapons.filter(w => w.normalRange === null && w.longRange === null), [weapons]);
  const rangedWeapons = useMemo(() => weapons.filter(w => w.normalRange !== null || w.longRange !== null), [weapons]);

  const [weaponDialogOpen, setWeaponDialogOpen] = useState(false);
  const [weaponDialogGroup, setWeaponDialogGroup] = useState<string | null>(null);
  const [weaponFilter, setWeaponFilter] = useState<'melee' | 'ranged'>('melee');
  const [selectedWeaponId, setSelectedWeaponId] = useState<number | null>(null);

  const chooseOption = (optionGroup: ClassStartingEquipmentOption[]) => {
    const choiceGroup = optionGroup[0].choiceGroup
    const newOptions = optionGroup.map(g => g.optionId)

    form.setValue(`choiceGroupToId.${choiceGroup}`, newOptions, { shouldDirty: true });

    if (optionGroup.some(g => g.chooseAnyWeapon)) {
      const existing = form.getValues(`anyWeaponSelection.${choiceGroup}`) as number | undefined;
      const defaultWeapon = (weaponFilter === 'melee' ? meleeWeapons[0] : rangedWeapons[0]) ?? weapons[0];
      form.setValue(`anyWeaponSelection.${choiceGroup}`, existing ?? defaultWeapon?.weaponId, { shouldDirty: true });
    }
  }

  const openWeaponDialog = (choiceGroup: string) => {
    setWeaponDialogGroup(choiceGroup);
    const currentId = form.getValues(`anyWeaponSelection.${choiceGroup}`) as number | undefined;
    const fallback = meleeWeapons[0]?.weaponId ?? rangedWeapons[0]?.weaponId ?? null;
    setSelectedWeaponId(currentId ?? fallback);
    setWeaponDialogOpen(true);
  }

  const saveWeaponSelection = () => {
    if (!weaponDialogGroup || !selectedWeaponId) {
      setWeaponDialogOpen(false);
      return;
    }
    form.setValue(`anyWeaponSelection.${weaponDialogGroup}`, selectedWeaponId, { shouldDirty: true });
    setWeaponDialogOpen(false);
  }

  useEffect(() => {
    const list = weaponFilter === 'melee' ? meleeWeapons : rangedWeapons;
    if (selectedWeaponId && list.some(w => w.weaponId === selectedWeaponId)) return;
    const fallback = list[0]?.weaponId ?? weapons[0]?.weaponId ?? null;
    setSelectedWeaponId(fallback);
  }, [weaponFilter, meleeWeapons, rangedWeapons, weapons, selectedWeaponId]);

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

    const initValues = Object.entries(choiceGroupsGrouped).reduce(
      (acc, [choiceGroup, choiceGroupToOptionGroup]) => {
        const optionA = choiceGroupToOptionGroup['a']
        acc[choiceGroup] = [optionA[0].optionId]
        const hasAny = optionA.some(o => o.chooseAnyWeapon);
        if (hasAny) {
          const defaultWeapon = meleeWeapons[0]?.weaponId ?? rangedWeapons[0]?.weaponId ?? weapons[0]?.weaponId;
          if (defaultWeapon) {
            form.setValue(`anyWeaponSelection.${choiceGroup}`, defaultWeapon, { shouldDirty: false });
          }
        }
        return acc
      }, {} as Record<string, number[]>
    )

    form.setValue('choiceGroupToId', initValues)
  }, [choiceGroupsGrouped, form, meleeWeapons, rangedWeapons, weapons])


  const renderWeaponDialog = () => {
    const list = weaponFilter === 'melee' ? meleeWeapons : rangedWeapons;
    return (
      <Dialog open={weaponDialogOpen} onOpenChange={setWeaponDialogOpen}>
        <DialogContent className="sm:max-w-[520px] border border-slate-800 bg-slate-950/90">
          <DialogHeader>
            <DialogTitle className="text-white">Оберіть зброю</DialogTitle>
            <DialogDescription className="text-slate-400">
              Виберіть тип та конкретну зброю.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={weaponFilter} onValueChange={(val) => setWeaponFilter(val as 'melee' | 'ranged')}>
            <TabsList className="grid grid-cols-2 bg-slate-900/70">
              <TabsTrigger value="melee" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white">
                Ближній бій
              </TabsTrigger>
              <TabsTrigger value="ranged" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white">
                Дальній бій
              </TabsTrigger>
            </TabsList>
            <TabsContent value="melee" />
            <TabsContent value="ranged" />
          </Tabs>

          <div className="space-y-2">
            <label className="text-sm text-slate-200">Зброя</label>
            <select
              className="w-full rounded-md border border-slate-800 bg-slate-900/80 px-3 py-2 text-white"
              value={selectedWeaponId ?? ''}
              onChange={(e) => setSelectedWeaponId(Number(e.target.value))}
            >
              {list.map((w) => (
                <option key={w.weaponId} value={w.weaponId}>
                  {w.name.replaceAll('_', ' ')}
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

  const weaponNameById = (id?: number) => weapons.find(w => w.weaponId === id)?.name.replaceAll('_', ' ');

  return (
    <form id={formId} onSubmit={onSubmit} className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-4 shadow-inner space-y-4">
      <Card className="border border-slate-800/70 bg-slate-950/70 shadow-xl">
        <CardHeader>
          <CardTitle className="text-white">Спорядження</CardTitle>
          <CardDescription className="text-slate-400">Обирайте варіанти спорядження або підберіть зброю вручну.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(choiceGroupsGrouped).map(([choiceGroup, choiceGroupToOptionGroup], index) => (
            <div key={index} className="rounded-lg border border-slate-800/70 bg-slate-900/60 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Опція {choiceGroup}</p>
                <Badge className="bg-slate-800/70 text-slate-200 border border-slate-700">Виберіть один</Badge>
              </div>
              <div className="mt-3 space-y-2">
                {Object.values(choiceGroupToOptionGroup).map((optionGroup, idx) => {
                  const entry = optionGroup[0]
                  const output = optionGroup.map(g => g.description).join(', ')
                  const checked = !!(choiceGroupToId[choiceGroup]?.includes?.(entry.optionId))
                  const hasAnyWeapon = optionGroup.some(g => g.chooseAnyWeapon)
                  const selectedWeaponName = weaponNameById(anyWeaponSelection?.[choiceGroup]);

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
                        <div className="mt-2 flex items-center justify-between rounded-md border border-slate-800/70 bg-slate-900/70 px-3 py-2 text-sm text-slate-200">
                          <div>
                            <p className="text-xs text-slate-400">Вибрана зброя</p>
                            <p>{selectedWeaponName ?? "Не обрано"}</p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="bg-indigo-500/20 text-indigo-50 border border-indigo-400/60"
                            onClick={() => openWeaponDialog(choiceGroup)}
                          >
                            Обрати зброю
                          </Button>
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
