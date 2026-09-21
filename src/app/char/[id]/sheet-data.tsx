import { getCharacterFeaturesGrouped, getPersForSheet } from "@/server/db/pers-actions";
import { loadPersSpellcastingSources } from "@/server/db/spell-sources";
import { loadSpellBuffCatalog } from "@/server/db/spell-buff-catalog";
import { notFound } from "next/navigation";
import CharacterSheet from "@/lib/components/characterSheet/CharacterSheet";
import { PersEditionPin } from "@/components/ui/PersEditionPin";
import { findCurrentUserId } from "@/server/db/current-user";

export default async function CharacterSheetData({ id }: { id: number }) {
  // Риси їдуть разом зі сторінкою, а не дотягуються серверною дією після монтування: інакше
  // збережена воркером сторінка без мережі показувала б «Завантаження фіч…» назавжди.
  // Усе паралельно: результат для недоступного персонажа просто не піде далі notFound().
  const [pers, spellcastingSources, groupedFeatures, currentUserId] = await Promise.all([
    getPersForSheet(id),
    loadPersSpellcastingSources(id),
    getCharacterFeaturesGrouped(id),
    findCurrentUserId(),
  ]);
  if (!pers) notFound();
  const spellBuffCatalog = await loadSpellBuffCatalog(pers.ruleset);

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
