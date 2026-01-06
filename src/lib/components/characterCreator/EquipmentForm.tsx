import {equipmentSchema} from "@/lib/zod/schemas/persCreateSchema";
import {useStepForm} from "@/hooks/useStepForm";
import {ClassI, RaceI} from "@/lib/types/model-types";
import {useEffect, useMemo, useState} from "react";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { Weapon, WeaponType } from "@prisma/client";
import {groupBy} from "@/lib/server/formatters/generalFormatters";
import clsx from "clsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WeaponKindType } from "@/lib/types/enums";
import { weaponTranslations, weaponTranslationsEng } from "@/lib/refs/translation";
import { HelpCircle } from "lucide-react";
import { ControlledInfoDialog, InfoSectionTitle } from "@/lib/components/characterCreator/EntityInfoDialog";

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

  const formatDiceUkr = (value: string): string => {
    return String(value ?? "").replaceAll("d", "к").replaceAll("D", "к");
  };

  const formatWeaponDamageLabel = (weapon: Pick<Weapon, "damage" | "versatileDamage">): string => {
    const base = formatDiceUkr(weapon.damage);
    const versatile = weapon.versatileDamage ? formatDiceUkr(weapon.versatileDamage) : "";
    return versatile ? `${base}/${versatile}` : base;
  };
  
  const {form, onSubmit} = useStepForm(equipmentSchema, (data) => {
    updateFormData({ equipmentSchema: data });
    nextStep();
  });

  const choiceGroupToId = (form.watch('choiceGroupToId') ?? {}) as Record<string, number[]>
  const anyWeaponSelection = (form.watch('anyWeaponSelection') ?? {}) as Record<string, number[]>

  type StartingEquipmentOptionLike = NonNullable<ClassI["startingEquipmentOption"]>[number];

  const choiceGroups = selectedClass.startingEquipmentOption
  const choiceGroupsGrouped: Record<string, Record<string, StartingEquipmentOptionLike[]>> = useMemo(() => {
    const raw = groupBy(choiceGroups ?? [], (group) => group.choiceGroup)
    const grouped: Record<string, Record<string, StartingEquipmentOptionLike[]>> = {}
    for (const [choiceGroup, group] of Object.entries(raw)) {
      grouped[choiceGroup] = groupBy(group, (g) => g.option)
    }
    return grouped
  }, [choiceGroups])

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
    const weaponType = (choiceGroups ?? []).find(g => g.chooseAnyWeapon)?.weaponType;
    return weaponType 
      ? constToCamel[weaponType]
      : undefined;
  });
  const [selectedWeaponId, setSelectedWeaponId] = useState<number | null>(null);

  const [packInfoOpen, setPackInfoOpen] = useState(false);
  const [packInfoTitle, setPackInfoTitle] = useState<string>("");
  const [packInfoDescription, setPackInfoDescription] = useState<string>("");
  const [packInfoItems, setPackInfoItems] = useState<Array<{ name: string; quantity: number }>>([]);

  const chooseOption = (optionGroup: StartingEquipmentOptionLike[]) => {
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

  const openPackInfo = (title: string, entry: StartingEquipmentOptionLike) => {
    const pack = (entry as any).equipmentPack as any;
    const rawItems = Array.isArray(pack?.items) ? (pack.items as any[]) : [];
    const items = rawItems
      .map((it) => {
        const name = typeof it?.name === "string" ? it.name : "";
        const qty = Number(it?.quantity);
        return { name, quantity: Number.isFinite(qty) ? qty : 1 };
      })
      .filter((x) => x.name);

    setPackInfoTitle(title);
    setPackInfoDescription(String(pack?.description ?? entry.description ?? ""));
    setPackInfoItems(items);
    setPackInfoOpen(true);
  };

  useEffect(() => {
    onNextDisabledChange?.(false);
  }, [onNextDisabledChange]);

  useEffect(() => {
    if (!choiceGroupsGrouped || Object.keys(choiceGroupsGrouped).length === 0) return

    const current = form.getValues('choiceGroupToId')
    if (current && Object.keys(current).length > 0) return

    const initialChoiceGroupToId: Record<string, number[]> = {}
    const initialAnyWeaponSelection: Record<string, number[]> = {}

    Object.entries(choiceGroupsGrouped).forEach(([choiceGroup, choiceGroupToOptionGroup]) => {
      const optionGroup = choiceGroupToOptionGroup['a'] ?? Object.values(choiceGroupToOptionGroup)[0]
      if (!optionGroup?.[0]) return

      initialChoiceGroupToId[choiceGroup] = [optionGroup[0].optionId]

      const hasAny = optionGroup.some((o) => o.chooseAnyWeapon)
      if (hasAny && weaponFilter) {
        const weaponCount = optionGroup[0].weaponCount ?? 1
        const defaults = weaponsByKind[weaponFilter]
          .slice(0, weaponCount)
          .map((w) => w.weaponId)
        const fallback = weaponsByKind[weaponFilter]?.[0]?.weaponId ?? weapons[0]?.weaponId
        initialAnyWeaponSelection[choiceGroup] = Array.from(
          { length: weaponCount },
          (_, idx) => defaults[idx] ?? fallback
        ).filter((id): id is number => typeof id === 'number')
      }
    })

    form.setValue('choiceGroupToId', initialChoiceGroupToId, { shouldDirty: false })
    form.setValue('anyWeaponSelection', initialAnyWeaponSelection, { shouldDirty: false })
    onNextDisabledChange?.(false)
  }, [choiceGroupsGrouped, form, weaponsByKind, weaponFilter, weapons, onNextDisabledChange])


  const renderWeaponDialog = () => {
    if (!weaponFilter) return;
    const isMartial = weaponDialogIsMartial;
    const list = weaponsByKind[weaponFilter];
    return (
      <Dialog open={weaponDialogOpen} onOpenChange={setWeaponDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-white">Оберіть {isMartial && 'бойову'} зброю</DialogTitle>
            <DialogDescription className="text-slate-400">
              Виберіть тип та конкретну зброю.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={weaponFilter} onValueChange={(val: string) => setWeaponFilter(val as WeaponKindType)}>
            <TabsList className="grid grid-cols-2 bg-white/5">
              <TabsTrigger value={isMartial ? 'meleeMartial' : 'meleeSimple'} className="data-[state=active]:bg-white/7 data-[state=active]:text-white">
                Ближній бій
              </TabsTrigger>
              <TabsTrigger value={isMartial ? 'rangedMartial' : 'rangedSimple'} className="data-[state=active]:bg-white/7 data-[state=active]:text-white">
                Дальній бій
              </TabsTrigger>
            </TabsList>
            {/* <TabsContent value={isMartial ? 'meleeMartial' : 'meleeSimple'} />
            <TabsContent value={isMartial ? 'rangedMartial' : 'rangedSimple'} /> */} {/* No need for content, we just filter the list above based on selected tab */}
          </Tabs>

          <div className="space-y-2">
            <label className="text-sm text-slate-200">{isMartial ? 'Бойова ' : 'Проста '}Зброя</label>
            <Select
              value={selectedWeaponId != null ? String(selectedWeaponId) : undefined}
              onValueChange={(val) => setSelectedWeaponId(Number(val))}
            >
              <SelectTrigger className="w-full border-white/10 bg-white/5 text-white">
                <SelectValue placeholder="Оберіть зброю" />
              </SelectTrigger>
              <SelectContent className="border-white/10">
                {list.map((w) => (
                  <SelectItem key={w.weaponId} value={String(w.weaponId)} title={weaponTranslationsEng[w.name]}>
                    {weaponTranslations[w.name]} ({formatWeaponDamageLabel(w)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
    <form id={formId} onSubmit={onSubmit} className="glass-panel border-gradient-rpg space-y-4 rounded-xl p-4">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-white">Спорядження</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(choiceGroupsGrouped).map(([choiceGroup, choiceGroupToOptionGroup], index) => (
            <div key={index} className="glass-panel border-gradient-rpg rounded-lg p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Опція {choiceGroup}</p>
                <Badge className="cursor-default border border-white/15 bg-white/5 text-slate-200">Оберіть одну</Badge>
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
                      className={clsx(
                        "rounded-lg border px-3 py-2",
                        checked
                          ? "border-gradient-rpg border-gradient-rpg-active glass-active bg-white/5"
                          : "border-white/10 bg-white/5"
                      )}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        const target = e.target as HTMLElement | null;
                        if (target?.closest?.('[data-stop-card-click]')) return;
                        chooseOption(optionGroup);
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" && e.key !== " ") return;
                        const target = e.target as HTMLElement | null;
                        if (target?.closest?.('[data-stop-card-click]')) return;
                        e.preventDefault();
                        chooseOption(optionGroup);
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
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

                        {(entry as any)?.equipmentPack ? (
                          <div
                            data-stop-card-click
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              type="button"
                              size="icon"
                              variant="secondary"
                              className="glass-panel border-gradient-rpg h-8 w-8 rounded-full text-slate-100 transition-all duration-200 hover:text-white focus-visible:ring-cyan-400/30"
                              aria-label={`Що входить до: ${output}`}
                              onClick={() => openPackInfo(output || "Набір", entry)}
                            >
                              <HelpCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : null}
                      </div>
                      {hasAnyWeapon && checked && (
                        <div className="mt-2 space-y-2">
                          {Array.from({ length: entry.weaponCount || 1 }).map((_, weaponIdx) => {
                            const selectedWeaponName = weaponTranslations[weaponNameById(selectedWeapons?.[weaponIdx])?.name ?? ''] ?? 'Не обрано';
                            return (
                              <div key={weaponIdx} className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                                <div>
                                  <p className="text-xs text-slate-400">Зброя #{weaponIdx + 1}</p>
                                  <p>{selectedWeaponName}</p>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  className="border border-white/15 bg-white/5 text-slate-100 hover:bg-white/7"
                                  data-stop-card-click
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openWeaponDialog(choiceGroup, entry.weaponType === WeaponType.MARTIAL_WEAPON, weaponIdx);
                                  }}
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

      <ControlledInfoDialog
        open={packInfoOpen}
        onOpenChange={setPackInfoOpen}
        title={packInfoTitle || "Набір"}
        subtitle={packInfoItems.length ? `Предметів: ${packInfoItems.length}` : undefined}
        contentClassName="max-w-2xl"
      >
        <div className="space-y-3">
          {packInfoDescription ? (
            <div className="text-sm text-slate-200/90">{packInfoDescription}</div>
          ) : null}

          <div className="space-y-2">
            <InfoSectionTitle>Вміст</InfoSectionTitle>
            {packInfoItems.length ? (
              <div className="space-y-2">
                {packInfoItems.map((it) => (
                  <div key={`${it.name}-${it.quantity}`} className="glass-panel rounded-xl border border-slate-800/70 p-3">
                    <div className="text-sm font-semibold text-white">{it.name}</div>
                    <div className="text-xs text-slate-300">Кількість: {it.quantity}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-400">Немає даних</div>
            )}
          </div>
        </div>
      </ControlledInfoDialog>
    </form>
  )
};

export default EquipmentForm
