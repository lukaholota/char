export type PrintableWeaponAttack = {
  name: string;
  attackBonus: string;
  damage: string;
  damageType?: string;
  notes?: string;
};

export type GroupedPrintableWeaponAttack = PrintableWeaponAttack & {
  quantity: number;
};

type EquipmentLine = {
  name: string;
  quantity: number;
};

export function formatEquipmentText(rawEquipment: string): string {
  return groupPrintableItems(parseEquipmentLines(rawEquipment), (line) =>
    line.name.toLocaleLowerCase("uk")
  )
    .map(formatEquipmentLine)
    .join("\n");
}

export function groupPrintableWeaponAttacks(
  attacks: readonly PrintableWeaponAttack[]
): GroupedPrintableWeaponAttack[] {
  return groupPrintableItems(
    attacks.map((attack) => ({ ...attack, quantity: 1 })),
    (attack) => JSON.stringify([attack.name, attack.attackBonus, attack.damage])
  );
}

function parseEquipmentLines(rawEquipment: string): EquipmentLine[] {
  return rawEquipment
    .split(/\r?\n/)
    .map(parseEquipmentLine)
    .filter((line): line is EquipmentLine => line !== null);
}

function parseEquipmentLine(rawLine: string): EquipmentLine | null {
  const trimmed = rawLine.trim();
  if (!trimmed) return null;

  const matched = trimmed.match(/^(.*?)(?:\s+[x×]\s*(\d+))?$/iu);
  const name = matched?.[1]?.trim() || trimmed;
  const quantity = matched?.[2] ? Number(matched[2]) : 1;
  return { name, quantity };
}

function groupPrintableItems<T extends { quantity: number }>(
  items: readonly T[],
  getKey: (item: T) => string
): T[] {
  const grouped = new Map<string, T>();
  for (const item of items) {
    const key = getKey(item);
    const existing = grouped.get(key);
    if (existing) existing.quantity += item.quantity;
    else grouped.set(key, { ...item });
  }
  return Array.from(grouped.values());
}

function formatEquipmentLine(line: EquipmentLine): string {
  return line.quantity === 1 ? line.name : `${line.name} ×${line.quantity}`;
}
