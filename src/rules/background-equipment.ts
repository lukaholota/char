export type BackgroundEquipmentChoice = "EQUIPMENT" | "GOLD";

export type StartingItem = { name: string; quantity: number };

/** Скорочення золотих монет, яким сіди пишуть гроші всередині списку майна. */
export const GOLD_ITEM_NAME = "зм";

type BackgroundStartingEquipment = {
  items: unknown;
  grantsGoldInstead?: number | null;
};

/** 2024: походження дає або пакунок майна, або 50 зм. 2014 альтернативи не має — там поле порожнє. */
export function hasGoldAlternative(background: BackgroundStartingEquipment): boolean {
  return toPositiveAmount(background.grantsGoldInstead) > 0;
}

export function findBackgroundStartingItems(
  background: BackgroundStartingEquipment,
  choice: BackgroundEquipmentChoice | undefined,
): StartingItem[] {
  const gold = toPositiveAmount(background.grantsGoldInstead);
  if (choice === "GOLD" && gold > 0) return [{ name: GOLD_ITEM_NAME, quantity: gold }];
  return parseStartingItems(background.items);
}

function parseStartingItems(items: unknown): StartingItem[] {
  if (!Array.isArray(items)) return [];

  return items.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const { name, quantity } = item as { name?: unknown; quantity?: unknown };
    if (typeof name !== "string" || !name.trim()) return [];
    const amount = typeof quantity === "string" ? Number(quantity) : quantity;
    if (typeof amount !== "number" || !Number.isFinite(amount)) return [];
    return [{ name, quantity: amount }];
  });
}

function toPositiveAmount(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}
