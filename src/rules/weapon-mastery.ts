/**
 * KR18.6 — Майстерність зброї 2024.
 *
 * Джерела: SRD 5.2 «Weapon Mastery» в описі Barbarian / Fighter / Paladin / Ranger / Rogue і
 * «Mastery Properties» в Equipment. Референс: docs/o18-2024-character-parity/reference-2024.md §8.
 *
 * Ємність у персонажі не зберігається — вона щоразу виводиться з прогресії класу, тому рівень і
 * ємність не можуть розійтися. Вибрані види зброї, навпаки, живі дані персонажа: `pers_weapon_mastery`.
 */

export type MasteryClassLevel = {
  className: string;
  classLevel: number;
  masteryProgression: readonly number[];
};

export type MasteryWeapon = {
  weaponId: number;
  name: string;
  mastery: string | null;
  weaponType: string;
  isRanged: boolean;
};

/** Клас у пулі: рівень для ємності плюс сирі володіння зброєю, з яких виводиться список. */
export type MasteryClassOffer = MasteryClassLevel & {
  weaponProficiencies: unknown;
  weaponProficienciesSpecial: unknown;
};

export type WeaponProficiencyGrant = {
  weaponTypes: readonly string[];
  specificWeaponNames: readonly string[];
};

const WEAPON_TYPES = ["SIMPLE_WEAPON", "MARTIAL_WEAPON", "FIREARMS"];

/**
 * Варвар — єдиний, чия майстерність обмежена рукопашною зброєю: «Simple or Martial **Melee**
 * weapons of your choice». Решта чотирьох класів беруть будь-яку зброю, якою володіють.
 */
const MELEE_ONLY_MASTERY_CLASSES = new Set(["BARBARIAN_2024"]);

/**
 * Риса «Weapon Master» — «you can use the mastery property of one kind of Simple or Martial
 * weapon of your choice» (PHB 2024). Це окреме джерело, а не класова прогресія, тож воно
 * додається до неї, а не змагається з нею максимумом.
 */
const MASTERY_SLOT_BY_FEAT: Record<string, number> = {
  WEAPON_MASTER: 1,
};

export function countFeatMasterySlots(featNames: readonly string[]): number {
  return featNames.reduce((total, featName) => total + (MASTERY_SLOT_BY_FEAT[featName] ?? 0), 0);
}

/**
 * Мультиклас бере найбільшу ємність, а не суму: кожна фіча каже «ви можете користуватися
 * властивостями майстерності N видів зброї», і дві такі фічі не додаються одна до одної.
 * Слоти від рис лежать поверх цього максимуму.
 */
export function findWeaponMasteryCapacity(
  classes: readonly MasteryClassLevel[],
  featSlots = 0,
): number {
  const fromClasses = classes.reduce((highest, entry) => Math.max(highest, readCapacityAtLevel(entry)), 0);
  return fromClasses + featSlots;
}

/** Кличе лише конструктор, тобто 1-й рівень: риса майстерності має передумову 4-го, і сюди не дійде. */
export function hasWeaponMastery(classes: readonly MasteryClassLevel[]): boolean {
  return findWeaponMasteryCapacity(classes) > 0;
}

/** Порожня прогресія означає клас без майстерності; коротша за рівень — тримає останнє значення. */
function readCapacityAtLevel({ classLevel, masteryProgression }: MasteryClassLevel): number {
  if (classLevel < 1 || masteryProgression.length === 0) return 0;
  const index = Math.min(classLevel, masteryProgression.length) - 1;
  return masteryProgression[index] ?? 0;
}

export function findWeaponMasteryOptions<Weapon extends MasteryWeapon>(
  weapons: readonly Weapon[],
  proficiency: WeaponProficiencyGrant,
  className: string,
): Weapon[] {
  const meleeOnly = MELEE_ONLY_MASTERY_CLASSES.has(className);

  return weapons.filter((weapon) => {
    if (!weapon.mastery) return false;
    if (meleeOnly && weapon.isRanged) return false;
    return isProficientWith(weapon, proficiency);
  });
}

/**
 * Мультиклас бачить обʼєднання пулів: кожен клас із майстерністю відкриває свою зброю. Порядок —
 * той, у якому прийшов каталог, тому сортування лишається в одному місці: у запиті.
 */
export function findWeaponMasteryOptionsForClasses<Weapon extends MasteryWeapon>(
  classes: readonly MasteryClassOffer[],
  weapons: readonly Weapon[],
): Weapon[] {
  const offered = new Set<number>();

  for (const entry of classes) {
    if (entry.masteryProgression.length === 0) continue;
    const proficiency = readWeaponProficiencyGrant(entry.weaponProficiencies, entry.weaponProficienciesSpecial);
    for (const weapon of findWeaponMasteryOptions(weapons, proficiency, entry.className)) {
      offered.add(weapon.weaponId);
    }
  }

  return weapons.filter((weapon) => offered.has(weapon.weaponId));
}

function isProficientWith(weapon: MasteryWeapon, proficiency: WeaponProficiencyGrant): boolean {
  return (
    proficiency.weaponTypes.includes(weapon.weaponType) ||
    proficiency.specificWeaponNames.includes(weapon.name)
  );
}

/**
 * Санітизація вибору: клієнт може прислати дублікати, чужу зброю або більше, ніж дає клас.
 * Сервер бере лише те, що витримало всі три перевірки, у порядку, який надіслав гравець.
 */
export function limitWeaponMasteryChoice(
  selectedWeaponIds: readonly number[],
  options: readonly Pick<MasteryWeapon, "weaponId">[],
  capacity: number,
): number[] {
  const allowed = new Set(options.map((weapon) => weapon.weaponId));
  const kept: number[] = [];

  for (const weaponId of selectedWeaponIds) {
    if (kept.length >= capacity) break;
    if (!allowed.has(weaponId) || kept.includes(weaponId)) continue;
    kept.push(weaponId);
  }

  return kept;
}

/**
 * `weaponProficiencies` історично несе три форми: масив типів, масив конкретної зброї або
 * обʼєкт `{ category, type }`. Читач один на конструктор і на сервер — інакше пул, який бачить
 * гравець, розійшовся б із тим, що приймає серверна дія.
 */
export function readWeaponProficiencyGrant(
  weaponProficiencies: unknown,
  weaponProficienciesSpecial: unknown,
): WeaponProficiencyGrant {
  const named = readStringArray(readField(weaponProficienciesSpecial, "specific"));

  if (Array.isArray(weaponProficiencies)) {
    const values = readStringArray(weaponProficiencies);
    return {
      weaponTypes: values.filter((value) => WEAPON_TYPES.includes(value)),
      specificWeaponNames: [...values.filter((value) => !WEAPON_TYPES.includes(value)), ...named],
    };
  }

  return {
    weaponTypes: readStringArray(readField(weaponProficiencies, "type")),
    specificWeaponNames: [...readStringArray(readField(weaponProficiencies, "category")), ...named],
  };
}

function readField(value: unknown, field: string): unknown {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)[field]
    : undefined;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}
