import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import type { ReadyEquipmentChoice, ReadyEquipmentGroup } from "./ready-preset-options";

type EquipmentSelections = NonNullable<PersFormData["equipmentSchema"]>;
type EquipmentPick = { group: number; option: string; weapons: string[] };

export function buildPresetEquipment(picks: EquipmentPick[], groups: ReadyEquipmentGroup[]): EquipmentSelections {
  if (picks.length !== groups.length || new Set(picks.map((pick) => pick.group)).size !== groups.length) throw new Error("Incomplete preset equipment groups");
  return picks.reduce<EquipmentSelections>((selections, pick) => {
    const choice = groups.find((entry) => entry.group === String(pick.group))?.choices.find((entry) => entry.option === pick.option);
    if (!choice || choice.weaponCount !== pick.weapons.length) throw new Error(`Missing preset equipment: ${pick.group}/${pick.option}`);
    const weaponIds = pick.weapons.map((name) => {
      const weapon = choice.weapons.find((entry) => entry.name === name);
      if (!weapon) throw new Error(`Unavailable preset weapon: ${name}`);
      return weapon.id;
    });
    return buildEquipmentSelection(selections, String(pick.group), choice, weaponIds);
  }, { choiceGroupToId: {}, anyWeaponSelection: {} });
}

export function buildEquipmentSelection(selections: EquipmentSelections, group: string, choice: ReadyEquipmentChoice, weaponIds: number[]): EquipmentSelections {
  const anyWeaponSelection = { ...selections.anyWeaponSelection };
  delete anyWeaponSelection[group];
  if (choice.weaponCount) anyWeaponSelection[group] = weaponIds;
  return { ...selections, choiceGroupToId: { ...selections.choiceGroupToId, [group]: choice.optionIds }, anyWeaponSelection };
}

export function findSelectedEquipmentChoice(selections: EquipmentSelections, group: ReadyEquipmentGroup) {
  const selected = selections.choiceGroupToId[group.group] ?? [];
  return group.choices.find((choice) => choice.optionIds.length === selected.length && choice.optionIds.every((id) => selected.includes(id)));
}

export function isPresetEquipmentValid(selections: EquipmentSelections, groups: ReadyEquipmentGroup[]): boolean {
  if (Object.keys(selections.choiceGroupToId).length !== groups.length) return false;
  const weaponGroups: string[] = [];
  for (const group of groups) {
    const choice = findSelectedEquipmentChoice(selections, group);
    if (!choice) return false;
    const selectedWeapons = selections.anyWeaponSelection[group.group] ?? [];
    if (selectedWeapons.length !== choice.weaponCount || !selectedWeapons.every((id) => choice.weapons.some((weapon) => weapon.id === id))) return false;
    if (choice.weaponCount) weaponGroups.push(group.group);
  }
  return Object.keys(selections.anyWeaponSelection).every((group) => weaponGroups.includes(group));
}
