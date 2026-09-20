import {equipmentSchema} from "@/lib/zod/schemas/persCreateSchema";
import {useStepForm} from "@/hooks/useStepForm";
import {BackgroundI, ClassI, RaceI} from "@/lib/types/model-types";
import {useCallback, useEffect, useMemo, useState} from "react";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { Weapon, WeaponType } from "@prisma/client";
import {groupBy} from "@/lib/server/formatters/generalFormatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WeaponKindType } from "@/lib/types/enums";
import { weaponTranslations, weaponTranslationsEng } from "@/lib/refs/translation";
import { ControlledInfoDialog, InfoSectionTitle } from "@/lib/components/characterCreator/EntityInfoDialog";
import { EquipmentOptionCard } from "@/lib/components/characterCreator/EquipmentOptionCard";
import { EquipmentWeaponPicks } from "@/lib/components/characterCreator/EquipmentWeaponPicks";
import { EquipmentCatalogDialog } from "@/lib/components/characterCreator/EquipmentCatalogDialog";
import {
  buildChoiceHeading,
  buildDefaultSelection,
  buildEquipmentLines,
  buildItemLines,
  findDefaultLetterRows,
  formatVariantTitle,
  type EquipmentCatalogItem,
  type EquipmentLine,
  type EquipmentPackView,
} from "@/lib/components/characterCreator/equipment-choices";
import { findBackgroundStartingItems, hasGoldAlternative, GOLD_ITEM_NAME } from "@/rules/background-equipment";

interface Props {
  race: RaceI
  selectedClass: ClassI
  background?: BackgroundI
  weapons: Weapon[]
  formId: string
  onNextDisabledChange?: (disabled: boolean) => void
}

const findAnyWeaponRow = <T extends { chooseAnyWeapon: boolean }>(rows: T[]) =>
  rows.find(row => row.chooseAnyWeapon);

const constToCamel: Record<string, WeaponKindType> = {
  SIMPLE_WEAPON: "meleeSimple", 
  MARTIAL_WEAPON: "meleeMartial",  
}

export const EquipmentForm = ({selectedClass, background, weapons, formId, onNextDisabledChange}: Props) => {
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

  const hasClassEquipmentChoices = Object.keys(choiceGroupsGrouped).length > 0;

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
  const [catalogItem, setCatalogItem] = useState<EquipmentCatalogItem | null>(null);

  const buildWeaponIds = useCallback((weaponCount: number, existing: number[] = []): number[] => {
    if (!weaponFilter) return [];
    const list = weaponsByKind[weaponFilter];
    const fallback = list[0]?.weaponId ?? weapons[0]?.weaponId;
    return Array.from({ length: weaponCount }, (_, idx) => existing[idx] ?? list[idx]?.weaponId ?? fallback)
      .filter((id): id is number => typeof id === 'number');
  }, [weaponFilter, weaponsByKind, weapons]);

  const chooseOption = (optionGroup: StartingEquipmentOptionLike[]) => {
    const choiceGroup = optionGroup[0].choiceGroup

    form.setValue(`choiceGroupToId.${choiceGroup}`, optionGroup.map(g => g.optionId), { shouldDirty: true });

    if (weaponFilter) {
      const weaponCount = findAnyWeaponRow(optionGroup)?.weaponCount ?? 1;
      const existing = (form.getValues(`anyWeaponSelection.${choiceGroup}`) as number[] | undefined) ?? [];
      form.setValue(`anyWeaponSelection.${choiceGroup}`, buildWeaponIds(weaponCount, existing), { shouldDirty: true });
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

  const openLineInfo = (line: EquipmentLine) => {
    if (line.catalogItem) {
      setCatalogItem(line.catalogItem);
      return;
    }

    const pack: EquipmentPackView | null = line.pack;
    if (!pack) return;

    setPackInfoTitle(pack.name);
    setPackInfoDescription(pack.description);
    setPackInfoItems(pack.items);
    setPackInfoOpen(true);
  };

  useEffect(() => {
    onNextDisabledChange?.(false);
  }, [onNextDisabledChange]);

  useEffect(() => {
    if (!hasClassEquipmentChoices) return

    const current = form.getValues('choiceGroupToId')
    if (current && Object.keys(current).length > 0) return

    const initialAnyWeaponSelection: Record<string, number[]> = {}
    Object.entries(choiceGroupsGrouped).forEach(([choiceGroup, choiceGroupToOptionGroup]) => {
      const anyWeaponRow = findAnyWeaponRow(findDefaultLetterRows(choiceGroupToOptionGroup))
      if (!anyWeaponRow) return
      initialAnyWeaponSelection[choiceGroup] = buildWeaponIds(anyWeaponRow.weaponCount ?? 1)
    })

    form.setValue('choiceGroupToId', buildDefaultSelection(choiceGroupsGrouped), { shouldDirty: false })
    form.setValue('anyWeaponSelection', initialAnyWeaponSelection, { shouldDirty: false })
    onNextDisabledChange?.(false)
  }, [choiceGroupsGrouped, hasClassEquipmentChoices, form, buildWeaponIds, onNextDisabledChange])


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

  const renderWeaponPicks = (choiceGroup: string, anyWeaponRow: StartingEquipmentOptionLike) => {
    const selected = anyWeaponSelection?.[choiceGroup] ?? [];
    const weaponNames = Array.from({ length: anyWeaponRow.weaponCount || 1 }, (_, index) =>
      weaponTranslations[weaponNameById(selected[index])?.name ?? ''] ?? 'Не обрано');

    return (
      <EquipmentWeaponPicks
        weaponNames={weaponNames}
        onPick={(weaponIndex) =>
          openWeaponDialog(choiceGroup, anyWeaponRow.weaponType === WeaponType.MARTIAL_WEAPON, weaponIndex)}
      />
    );
  };

  const backgroundEquipmentChoice = form.watch('backgroundEquipmentChoice') ?? 'EQUIPMENT';
  const showsBackgroundGoldChoice = !!background && hasGoldAlternative(background);
  const backgroundPackage = background ? findBackgroundStartingItems(background, 'EQUIPMENT') : [];

  const chooseBackgroundEquipment = (choice: 'EQUIPMENT' | 'GOLD') => {
    form.setValue('backgroundEquipmentChoice', choice, { shouldDirty: true });
    updateFormData({
      equipmentSchema: {
        choiceGroupToId: form.getValues('choiceGroupToId') ?? {},
        anyWeaponSelection: form.getValues('anyWeaponSelection') ?? {},
        backgroundEquipmentChoice: choice,
      },
    });
  };

  const renderBackgroundGoldChoice = () => {
    if (!showsBackgroundGoldChoice || !background) return null;
    const gold = background.grantsGoldInstead ?? 0;

    return (
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-white">Майно походження</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-slate-400">Оберіть пакунок походження або золото замість нього.</p>
          {([
            { value: 'EQUIPMENT' as const, title: 'Пакунок спорядження', lines: buildItemLines(backgroundPackage) },
            { value: 'GOLD' as const, title: 'Гроші замість пакунка', lines: buildItemLines([{ name: GOLD_ITEM_NAME, quantity: gold }]) },
          ]).map((option) => (
            <EquipmentOptionCard
              key={option.value}
              radioName="backgroundEquipmentChoice"
              title={option.title}
              lines={option.lines}
              selected={backgroundEquipmentChoice === option.value}
              onSelect={() => chooseBackgroundEquipment(option.value)}
            />
          ))}
        </CardContent>
      </Card>
    );
  };

  return (
    <form id={formId} onSubmit={onSubmit} className="glass-panel border-gradient-rpg space-y-4 rounded-xl p-4">
      {hasClassEquipmentChoices && (
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-white">Спорядження</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(choiceGroupsGrouped).map(([choiceGroup, choiceGroupToOptionGroup]) => {
              const letters = Object.keys(choiceGroupToOptionGroup)
              const isChoice = letters.length > 1

              return (
                <div key={choiceGroup} className="glass-panel border-gradient-rpg rounded-lg p-3">
                  <p className="text-sm font-semibold text-white">{buildChoiceHeading(letters)}</p>
                  <div className="mt-3 space-y-2">
                    {letters.map((letter) => {
                      const optionGroup = choiceGroupToOptionGroup[letter]
                      const checked = !!(choiceGroupToId[choiceGroup]?.includes?.(optionGroup[0].optionId))
                      const anyWeaponRow = findAnyWeaponRow(optionGroup)

                      return (
                        <EquipmentOptionCard
                          key={letter}
                          radioName={choiceGroup}
                          title={isChoice ? formatVariantTitle(letter) : undefined}
                          lines={buildEquipmentLines(optionGroup)}
                          selected={checked}
                          onSelect={isChoice ? () => chooseOption(optionGroup) : undefined}
                          onInfo={openLineInfo}
                        >
                          {anyWeaponRow && (checked || !isChoice)
                            ? renderWeaponPicks(choiceGroup, anyWeaponRow)
                            : null}
                        </EquipmentOptionCard>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
      {renderBackgroundGoldChoice()}
      {renderWeaponDialog()}
      <EquipmentCatalogDialog item={catalogItem} ruleset={selectedClass.ruleset} onClose={() => setCatalogItem(null)} />

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
