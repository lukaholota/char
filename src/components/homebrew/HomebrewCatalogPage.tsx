import { Suspense } from "react";
import { BestiaryClient } from "@/components/bestiary/BestiaryClient";
import { SpellsClient } from "@/app/spells/spells-client";
import { findContentViewer } from "@/server/db/content-viewer";
import { parseHomebrewKind, parseHomebrewSort } from "@/lib/logic/homebrew-catalog";
import { HomebrewCatalogHeader } from "./HomebrewCatalogHeader";

type SearchParams = Record<string, string | string[] | undefined>;

export async function HomebrewCatalogPage({ searchParams, is2024 }: { searchParams: SearchParams; is2024: boolean }) {
  const kind = parseHomebrewKind(searchParams.kind);
  const sort = parseHomebrewSort(searchParams.hbsort);
  const viewer = await findContentViewer();
  const ruleset = is2024 ? "RULES_2024" : "RULES_2014";
  const homebrewOnly = { sort, header: <HomebrewCatalogHeader kind={kind} is2024={is2024} sort={sort} isModerator={viewer.isModerator} /> };

  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        {kind === "CREATURE" ? (
          <BestiaryClient ruleset={ruleset} index={[]} initialStatblock={null} homebrewOnly={homebrewOnly} />
        ) : (
          <SpellsClient spells={[]} initialSearchParams={searchParams} ruleset={ruleset} homebrewOnly={homebrewOnly} />
        )}
      </Suspense>
    </div>
  );
}
