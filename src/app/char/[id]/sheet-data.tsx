import { getCharacterFeaturesGrouped, getPersForSheet } from "@/server/db/pers-actions";
import { loadPersSpellcastingSources } from "@/server/db/spell-sources";
import { loadSpellBuffCatalog } from "@/server/db/spell-buff-catalog";
import { notFound } from "next/navigation";
import CharacterSheet from "@/lib/components/characterSheet/CharacterSheet";
import { PersEditionPin } from "@/components/ui/PersEditionPin";
import { findCurrentUserId } from "@/server/db/current-user";
import { findSourceBuildGuide } from "@/lib/optimization/ready-preset.server";

/// null — персонажа немає або його не можна бачити.
export async function loadSheetProps(id: number) {
  // Риси їдуть разом зі сторінкою, а не дотягуються серверною дією після монтування: інакше
  // збережена воркером сторінка без мережі показувала б «Завантаження фіч…» назавжди.
  // Усе паралельно: результат для недоступного персонажа просто не піде далі перевірки.
  const [pers, spellcastingSources, groupedFeatures, currentUserId] = await Promise.all([
    getPersForSheet(id),
    loadPersSpellcastingSources(id),
    getCharacterFeaturesGrouped(id),
    findCurrentUserId(),
  ]);
  if (!pers) return null;
  const [spellBuffCatalog, sourceBuildGuide] = await Promise.all([loadSpellBuffCatalog(pers.ruleset), findSourceBuildGuide(pers.sourceBuildId)]);
  return { pers, spellcastingSources, groupedFeatures, spellBuffCatalog, canShare: pers.userId === currentUserId, sourceBuildGuide };
}

export type SheetProps = NonNullable<Awaited<ReturnType<typeof loadSheetProps>>>;

export function PinnedCharacterSheet({ sheet, isEmbedded }: { sheet: SheetProps; isEmbedded?: boolean }) {
  return (
    <>
      <PersEditionPin ruleset={sheet.pers.ruleset} />
      <CharacterSheet {...sheet} isEmbedded={isEmbedded} />
    </>
  );
}

export default async function CharacterSheetData({ id }: { id: number }) {
  const sheet = await loadSheetProps(id);
  if (!sheet) notFound();
  return <PinnedCharacterSheet sheet={sheet} />;
}
