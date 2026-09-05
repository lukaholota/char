import { readFileSync } from "node:fs";
import { join } from "node:path";
import { findSentence } from "./sentence";

/// Знято 2026-08-23, ратифіковано Р21: канон — «променева шкода», прикметник «променевий».
/// Перелік — це сім написань, які корпус реально вживав, а не доказ відсутності восьмого:
/// інструментал «Світлом» і «шкоди світлом», зворотний порядок «світлом ушкоджень», предикат
/// «шкода не є світлом», перелік типів «…, світлом чи громова», транслітерація «радіантн-»,
/// синоніми «сяйна шкода» / «шкода сяйвом» і калька «урон випромінюванням».
/// Мале «світлом» скрізь іде з якорем на слово шкоди: без якоря довелося б зробити нечутливим
/// до регістру все правило, і гейт ловив би «яскравим світлом».
export const RETIRED_RADIANT =
  /Світлом|шкод[а-яіїєґ]*\s+світлом|світлом\s+ушкодж[а-яіїєґ]*|шкода не є світлом|[,;]\s+світлом\s+(?:чи|або|та|і)\b|[Пп]роменист[а-яіїєґ]*|[Рр]адіантн[а-яіїєґ]*|сяйн[а-яіїєґ]*\s+шкод[а-яіїєґ]*|шкод[а-яіїєґ]*\s+сяйвом|(?:урон|шкод)[а-яіїєґ]*\s+випромінюванн[а-яіїєґ]*/gu;

/// Механічні поля статблока малюються списком термінів, не прозою: у них гейт
/// bestiary-2024-import звіряє кожен елемент зі словником, тому їхня правка атомарна
/// зі звуженням `damageTypes.radiant`. Решта полів — проза, її можна вести партіями.
const STATBLOCK_FIELDS = new Set([
  "damageImmunity",
  "damageResistance",
  "damageVulnerability",
]);

export type RadiantOccurrence = {
  carrier: string;
  record: string;
  field: string;
  isStatblockField: boolean;
  form: string;
  sentence: string;
};

/// Носії двох родів. Файли-джерела правляться руками ([Р33](../../docs/DECISIONS.md#р33));
/// генеровані каталоги дзеркалять базу, тож червоніють, поки прод-сід не прогнано.
const CARRIERS = [
  "src/lib/generated/creatures.json",
  "src/lib/generated/creatures2024.json",
  "src/lib/generated/classes.json",
  "src/lib/generated/magicItems.json",
  "src/lib/generated/spells.json",
  "src/lib/generated/infusions.json",
  "src/lib/generated/rules-2024.json",
  "data/2024/normalized/spells.json",
  "data/2024/normalized/magic-items.json",
  "data/2024/normalized/invocations.json",
  "data/2024/normalized/feats.json",
  "data/2024/normalized/species.json",
  "src/lib/generated/races.json",
  "src/lib/generated/creator-content-2014.json",
  "src/lib/generated/creator-content-2024.json",
  "prisma/seed/magic-items/baseline.json",
  "prisma/seed/subclassFeatureSeed.ts",
  "scripts/data/monsters-fizban.ts",
  "scripts/data/monsters-volo.ts",
] as const;

export function findRadiantOccurrences(): RadiantOccurrence[] {
  return CARRIERS.flatMap(readCarrier);
}

export function countRadiantByCarrier(): Record<string, number> {
  const counted: Record<string, number> = {};
  for (const carrier of CARRIERS) counted[carrier] = readCarrier(carrier).length;
  return counted;
}

function readCarrier(carrier: string): RadiantOccurrence[] {
  const raw = readFileSync(join(process.cwd(), carrier), "utf-8");
  if (!carrier.endsWith(".json")) return collectFromSource(raw, carrier);

  const found: RadiantOccurrence[] = [];
  collectFromNode(JSON.parse(raw) as unknown, carrier, "?", "", found);
  return found;
}

/// Сідові модулі й успадковані статблоки лежать у .ts, розібрати їх як JSON не можна —
/// але текст у них той самий, що поїде в базу, тож гейт читає їх рядками.
function collectFromSource(raw: string, carrier: string): RadiantOccurrence[] {
  const found: RadiantOccurrence[] = [];
  raw.split("\n").forEach((line, index) => {
    for (const form of line.match(RETIRED_RADIANT) ?? []) {
      found.push({
        carrier,
        record: `рядок ${index + 1}`,
        field: "",
        isStatblockField: false,
        form,
        sentence: findSentence(line, form),
      });
    }
  });
  return found;
}

function collectFromNode(
  node: unknown,
  carrier: string,
  record: string,
  field: string,
  found: RadiantOccurrence[]
): void {
  if (typeof node === "string") {
    for (const form of node.match(RETIRED_RADIANT) ?? []) {
      found.push({
        carrier,
        record,
        field,
        isStatblockField: STATBLOCK_FIELDS.has(field),
        form,
        sentence: findSentence(node, form),
      });
    }
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) collectFromNode(item, carrier, record, field, found);
    return;
  }

  if (node === null || typeof node !== "object") return;

  const entries = node as Record<string, unknown>;
  const named = readRecordName(entries) ?? record;
  for (const [key, value] of Object.entries(entries)) {
    collectFromNode(value, carrier, named, key, found);
  }
}

function readRecordName(entries: Record<string, unknown>): string | undefined {
  for (const key of ["name", "engName", "title"]) {
    const value = entries[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}
