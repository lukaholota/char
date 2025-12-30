import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAllSpells, type SpellData } from "@/lib/spellsData";
import { SpellsClient, type SpellListItem } from "./spells-client";

// Static generation — data comes from generated JSON
export default async function SpellsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;

  // Legacy redirect: ?selectedSpellId=123 → /spells/123
  const selectedSpellId = resolvedSearchParams.selectedSpellId;
  if (selectedSpellId && typeof selectedSpellId === "string") {
    redirect(`/spells/${selectedSpellId}`);
  }

  // Get static spell data (no Prisma, no DB)
  const spells = getAllSpells();

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
        <SpellsClient spells={items} initialSearchParams={resolvedSearchParams} />
      </Suspense>
    </div>
  );
}
