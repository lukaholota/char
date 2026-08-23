import { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isRules2024Allowed } from "@/rules/access";
import { getAllMagicItems } from "@/lib/magicItemsData";
import { MagicItemsClient, type MagicItemListItem } from "@/app/magic-items/magic-items-client";

export const metadata: Metadata = {
  title: "Магічні предмети D&D 2024 — ДнД українською",
  description: "База даних магічних предметів для D&D 5e (DMG 2024) українською мовою. Фільтрація за рідкістю, типом та налаштуванням.",
};

export default async function MagicItems2024Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!isRules2024Allowed(session?.user)) {
    redirect("/magic-items");
  }

  const resolvedSearchParams = await searchParams;

  // Get static 2024 magic items data
  const itemsRaw = getAllMagicItems("RULES_2024");

  const items: MagicItemListItem[] = itemsRaw.map((i) => ({
    magicItemId: i.magicItemId,
    name: i.name,
    engName: i.engName,
    itemType: i.itemType,
    rarity: i.rarity,
    requiresAttunement: i.requiresAttunement,
    typeLineEng: i.typeLineEng,
    attunementConditionEng: i.attunementConditionEng,
    ruleset: i.ruleset,
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
        <MagicItemsClient items={items} initialSearchParams={resolvedSearchParams} ruleset="RULES_2024" />
      </Suspense>
    </div>
  );
}
