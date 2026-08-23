import { Prisma, PrismaClient } from "@prisma/client";
import { readMagicItemBaseline } from "./magicItemBaseline";
import { applyBatchesToBaseline, readMagicItemBatches } from "./magicItemBatches";

export const seedMagicItems = async (prisma: PrismaClient) => {
    console.log("🧪 Магічні предмети 2014: базовий корпус плюс партії перекладу O14...");

    const items = buildMagicItemCorpus();

    console.log(`Prepared ${items.length} items for upsert...`);

    for (const item of items) {
        const { magicItemId: _pinnedId, ...withoutId } = item;
        await prisma.magicItem.upsert({
            where: { engName: item.engName },
            update: withoutId,
            create: item,
        });
    }

    // ID проставляються явно, тож послідовність лишається позаду максимального —
    // наступний autoincrement-вставки впав би на дублікат ключа.
    await prisma.$executeRawUnsafe(
        "SELECT setval(pg_get_serial_sequence('magic_item', 'magic_item_id'), (SELECT max(magic_item_id) FROM magic_item))",
    );

    console.log(`✅ Seeded ${items.length} magic items.`);
};

/// Базовий корпус — переклад, який стояв до O14, у prisma/seed/magic-items/baseline.json.
/// Партії з тієї ж теки накладаються зверху за engName, тому кожен прогін ідемпотентний.
export const buildMagicItemCorpus = (): Prisma.MagicItemUncheckedCreateInput[] => {
    const { items, updated, added } = applyBatchesToBaseline(
        readMagicItemBaseline(),
        readMagicItemBatches(),
    );
    console.log(`Партії O14: ${updated} перекладів накладено, ${added} нових предметів у каталозі.`);

    return items;
};
