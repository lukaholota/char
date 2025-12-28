import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { SpellsClient, type SpellListItem } from "./spells-client";

export const dynamic = "force-dynamic";

export default async function SpellsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;

  const spells = await prisma.spell.findMany({
    orderBy: [{ level: "asc" }, { name: "asc" }],
    select: {
      spellId: true,
      name: true,
      engName: true,
      level: true,
      school: true,
      castingTime: true,
      duration: true,
      range: true,
      components: true,
      description: true,
      source: true,
      hasRitual: true,
      hasConcentration: true,
      spellClasses: { select: { className: true } },
      spellRaces: { select: { raceName: true } },
    },
  });

  const items: SpellListItem[] = spells.map((s) => ({
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
    source: String(s.source),
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
