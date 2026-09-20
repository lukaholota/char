/**
 * KR18.6 — пул майстерності на кроці підвищення рівня.
 *
 * Ємність рахується вже за **новими** рівнями: обраний клас іде з `classLevelAfter`, решта — зі
 * своїми. Вибір і мультиклас однакові з листом персонажа, бо правило одне на всі три місця.
 */

import {
  type MasteryClassOffer,
  type MasteryWeapon,
  type WeaponProficiencyGrant,
  countFeatMasterySlots,
  findWeaponMasteryCapacity,
  findWeaponMasteryOptionsForCharacter,
} from "@/rules/weapon-mastery";

type ClassRow = {
  classId: number;
  name: string;
  weapon_mastery_progression?: number[] | null;
  weaponProficiencies?: unknown;
  weaponProficienciesSpecial?: unknown;
};

type MasteryPers = {
  classId: number;
  class: ClassRow;
  multiclasses?: Array<{ classId: number; classLevel: number; class: ClassRow }> | null;
  feats?: Array<{ feat?: { name?: string | null } | null }> | null;
  pers_weapon_mastery?: Array<{ weapon_id: number }> | null;
};

export type LevelUpWeaponMastery<Weapon extends MasteryWeapon> = {
  capacity: number;
  options: Weapon[];
  currentWeaponIds: number[];
  /** Крок потрібен лише тоді, коли новий рівень справді відкрив комірку. */
  needsChoice: boolean;
};

export function findLevelUpWeaponMastery<Weapon extends MasteryWeapon>(input: {
  pers: MasteryPers | null;
  selectedClass: ClassRow | null;
  selectedClassId: number | undefined;
  classLevelAfter: number;
  mainClassLevel: number;
  weapons: readonly Weapon[];
  proficiency: WeaponProficiencyGrant;
}): LevelUpWeaponMastery<Weapon> {
  const { pers, selectedClass, selectedClassId, classLevelAfter, mainClassLevel, weapons, proficiency } = input;
  if (!pers) return { capacity: 0, options: [], currentWeaponIds: [], needsChoice: false };

  const classes = collectClassOffers({ pers, selectedClass, selectedClassId, classLevelAfter, mainClassLevel });
  const featSlots = countFeatMasterySlots(readFeatNames(pers));
  const capacity = findWeaponMasteryCapacity(classes, featSlots);
  const currentWeaponIds = (pers.pers_weapon_mastery ?? []).map((entry) => entry.weapon_id);

  return {
    capacity,
    options: findWeaponMasteryOptionsForCharacter({ classes, featSlots, proficiency }, weapons),
    currentWeaponIds,
    needsChoice: capacity > currentWeaponIds.length,
  };
}

/** Риса могла й не долетіти до цього виклику — крок працює й без списку рис. */
function readFeatNames(pers: MasteryPers): string[] {
  return (pers.feats ?? []).map((entry) => entry.feat?.name ?? "").filter(Boolean);
}

function collectClassOffers(input: {
  pers: MasteryPers;
  selectedClass: ClassRow | null;
  selectedClassId: number | undefined;
  classLevelAfter: number;
  mainClassLevel: number;
}): MasteryClassOffer[] {
  const { pers, selectedClass, selectedClassId, classLevelAfter, mainClassLevel } = input;
  const multiclasses = pers.multiclasses ?? [];
  const takesMainClass = selectedClassId === pers.classId;

  const offers = [
    toOffer(pers.class, takesMainClass ? classLevelAfter : mainClassLevel),
    ...multiclasses.map((entry) =>
      toOffer(entry.class, entry.classId === selectedClassId ? classLevelAfter : entry.classLevel),
    ),
  ];

  const isNewMulticlass =
    selectedClass && !takesMainClass && !multiclasses.some((entry) => entry.classId === selectedClassId);

  return isNewMulticlass ? [...offers, toOffer(selectedClass, classLevelAfter)] : offers;
}

function toOffer(characterClass: ClassRow, classLevel: number): MasteryClassOffer {
  return {
    className: characterClass.name,
    classLevel,
    masteryProgression: characterClass.weapon_mastery_progression ?? [],
    weaponProficiencies: characterClass.weaponProficiencies,
    weaponProficienciesSpecial: characterClass.weaponProficienciesSpecial,
  };
}
