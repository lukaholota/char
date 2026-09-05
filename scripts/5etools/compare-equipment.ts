/**
 * KR16.5 — суцільна звірка каталогів спорядження з `items-base.json` пінутої ревізії.
 *
 *   npx tsx scripts/5etools/compare-equipment.ts
 *
 * Звіряються чотири каталоги (обладунок і зброя, по дві редакції) та вміст наборів
 * спорядження. Ліва сторона — те, що бачить сторінка каталогу: `armorData`, `weaponsData`
 * і перелік із сіду наборів. Права — корпус. Проміжного шару, який рухав би обидві сторони
 * разом, між ними немає — це і є вся цінність звірки.
 *
 * Скрипт нічого не пише в базу й нічого не виправляє: він друкує звіт і кладе його в
 * `data/5etools/divergence-equipment.md`.
 */

import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";

import { EquipmentPackCategory, Ruleset } from "@prisma/client";

import { getAllArmors, ArmorData } from "../../src/lib/armorData";
import { getAllWeapons, WeaponData } from "../../src/lib/weaponsData";
import { EQUIPMENT_PACKS_2014 } from "../../prisma/seed/equipmentPackSeed";
import { readBaseItems, readItems, readPackContents, SourceBaseItem } from "./schema";
import {
  ARMOR_NAME_IN_SOURCE,
  ARMOR_ROWS_OUTSIDE_THE_BOOK,
  ARMOR_SOURCE_BOOK,
  ARMOR_TYPE_BY_TYPE_CODE,
  DAMAGE_TYPE_BY_CODE,
  PACK_IN_SOURCE,
  PACK_ITEM_KEY_BY_NAME,
  SOURCE_FIELD_DEFECTS,
  WEAPON_IN_SOURCE,
  WEAPON_PROPERTY_BY_CODE,
  WEAPON_ROWS_OUTSIDE_THE_BOOK,
} from "./equipment-registry";

const REPORT_PATH = join(process.cwd(), "data/5etools/divergence-equipment.md");

export type EquipmentDivergence = {
  catalog: string;
  row: string;
  field: string;
  ours: string;
  inSource: string;
};

export type EquipmentComparison = {
  divergences: EquipmentDivergence[];
  checkedRows: number;
  rowsOutsideTheBook: string[];
};

export function compareEquipment(): EquipmentComparison {
  const parts = [compareArmor(), compareWeapons(), comparePacks()];

  return {
    divergences: parts.flatMap((part) => part.divergences),
    checkedRows: parts.reduce((total, part) => total + part.checkedRows, 0),
    rowsOutsideTheBook: parts.flatMap((part) => part.rowsOutsideTheBook),
  };
}

// ── обладунок ────────────────────────────────────────────────────────────────

export function compareArmor(): EquipmentComparison {
  const divergences: EquipmentDivergence[] = [];
  const rowsOutsideTheBook: string[] = [];
  let checkedRows = 0;

  for (const ruleset of ["RULES_2014", "RULES_2024"] as const) {
    const catalog = `Обладунок ${labelOf(ruleset)}`;
    const book = ARMOR_SOURCE_BOOK[ruleset];
    const inBook = indexByName(readBaseItems().filter((item) => item.source === book));

    for (const armor of getAllArmors(ruleset)) {
      const reason = ARMOR_ROWS_OUTSIDE_THE_BOOK[armor.code];
      if (reason !== undefined) {
        rowsOutsideTheBook.push(`${catalog} · ${armor.code} — ${reason}`);
        continue;
      }

      const nameInSource = ARMOR_NAME_IN_SOURCE[armor.code] ?? armor.engName;
      const found = inBook.get(nameInSource);
      if (found === undefined) {
        divergences.push(report(catalog, armor.code, "рядок", nameInSource, `немає в ${book}`));
        continue;
      }

      checkedRows += 1;
      divergences.push(...compareArmorRow(catalog, armor, found));
    }
  }

  return { divergences, checkedRows, rowsOutsideTheBook };
}

function compareArmorRow(
  catalog: string,
  armor: ArmorData,
  source: SourceBaseItem
): EquipmentDivergence[] {
  const row = `${armor.code} / ${armor.engName}`;

  return [
    match(catalog, row, "armorType", armor.armorType, ARMOR_TYPE_BY_TYPE_CODE[source.typeCode]),
    match(catalog, row, "baseAC", armor.baseAC, source.armorClass),
    match(catalog, row, "strengthReq", armor.strengthReq, source.strengthRequirement),
    match(catalog, row, "stealthDisadvantage", armor.stealthDisadvantage, source.hasStealthDisadvantage),
    match(catalog, row, "weight", findPounds(armor.weight), source.weightPounds),
    match(catalog, row, "cost", findCopper(armor.cost), source.valueCopper),
  ].filter(isDivergence);
}

// ── зброя ────────────────────────────────────────────────────────────────────

export function compareWeapons(): EquipmentComparison {
  const divergences: EquipmentDivergence[] = [];
  const rowsOutsideTheBook: string[] = [];
  let checkedRows = 0;
  const base = readBaseItems();

  for (const ruleset of ["RULES_2014", "RULES_2024"] as const) {
    const catalog = `Зброя ${labelOf(ruleset)}`;
    const defaultBook = ruleset === "RULES_2014" ? "PHB" : "XPHB";

    for (const weapon of getAllWeapons(ruleset)) {
      const reason = WEAPON_ROWS_OUTSIDE_THE_BOOK[weapon.code];
      if (reason !== undefined) {
        rowsOutsideTheBook.push(`${catalog} · ${weapon.code} — ${reason}`);
        continue;
      }

      const bridge = WEAPON_IN_SOURCE[weapon.code as keyof typeof WEAPON_IN_SOURCE];
      const nameInSource = bridge?.name ?? weapon.engName;
      const book = ruleset === "RULES_2014" ? (bridge?.book ?? defaultBook) : defaultBook;
      const found = base.find((item) => item.source === book && item.nameEng === nameInSource);

      if (found === undefined) {
        divergences.push(report(catalog, weapon.code, "рядок", nameInSource, `немає в ${book}`));
        continue;
      }

      checkedRows += 1;
      divergences.push(...compareWeaponRow(catalog, weapon, found, ruleset));
    }
  }

  return { divergences, checkedRows, rowsOutsideTheBook };
}

function compareWeaponRow(
  catalog: string,
  weapon: WeaponData,
  source: SourceBaseItem,
  ruleset: Ruleset
): EquipmentDivergence[] {
  const row = `${weapon.code} / ${weapon.engName}`;

  const checks = [
    match(catalog, row, "damage", findDiceInLatin(weapon.damage), source.damage ?? "0"),
    match(catalog, row, "damageType", weapon.damageType, findDamageType(source, weapon.damageType)),
    match(catalog, row, "weaponType", weapon.weaponType, findWeaponType(source)),
    match(catalog, row, "properties", findPropertyLine(weapon.properties), findSourcePropertyLine(source)),
    match(catalog, row, "versatileDamage", findDiceInLatin(weapon.versatileDamage), source.versatileDamage),
    match(catalog, row, "normalRange", weapon.normalRange, source.rangeNormal),
    match(catalog, row, "longRange", weapon.longRange, source.rangeLong),
    match(catalog, row, "isRanged", weapon.isRanged, source.typeCode === "R"),
  ];

  /// Майстерність, вага й ціна є тільки в каталозі 2024: у таблиці `weapon` під них
  /// колонок немає, і каталог 2014 віддає `null`. Порівнювати їх для 2014 означало б
  /// зробити червоною відому прогалину, а не знайти розбіжність.
  if (ruleset === "RULES_2024") {
    checks.push(
      match(catalog, row, "mastery", weapon.mastery ?? null, source.masteryNames[0]?.toUpperCase() ?? null),
      match(catalog, row, "weight", findPounds(weapon.weight), source.weightPounds),
      match(catalog, row, "cost", findCopper(weapon.cost), source.valueCopper)
    );
  }

  return checks.filter(isDivergence);
}

/// Сітка шкоди не завдає, і в книзі типу шкоди в неї немає. Колонка `damage_type` у таблиці
/// `weapon` не nullable, тому каталог тримає заглушку — це форма схеми, а не розбіжність
/// із книгою, і червоніти на ній нема чого.
function findDamageType(source: SourceBaseItem, ours: string): string | null {
  if (source.damageTypeCode === null && source.damage === null) return ours;
  if (source.damageTypeCode === null) return null;

  const known = DAMAGE_TYPE_BY_CODE[source.damageTypeCode];
  if (known === undefined) {
    throw new Error(`${source.nameEng} (${source.source}): невідомий код шкоди «${source.damageTypeCode}»`);
  }
  return known;
}

/// `FIREARMS` — наш власний третій тип зброї, якого в корпусі немає: там усе лишається
/// простою або бойовою. Межа проходить по `age`, а не по прапорцю `firearm`: позначку епохи
/// несе саме десятка з розділу «Firearms» у DMG, тоді як мушкет і пістоль XPHB її не мають —
/// 2024 звела їх у звичайну бойову дальню зброю, і наш каталог 2024 каже те саме.
function findWeaponType(source: SourceBaseItem): string {
  if (source.ageCategory !== null) return "FIREARMS";
  return source.weaponCategory === "simple" ? "SIMPLE_WEAPON" : "MARTIAL_WEAPON";
}

function findSourcePropertyLine(source: SourceBaseItem): string {
  return findPropertyLine(
    source.propertyCodes.map((code) => {
      const known = WEAPON_PROPERTY_BY_CODE[code];
      if (known === undefined) {
        throw new Error(`${source.nameEng} (${source.source}): невідома властивість «${code}»`);
      }
      return known;
    })
  );
}

function findPropertyLine(properties: readonly (string | null)[]): string {
  return [...new Set(properties.filter((value): value is string => value !== null))].sort().join(", ");
}

// ── набори спорядження ───────────────────────────────────────────────────────

export function comparePacks(): EquipmentComparison {
  const divergences: EquipmentDivergence[] = [];
  const rowsOutsideTheBook: string[] = [];
  let checkedRows = 0;

  const catalog = "Набори спорядження 2014";
  const sourceItems = readItems();
  const baseKeys = new Set(readBaseItems().map(findItemKey));
  const itemKeys = new Set([...sourceItems.map(findItemKey), ...baseKeys]);

  for (const pack of EQUIPMENT_PACKS_2014) {
    const name = pack.name as EquipmentPackCategory;
    const bridge = PACK_IN_SOURCE[name];

    if (bridge === null) {
      rowsOutsideTheBook.push(`${catalog} · ${name} — власний набір користувача, у книзі його немає`);
      continue;
    }

    const ours = readOurPackContents(pack.items, `${catalog} · ${name}`);
    checkedRows += 1;

    if (!bridge.isPack) {
      divergences.push(...compareSingleItemPack(catalog, name, ours, bridge, itemKeys));
      continue;
    }

    const found = sourceItems.find(
      (item) => item.nameEng === bridge.name && item.source === bridge.book
    );
    if (found === undefined) {
      divergences.push(report(catalog, name, "рядок", bridge.name, `немає в ${bridge.book}`));
      continue;
    }

    divergences.push(...comparePackContents(catalog, name, ours, readPackContents(found)));
  }

  return { divergences, checkedRows, rowsOutsideTheBook };
}

type OurPackItem = { name: string; quantity: number };

function readOurPackContents(items: unknown, where: string): OurPackItem[] {
  if (!Array.isArray(items)) throw new Error(`${where}: вміст набору не масив`);

  return items.map((item, index) => {
    if (item === null || typeof item !== "object") {
      throw new Error(`${where}[${index}]: рядок набору не обʼєкт`);
    }
    const record = item as Record<string, unknown>;
    if (typeof record.name !== "string" || typeof record.quantity !== "number") {
      throw new Error(`${where}[${index}]: рядок набору без назви або кількості`);
    }
    return { name: record.name, quantity: record.quantity };
  });
}

function compareSingleItemPack(
  catalog: string,
  name: EquipmentPackCategory,
  ours: OurPackItem[],
  bridge: { name: string; book: string },
  itemKeys: ReadonlySet<string>
): EquipmentDivergence[] {
  const expected = `${bridge.name.toLowerCase()}|${bridge.book.toLowerCase()}`;
  if (!itemKeys.has(expected)) {
    return [report(catalog, name, "рядок", expected, `немає в ${bridge.book}`)];
  }

  const line = ours[0];
  const key = line === undefined ? null : findKeyOfOurItem(line.name, `${catalog} · ${name}`);

  return [
    match(catalog, name, "кількість рядків", ours.length, 1),
    match(catalog, name, "предмет", key, expected),
    match(catalog, name, "кількість", line?.quantity ?? null, 1),
  ].filter(isDivergence);
}

function comparePackContents(
  catalog: string,
  name: EquipmentPackCategory,
  ours: OurPackItem[],
  inSource: ReturnType<typeof readPackContents>
): EquipmentDivergence[] {
  const divergences: EquipmentDivergence[] = [];

  const ourQuantities = new Map<string, number>();
  for (const item of ours) {
    const key = findKeyOfOurItem(item.name, `${catalog} · ${name}`);
    ourQuantities.set(key, (ourQuantities.get(key) ?? 0) + item.quantity);
  }

  const sourceQuantities = new Map<string, number>();
  for (const entry of inSource) {
    const key = entry.itemKey === null ? `special:${entry.specialText}` : entry.itemKey;
    sourceQuantities.set(key.toLowerCase(), (sourceQuantities.get(key.toLowerCase()) ?? 0) + entry.quantity);
  }

  for (const key of new Set([...ourQuantities.keys(), ...sourceQuantities.keys()])) {
    const ourQuantity = ourQuantities.get(key) ?? 0;
    const sourceQuantity = applyKnownSourceDefect(name, key, sourceQuantities.get(key) ?? 0);
    if (ourQuantity === sourceQuantity) continue;

    divergences.push(report(catalog, `${name} · ${key}`, "кількість", ourQuantity, sourceQuantity));
  }

  return divergences;
}

/// Місця, де машинне поле корпусу біднiше за його ж прозу. Виняток застосовується тільки
/// тоді, коли корпус і далі каже те, що записано, — інакше замовчана правка джерела
/// пережила б зміну ревізії непоміченою.
function applyKnownSourceDefect(
  pack: EquipmentPackCategory,
  itemKey: string,
  sourceQuantity: number
): number {
  const defect = SOURCE_FIELD_DEFECTS.find(
    (known) => known.pack === pack && known.itemKey === itemKey
  );
  if (defect === undefined || defect.sourceQuantity !== sourceQuantity) return sourceQuantity;

  return defect.ourQuantity;
}

function findKeyOfOurItem(name: string, where: string): string {
  const key = PACK_ITEM_KEY_BY_NAME[name.trim()];
  if (key === undefined) {
    throw new Error(`${where}: «${name}» не має відповідника в PACK_ITEM_KEY_BY_NAME`);
  }
  return key;
}

// ── спільне ──────────────────────────────────────────────────────────────────

function findItemKey(item: { nameEng: string; source: string }): string {
  return `${item.nameEng.toLowerCase()}|${item.source.toLowerCase()}`;
}

function indexByName(items: SourceBaseItem[]): Map<string, SourceBaseItem> {
  const index = new Map<string, SourceBaseItem>();
  for (const item of items) if (!index.has(item.nameEng)) index.set(item.nameEng, item);
  return index;
}

function labelOf(ruleset: Ruleset): string {
  return ruleset === "RULES_2024" ? "2024" : "2014";
}

/// Кубик у каталозі 2014 записаний кирилицею — «1к8». Корпус пише «1d8». Порівнюємо
/// значення, а не абетку, тому одна сторона переводиться в іншу перед звіркою.
function findDiceInLatin(dice: string | null | undefined): string | null {
  if (!dice) return null;
  return dice.replace(/к/g, "d");
}

/// Ціна в корпусі — мідяки одним числом; у каталозі — рядок «5 GP» або «5 зм».
function findCopper(cost: string | null | undefined): number | null {
  if (!cost) return null;

  const match = /^([\d.,]+)\s*(gp|sp|cp|ep|pp|зм|см|мм|ем|пм)$/i.exec(cost.trim());
  if (match === null) return null;

  const inCopper: Record<string, number> = {
    cp: 1, sp: 10, ep: 50, gp: 100, pp: 1000,
    мм: 1, см: 10, ем: 50, зм: 100, пм: 1000,
  };
  return Number(match[1].replace(/,/g, "")) * inCopper[match[2].toLowerCase()];
}

/// Вага в корпусі — фунти числом; у каталозі — «8 lb.» або «8 фнт.». Дріб («1/4 фнт.»)
/// у спорядженні трапляється й має читатися, а не мовчки давати `null`.
function findPounds(weight: string | null | undefined): number | null {
  if (!weight) return null;

  const match = /^([\d.,]+)(?:\s*\/\s*([\d.,]+))?\s*(lb\.?|фнт\.?)$/i.exec(weight.trim());
  if (match === null) return null;

  const value = Number(match[1].replace(/,/g, ""));
  return match[2] === undefined ? value : value / Number(match[2].replace(/,/g, ""));
}

function match(
  catalog: string,
  row: string,
  field: string,
  ours: unknown,
  inSource: unknown
): EquipmentDivergence | null {
  if (String(ours ?? "—") === String(inSource ?? "—")) return null;
  return report(catalog, row, field, ours, inSource);
}

function report(
  catalog: string,
  row: string,
  field: string,
  ours: unknown,
  inSource: unknown
): EquipmentDivergence {
  return {
    catalog,
    row,
    field,
    ours: String(ours ?? "—"),
    inSource: String(inSource ?? "—"),
  };
}

function isDivergence(value: EquipmentDivergence | null): value is EquipmentDivergence {
  return value !== null;
}

// ── звіт ─────────────────────────────────────────────────────────────────────

function buildReport(comparison: EquipmentComparison): string {
  const lines = [
    "# Звірка каталогів спорядження з `items-base.json`",
    "",
    "Згенеровано `npx tsx scripts/5etools/compare-equipment.ts`. Не редагувати руками.",
    "",
    `- Звірено рядків: **${comparison.checkedRows}**`,
    `- Розбіжностей: **${comparison.divergences.length}**`,
    `- Рядків поза книгою: **${comparison.rowsOutsideTheBook.length}**`,
    "",
  ];

  if (comparison.divergences.length === 0) {
    lines.push("## Розбіжності", "", "Немає.", "");
  } else {
    lines.push("## Розбіжності", "", "| Каталог | Рядок | Поле | У нас | У книзі |", "|---|---|---|---|---|");
    for (const item of comparison.divergences) {
      lines.push(`| ${item.catalog} | ${item.row} | ${item.field} | ${item.ours} | ${item.inSource} |`);
    }
    lines.push("");
  }

  lines.push("## Рядки поза книгою", "");
  for (const row of comparison.rowsOutsideTheBook) lines.push(`- ${row}`);
  lines.push("");

  return lines.join("\n");
}

function main(): void {
  const comparison = compareEquipment();
  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, buildReport(comparison), "utf-8");

  console.log(`Звірено рядків: ${comparison.checkedRows}`);
  console.log(`Розбіжностей: ${comparison.divergences.length}`);
  console.log(`Рядків поза книгою: ${comparison.rowsOutsideTheBook.length}`);
  for (const item of comparison.divergences) {
    console.log(`  ${item.catalog} · ${item.row} · ${item.field}: ${item.ours} ≠ ${item.inSource}`);
  }
  console.log(`Звіт: ${REPORT_PATH}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
