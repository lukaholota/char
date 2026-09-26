// O45, BH-005: мисливець за кровʼю з Ордену нечестивої душі й чорнокнижник мають ОДИН пул замовлянь —
// за таблицею чорнокнижника на рівні «чорнокнижник + ⌊мисливець / 3⌋» (той самий рівень, що дає слоти
// пакту в src/rules/spellcasting.ts). Відомі заклинання кожен клас рахує за своєю таблицею.

import { PROFANE_SOUL_KNOWLEDGE, SPELL_KNOWLEDGE_2014 } from "./spell-knowledge-2014";

export type PactPoolClassLevel = { className: string; classLevel: number; subclassName: string | null };

const PACT_SUBCLASS = "ORDER_OF_THE_PROFANE_SOUL";
const WARLOCK_CANTRIPS = SPELL_KNOWLEDGE_2014.WARLOCK_2014.cantrips;

/** Скільки замовлянь разом мають чорнокнижник і орден; `null` — персонаж не має обох, і пулу немає. */
export function findPooledPactCantrips(classLevels: readonly PactPoolClassLevel[]): number | null {
  const warlock = classLevels.find((entry) => isWarlock(entry.className));
  const profaneSoul = classLevels.find((entry) => entry.subclassName === PACT_SUBCLASS);
  if (!warlock || !profaneSoul) return null;

  const pactLevel = Math.min(20, warlock.classLevel + Math.floor(profaneSoul.classLevel / 3));
  return WARLOCK_CANTRIPS[pactLevel - 1];
}

export type PactCantripPool = { total: number; totalBefore: number; ownedByPartner: number };

/**
 * Пул для класу, що зараз підвищується: разом замовлянь після рівня й до нього (до — з того, що
 * персонаж мав без цього рівня, зокрема коли пулу ще не було) і скільки з них уже тримає інший клас пулу.
 */
export function findPactCantripPool(input: {
  leveling: PactPoolClassLevel;
  otherClassLevels: readonly PactPoolClassLevel[];
  ownedCantripsByClass: Readonly<Record<string, number>>;
}): PactCantripPool | null {
  if (!isPactCantripPoolClass(input.leveling.className, input.leveling.subclassName)) return null;
  const after = [...input.otherClassLevels, input.leveling];
  const total = findPooledPactCantrips(after);
  if (total === null) return null;

  const before = [...input.otherClassLevels, { ...input.leveling, classLevel: input.leveling.classLevel - 1 }].filter((entry) => entry.classLevel > 0);
  const partner = input.otherClassLevels.find((entry) => isPactCantripPoolClass(entry.className, entry.subclassName));
  return {
    total,
    totalBefore: findPactCantripTotal(before),
    ownedByPartner: partner ? (input.ownedCantripsByClass[partner.className] ?? 0) : 0,
  };
}

function findPactCantripTotal(classLevels: readonly PactPoolClassLevel[]): number {
  const pooled = findPooledPactCantrips(classLevels);
  if (pooled !== null) return pooled;
  return classLevels.reduce((sum, entry) => sum + findOwnPactCantrips(entry), 0);
}

function findOwnPactCantrips(entry: PactPoolClassLevel): number {
  if (isWarlock(entry.className)) return WARLOCK_CANTRIPS[entry.classLevel - 1];
  return entry.subclassName === PACT_SUBCLASS ? PROFANE_SOUL_KNOWLEDGE.cantrips[entry.classLevel - 1] : 0;
}

/** Частка класу в пулі на листі: чорнокнижник — своя таблиця, орден — решта пулу. */
export function findPooledPactCantripShare(classLevels: readonly PactPoolClassLevel[], className: string): number | null {
  const pooled = findPooledPactCantrips(classLevels);
  if (pooled === null) return null;

  const warlock = classLevels.find((entry) => isWarlock(entry.className))!;
  const warlockCantrips = WARLOCK_CANTRIPS[warlock.classLevel - 1];
  return isWarlock(className) ? warlockCantrips : Math.max(0, pooled - warlockCantrips);
}

export function isPactCantripPoolClass(className: string, subclassName: string | null): boolean {
  return isWarlock(className) || subclassName === PACT_SUBCLASS;
}

function isWarlock(className: string): boolean {
  return className === "WARLOCK_2014" || className === "WARLOCK_2024";
}
