import { Metadata } from "next";
import { Suspense } from "react";
import { getAllMagicItems } from "@/lib/magicItemsData";
import { MagicItemsClient, type MagicItemListItem } from "./magic-items-client";

export const metadata: Metadata = {
  title: "Магічні предмети — ДнД українською",
  description: "База даних магічних предметів для D&D 5e українською мовою. Фільтрація за рідкістю, типом та можливістю налаштування.",
};

// Static generation
export default async function MagicItemsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;

  // Get static data
  const itemsRaw = getAllMagicItems();

  const items: MagicItemListItem[] = itemsRaw.map((i) => ({
    magicItemId: i.magicItemId,
    name: i.name,
    engName: i.engName,
    itemType: i.itemType,
    rarity: i.rarity,
    requiresAttunement: i.requiresAttunement,
    description: i.description,
    shortDescription: i.shortDescription,
    weaponProficiencies: i.weaponProficiencies,
    weaponProficienciesSpecial: i.weaponProficienciesSpecial,
    bonusToAC: i.bonusToAC,
    bonusToRangedDamage: i.bonusToRangedDamage,
    bonusToSavingThrows: i.bonusToSavingThrows as number | null,
    noArmorOrShieldForACBonus: i.noArmorOrShieldForACBonus,
    givesSpells: i.givesSpells,
  }));

  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <MagicItemsClient items={items} initialSearchParams={resolvedSearchParams} />
      </Suspense>
    </div>
  );
}
