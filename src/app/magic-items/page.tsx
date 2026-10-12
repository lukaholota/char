import { Metadata } from "next";
import { Suspense } from "react";
import { getAllMagicItems } from "@/lib/magicItemsData";
import { MagicItemsClient, type MagicItemListItem } from "./magic-items-client";
import { collectSupplementalReferences } from "@/lib/optimization/supplemental-hydration";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { ModeLink } from "@/components/no-ai/ModeLink";

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
  const referenceKey = resolvedSearchParams.reference;
  const reference = typeof referenceKey === "string" ? collectSupplementalReferences("RULES_2014", [])
    .find((entry) => entry.kind === "magic-item" && new URL(entry.href, "https://local.invalid").searchParams.get("reference") === referenceKey) : undefined;
  if (reference) return <article className="mx-auto max-w-3xl space-y-6 p-6">
    <ModeLink href="/magic-items" className="text-amber-200 underline">Магічні предмети</ModeLink>
    <h1 className="text-3xl">{reference.name}</h1>
    <p className="font-mono text-sm text-slate-400">{reference.engName}</p>
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
      {reference.details.map((detail) => <div key={detail.label} className="contents"><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)}
    </dl>
    <FormattedDescription content={reference.description ?? ""} />
  </article>;

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
