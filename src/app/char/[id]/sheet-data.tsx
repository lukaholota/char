import { getCharacterFeaturesGrouped, getPersById } from "@/lib/actions/pers";
import { loadPersSpellcastingSources } from "@/server/db/spell-sources";
import { loadSpellBuffCatalog } from "@/server/db/spell-buff-catalog";
import { notFound } from "next/navigation";
import CharacterSheet from "@/lib/components/characterSheet/CharacterSheet";
import { PersEditionPin } from "@/components/ui/PersEditionPin";
import { findCurrentUserId } from "@/server/db/current-user";

export default async function CharacterSheetData({ id }: { id: number }) {
  const pers = await getPersById(id);
  if (!pers) notFound();
  // Риси їдуть разом зі сторінкою, а не дотягуються серверною дією після монтування: інакше
  // збережена воркером сторінка без мережі показувала б «Завантаження фіч…» назавжди.
  const [spellcastingSources, groupedFeatures, currentUserId, spellBuffCatalog] = await Promise.all([
    loadPersSpellcastingSources(pers.persId),
    getCharacterFeaturesGrouped(pers.persId),
    findCurrentUserId(),
    loadSpellBuffCatalog(pers.ruleset),
  ]);

  return (
    <>
      <PersEditionPin ruleset={pers.ruleset} />
      <CharacterSheet
        pers={pers}
        spellcastingSources={spellcastingSources}
        groupedFeatures={groupedFeatures}
        spellBuffCatalog={spellBuffCatalog}
        canShare={pers.userId === currentUserId}
      />
    </>
  );
}
