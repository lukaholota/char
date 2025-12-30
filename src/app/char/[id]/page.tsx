import { getCharacterFeaturesGrouped, getPersById } from "@/lib/actions/pers";
import { notFound } from "next/navigation";
import CharacterSheet from "@/lib/components/characterSheet/CharacterSheet";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr);
  if (isNaN(id)) notFound();

  const pers = await getPersById(id);
  if (!pers) notFound();

  const groupedFeatures = await getCharacterFeaturesGrouped(id);

  return <CharacterSheet pers={pers} groupedFeatures={groupedFeatures} />;
}
