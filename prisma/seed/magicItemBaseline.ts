/**
 * Базовий корпус магічних предметів: prisma/seed/magic-items/baseline.json.
 * Партії перекладу O14 накладаються зверху — див. magicItemBatches.ts.
 */

import { ItemRarity, MagicItemType, Prisma } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const BASELINE_PATH = join(__dirname, "magic-items", "baseline.json");

/// Корпус росте тільки свідомо: партія, яка привела новий предмет, піднімає це число
/// разом із переліком isNewToCatalog. Мовчазна втрата половини файла має падати тут.
const BASELINE_SIZE = 472;

export function readMagicItemBaseline(): Prisma.MagicItemUncheckedCreateInput[] {
    const parsed = JSON.parse(readFileSync(BASELINE_PATH, "utf-8")) as { items?: unknown };

    if (!Array.isArray(parsed.items)) {
        throw new Error(`${BASELINE_PATH}: очікували масив items.`);
    }
    if (parsed.items.length !== BASELINE_SIZE) {
        throw new Error(
            `${BASELINE_PATH}: ${parsed.items.length} записів, очікували ${BASELINE_SIZE}.`,
        );
    }

    const items = parsed.items.map(readBaselineRow);
    failOnDuplicates(items);
    return items;
}

function readBaselineRow(value: unknown, index: number): Prisma.MagicItemUncheckedCreateInput {
    const row = value as Partial<Prisma.MagicItemUncheckedCreateInput>;
    const label = row.engName ?? `запис №${index + 1}`;

    for (const key of ["magicItemId", "engName", "name", "itemType", "rarity", "description"] as const) {
        if (row[key] === undefined || row[key] === "") {
            throw new Error(`baseline.json: у «${label}» бракує поля ${key}.`);
        }
    }
    if (!(row.itemType! in MagicItemType)) {
        throw new Error(`baseline.json: «${label}» має невідомий itemType «${row.itemType}».`);
    }
    if (!(row.rarity! in ItemRarity)) {
        throw new Error(`baseline.json: «${label}» має невідому rarity «${row.rarity}».`);
    }

    return { ...row, requiresAttunement: row.requiresAttunement === true } as Prisma.MagicItemUncheckedCreateInput;
}

function failOnDuplicates(items: Prisma.MagicItemUncheckedCreateInput[]): void {
    const engNames = new Set(items.map((item) => item.engName));
    const ids = new Set(items.map((item) => item.magicItemId));

    if (engNames.size !== items.length) {
        throw new Error("baseline.json: engName трапляється двічі.");
    }
    if (ids.size !== items.length) {
        throw new Error("baseline.json: magicItemId трапляється двічі — це публічна адреса.");
    }
}
