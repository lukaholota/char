import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAllSpells, type SpellData } from "@/lib/spellsData";
import { SpellsClient, type SpellListItem } from "@/app/spells/spells-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Заклинання D&D 2024 — ДнД українською",
  description: "Повний каталог 391 заклинання D&D 5e (PHB 2024) українською мовою з фільтрацією за класами, рівнями та школами магії.",
};

export default async function Spells2024Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;

  // Legacy redirect if selectedSpellId
  const selectedSpellId = resolvedSearchParams.selectedSpellId;
  if (selectedSpellId && typeof selectedSpellId === "string") {
    redirect(`/2024/spells/${selectedSpellId}`);
  }

  // Get static 2024 spell data
  const spells = getAllSpells("RULES_2024");

  const items: SpellListItem[] = spells.map((s: SpellData) => ({
    spellId: s.spellId,
    name: s.name,
    engName: s.engName,
    level: s.level,
    school: s.school,
    castingTime: s.castingTime,
    duration: s.duration,
    range: s.range,
    components: s.components,
    description: s.description,
    source: s.source,
    hasRitual: s.hasRitual,
    hasConcentration: s.hasConcentration,
    spellClasses: s.spellClasses,
    spellRaces: s.spellRaces,
  }));

  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <SpellsClient spells={items} initialSearchParams={resolvedSearchParams} ruleset="RULES_2024" />
      </Suspense>
    </div>
  );
}
