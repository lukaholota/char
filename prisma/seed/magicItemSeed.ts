import { Prisma, PrismaClient } from "@prisma/client";
import { readMagicItemBaseline } from "./magicItemBaseline";
import { applyBatchesToBaseline, readMagicItemBatches } from "./magicItemBatches";
import { MAGIC_ITEM_SEQUENCE_RESET_SQL } from "./magicItemIds";

export const seedMagicItems = async (prisma: PrismaClient) => {
    console.log("🧪 Магічні предмети 2014: базовий корпус плюс партії перекладу O14...");

    const items = buildMagicItemCorpus();

    console.log(`Prepared ${items.length} items for upsert...`);

    // Ключ — (engName, ruleset), а не сама назва: усі 445 предметів 2024 носять ті самі
    // англійські назви, і оновлення по одному engName переписало б їх корпусом 2014.
    for (const item of items) {
        const { magicItemId: _pinnedId, ...withoutId } = item;
        const { count } = await prisma.magicItem.updateMany({
            where: { engName: item.engName, ruleset: "RULES_2014" },
            data: withoutId,
        });
        if (count === 0) await prisma.magicItem.create({ data: { ...item, ruleset: "RULES_2014" } });
    }

    // ID проставляються явно, тож послідовність лишається позаду максимального —
    // наступний autoincrement-вставки впав би на дублікат ключа. Блок 20001+ під каталог 2024
    // послідовність обходить: інакше вона сіла б на id ще не доданого предмета 2024.
    await prisma.$executeRawUnsafe(MAGIC_ITEM_SEQUENCE_RESET_SQL);

    console.log(`✅ Seeded ${items.length} magic items.`);
};

/// Базовий корпус — переклад, який стояв до O14, у prisma/seed/magic-items/baseline.json.
/// Партії з тієї ж теки накладаються зверху за engName, тому кожен прогін ідемпотентний.
export const buildMagicItemCorpus = (): Prisma.MagicItemUncheckedCreateInput[] => {
    const { items, updated, added } = applyBatchesToBaseline(
        readMagicItemBaseline(),
        readMagicItemBatches(),
        { requireAllTerminologyCorrections: true },
    );
    console.log(`Партії O14: ${updated} перекладів накладено, ${added} нових предметів у каталозі.`);

    return items;
};
