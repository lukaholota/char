import { armorTranslations, equipmentCategoryTranslations, weaponTranslations } from "@/lib/refs/translation";
import { findCoinKind } from "@/rules/starting-money";

export type EquipmentPackView = {
  name: string;
  description: string;
  items: { name: string; quantity: number }[];
};

export type EquipmentOptionRow = {
  optionId: number;
  option: string;
  quantity: number;
  description?: string | null;
  item?: string | null;
  weapon?: { name: string } | null;
  armor?: { name: string } | null;
  equipmentPack?: { name: string; description?: string | null; items?: unknown } | null;
};

export type EquipmentLine = {
  key: string;
  text: string;
  pack: EquipmentPackView | null;
};

export type EquipmentLines = {
  belongings: EquipmentLine[];
  coins: EquipmentLine[];
};

/// Рядки 2014 несуть готовий `description` («4 списи (1к6), метальні»), рядки 2024 — ні:
/// сід пише туди звʼязок зі зброєю, обладунком, набором або назву предмета, а підпис збирає
/// показ. Тому джерело підпису — опис, коли він є, і звʼязок, коли його немає.
export const buildEquipmentLines = (rows: EquipmentOptionRow[]): EquipmentLines => {
  const belongings: EquipmentLine[] = [];
  const coins: EquipmentLine[] = [];

  for (const row of rows) {
    const line = toLine(row);
    if (!line.text) continue;
    if (isCoinRow(row)) coins.push(line);
    else belongings.push(line);
  }

  return { belongings, coins };
};

/// Майно походження приходить списком предметів, а не рядками опцій, але малюється тією самою
/// карткою — тому й розкладається на речі та монети тим самим кодом.
export const buildItemLines = (items: { name: string; quantity: number }[]): EquipmentLines =>
  buildEquipmentLines(
    items.map((item, index) => ({
      optionId: index,
      option: "a",
      quantity: item.quantity,
      item: item.name,
    })),
  );

export const buildChoiceHeading = (letters: string[]): string => {
  const shown = letters.map(toShownLetter).filter(Boolean);
  if (shown.length < 2) return "Ви отримуєте";

  const last = shown[shown.length - 1];
  return `Оберіть ${shown.slice(0, -1).join(", ")} або ${last}`;
};

export const formatVariantTitle = (letter: string): string => `Варіант ${toShownLetter(letter)}`;

/// Вибір за замовчуванням — уся літера, а не її перший рядок. Інакше персонаж, який не
/// клацнув по картці, дістає лише перший предмет варіанта.
export const buildDefaultSelection = (
  groups: Record<string, Record<string, EquipmentOptionRow[]>>,
): Record<string, number[]> => {
  const selection: Record<string, number[]> = {};

  for (const [choiceGroup, byLetter] of Object.entries(groups)) {
    const rows = findDefaultLetterRows(byLetter);
    if (rows.length > 0) selection[choiceGroup] = rows.map((row) => row.optionId);
  }

  return selection;
};

export const findDefaultLetterRows = <T,>(byLetter: Record<string, T[]>): T[] =>
  byLetter["a"] ?? Object.values(byLetter)[0] ?? [];

export const findPackView = (row: EquipmentOptionRow): EquipmentPackView | null => {
  const pack = row.equipmentPack;
  if (!pack) return null;

  const rawItems = Array.isArray(pack.items) ? pack.items : [];
  const items = rawItems.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const { name, quantity } = item as { name?: unknown; quantity?: unknown };
    if (typeof name !== "string" || !name.trim()) return [];
    const amount = Number(quantity);
    return [{ name, quantity: Number.isFinite(amount) ? amount : 1 }];
  });

  return {
    name: translatePackName(pack.name),
    description: String(pack.description ?? row.description ?? ""),
    items,
  };
};

const toLine = (row: EquipmentOptionRow): EquipmentLine => ({
  key: String(row.optionId),
  text: describeRow(row),
  pack: findPackView(row),
});

const describeRow = (row: EquipmentOptionRow): string => {
  if (isCoinRow(row)) return `${row.quantity} ${String(row.item).trim()}`;

  const described = row.description?.trim();
  if (described) return described;

  return withQuantity(nameSubject(row), row.quantity);
};

const nameSubject = (row: EquipmentOptionRow): string => {
  if (row.weapon) return translate(weaponTranslations, row.weapon.name);
  if (row.armor) return translate(armorTranslations, row.armor.name);
  if (row.equipmentPack) return translatePackName(row.equipmentPack.name);
  return row.item?.trim() ?? "";
};

const translate = (table: Record<string, string>, name: string): string => table[name] ?? name;

const isCoinRow = (row: EquipmentOptionRow): boolean =>
  row.quantity > 0 && !!row.item && findCoinKind(row.item) !== null;

const withQuantity = (label: string, quantity: number): string =>
  label && quantity > 1 ? `${label} x${quantity}` : label;

const translatePackName = (name: string): string => translate(equipmentCategoryTranslations, name);

const toShownLetter = (letter: string): string => String(letter ?? "").trim().toUpperCase();
