import { collectEnglishDice, SpellFacts, SpellSchoolCode } from "./spell-facts";
import { stripMarkup } from "./markup";
import { collectStringsDeep, SourceSpell } from "./schema";

const SCHOOL_CODES: ReadonlySet<string> = new Set(["A", "C", "D", "E", "V", "I", "N", "T"]);

/// Форми області, які 5etools задає замість дальності. `emanation` — форма 2024; без неї
/// 23 записи мовчки читалися як звичайна дальність «N feet» і давали фальшиві розбіжності.
const AREA_RANGE_TYPES: ReadonlySet<string> = new Set([
  "cone",
  "cube",
  "emanation",
  "hemisphere",
  "line",
  "radius",
  "sphere",
]);

const POINT_DISTANCE_TYPES: ReadonlySet<string> = new Set([
  "touch",
  "self",
  "sight",
  "unlimited",
  "feet",
  "miles",
]);

export function readFactsFromSource(
  spell: SourceSpell,
  classes: string[],
  where: string
): SpellFacts {
  const record = readSpellObject(spell, where);

  return {
    level: spell.level,
    school: readSchoolCode(spell.school, where),
    castingTime: readCastingTime(record.time, where),
    range: readRange(record.range, where),
    components: readComponents(record.components),
    duration: readDuration(record.duration, where),
    concentration: hasConcentration(record.duration),
    ritual: hasRitual(record.meta),
    classes: [...classes].sort(),
    dice: collectEnglishDice(collectSpellText(record)),
  };
}

function readSpellObject(spell: SourceSpell, where: string): Record<string, unknown> {
  if (spell.raw === null || typeof spell.raw !== "object" || Array.isArray(spell.raw)) {
    throw new Error(`${where}: запис заклинання не обʼєкт`);
  }
  return spell.raw as Record<string, unknown>;
}

function readSchoolCode(school: string, where: string): SpellSchoolCode {
  if (SCHOOL_CODES.has(school)) return school as SpellSchoolCode;
  throw new Error(`${where}: невідомий код школи «${school}»`);
}

function readCastingTime(value: unknown, where: string): string {
  const entries = readList(value, `${where} › time`);

  return entries
    .map((entry) => {
      const option = readObject(entry, `${where} › time`);
      const number = option.number;
      const unit = option.unit;
      if (typeof number !== "number" || typeof unit !== "string") {
        throw new Error(`${where}: не розібрано time`);
      }
      return `${number} ${unit}`;
    })
    .join(" or ");
}

function readRange(value: unknown, where: string): string {
  const range = readObject(value, `${where} › range`);
  const type = range.type;
  if (typeof type !== "string") throw new Error(`${where}: range без типу`);

  if (type === "special") return "special";

  const distance = range.distance;
  if (distance === undefined) throw new Error(`${where}: range «${type}» без distance`);

  const measure = readObject(distance, `${where} › range.distance`);
  const measureType = measure.type;
  if (typeof measureType !== "string") throw new Error(`${where}: distance без типу`);

  if (AREA_RANGE_TYPES.has(type)) {
    const amount = measure.amount;
    if (typeof amount !== "number") throw new Error(`${where}: область без розміру`);
    return `self (${amount}-${measureType === "miles" ? "mile" : "foot"} ${type})`;
  }

  if (type !== "point") throw new Error(`${where}: невідомий тип range «${type}»`);
  if (!POINT_DISTANCE_TYPES.has(measureType)) {
    throw new Error(`${where}: невідомий тип відстані «${measureType}»`);
  }

  if (measureType === "feet" || measureType === "miles") {
    const amount = measure.amount;
    if (typeof amount !== "number") throw new Error(`${where}: дальність без числа`);
    return `${amount} ${measureType}`;
  }

  return measureType;
}

function readComponents(value: unknown): string {
  if (value === undefined) return "";
  const components = readObject(value, "components");

  return [
    components.v === true && "V",
    components.s === true && "S",
    components.m !== undefined && "M",
  ]
    .filter((letter): letter is string => letter !== false)
    .join("");
}

function readDuration(value: unknown, where: string): string {
  const first = readObject(readList(value, `${where} › duration`)[0], `${where} › duration[0]`);
  const type = first.type;

  if (type === "instant") return "instant";
  if (type === "special") return "special";
  if (type === "permanent") return readPermanentDuration(first.ends);

  if (type !== "timed") throw new Error(`${where}: невідомий тип тривалості «${String(type)}»`);

  const timed = readObject(first.duration, `${where} › duration[0].duration`);
  const amount = timed.amount;
  const unit = timed.type;
  if (typeof amount !== "number" || typeof unit !== "string") {
    throw new Error(`${where}: не розібрано тривалість`);
  }

  return `${first.concentration === true ? "concentration, up to " : ""}${amount} ${unit}`;
}

function readPermanentDuration(ends: unknown): string {
  const reasons = Array.isArray(ends) ? ends.map(String) : [];
  return reasons.includes("trigger") ? "until dispelled or triggered" : "until dispelled";
}

function hasConcentration(value: unknown): boolean {
  const entries = Array.isArray(value) ? value : [];
  const first = entries[0];
  if (first === null || typeof first !== "object") return false;
  return (first as { concentration?: unknown }).concentration === true;
}

function hasRitual(meta: unknown): boolean {
  if (meta === null || typeof meta !== "object") return false;
  return (meta as { ritual?: unknown }).ritual === true;
}

/// Кубики шукаємо в тексті заклинання й у підвищенні за рівнем, але не в назві чи джерелі —
/// звідти прилітають хибні збіги на кшталт «d» у слові.
/// Розмітку треба розкласти **до** збору кубиків: `{@scaledamage 2d8|4-9|1d10}` показує 1d10,
/// а 2d8 — база, яку 5etools подекуди лишив від редакції 2014 (`Ice Storm`: у XPHB базові
/// ушкодження 2d10). Із сирого рядка звірка вимагала б від перекладу кубика, якого в правилі
/// немає, — той самий клас дефекту джерела, що й `1d20` зі статблоків.
function collectSpellText(record: Record<string, unknown>): string {
  return [record.entries, record.entriesHigherLevel, record.scalingLevelDice]
    .flatMap((field) => collectStringsDeep(field))
    .map((line) => stripMarkup(line, "spell"))
    .join(" ");
}

function readList(value: unknown, where: string): unknown[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${where}: порожній масив`);
  return value;
}

function readObject(value: unknown, where: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${where}: очікували обʼєкт`);
  }
  return value as Record<string, unknown>;
}
