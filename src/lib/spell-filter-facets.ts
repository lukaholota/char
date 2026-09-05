/// Грані фільтра заклинань, яких у базі немає окремими полями: компоненти, дистанція і
/// тривалість лежать вільним текстом («В, С, М (жива блоха)», «На себе (радіус 15 футів)»,
/// «Концентрація, до 1 хвилини»). Тут вони зводяться до кількох кошиків, за якими можна фільтрувати.

export type SpellComponent = "V" | "S" | "M";

export const SPELL_COMPONENT_LABELS: Record<SpellComponent, string> = {
  V: "Вербальний (В)",
  S: "Соматичний (С)",
  M: "Матеріальний (М)",
};

export const SPELL_RANGE_BUCKETS = [
  "На себе",
  "Дотик",
  "До 30 футів",
  "60 футів",
  "90–150 футів",
  "300 футів і далі",
  "Особлива",
] as const;

export type SpellRangeBucket = (typeof SPELL_RANGE_BUCKETS)[number];

export const SPELL_DURATION_BUCKETS = [
  "Миттєво",
  "До 1 хвилини",
  "До 10 хвилин",
  "До 1 години",
  "До 8 годин",
  "Добу й довше",
  "Доки не розвіють",
  "Особлива",
] as const;

export type SpellDurationBucket = (typeof SPELL_DURATION_BUCKETS)[number];

export function findSpellComponents(components: string | null | undefined): Set<SpellComponent> {
  const head = (components ?? "").split("(")[0];
  const found = new Set<SpellComponent>();
  for (const token of head.split(/[,\s]+/)) {
    const letter = token.trim().toUpperCase();
    if (letter === "В" || letter === "V") found.add("V");
    if (letter === "С" || letter === "S") found.add("S");
    if (letter === "М" || letter === "M") found.add("M");
  }
  return found;
}

export function findSpellRangeBucket(range: string | null | undefined): SpellRangeBucket {
  const text = (range ?? "").trim().toLowerCase();
  if (!text) return "Особлива";
  if (text.startsWith("на себе")) return "На себе";
  if (text.startsWith("дотик")) return "Дотик";

  const feet = findLeadingFeet(text);
  if (feet === null) {
    return text.includes("мил") ? "300 футів і далі" : "Особлива";
  }
  if (feet <= 30) return "До 30 футів";
  if (feet <= 60) return "60 футів";
  if (feet <= 150) return "90–150 футів";
  return "300 футів і далі";
}

export function findSpellDurationBucket(duration: string | null | undefined): SpellDurationBucket {
  const text = (duration ?? "").trim().toLowerCase();
  if (!text) return "Особлива";
  if (text.startsWith("миттєв")) return "Миттєво";
  if (text.includes("розві") || text.includes("розсі")) return "Доки не розвіють";

  const minutes = findDurationMinutes(text);
  if (minutes === null) return "Особлива";
  if (minutes <= 1) return "До 1 хвилини";
  if (minutes <= 10) return "До 10 хвилин";
  if (minutes <= 60) return "До 1 години";
  if (minutes <= 8 * 60) return "До 8 годин";
  return "Добу й довше";
}

function findLeadingFeet(text: string): number | null {
  const match = text.match(/^(\d+)\s*фут/);
  return match ? Number(match[1]) : null;
}

function findDurationMinutes(text: string): number | null {
  const match = text.match(/(\d+)\s*(раунд|хвилин|годин|д(?:ень|ні|нів)|доб)/);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2];
  if (unit.startsWith("раунд")) return amount * 0.1;
  if (unit.startsWith("хвилин")) return amount;
  if (unit.startsWith("годин")) return amount * 60;
  return amount * 24 * 60;
}
