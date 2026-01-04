import { getPersById } from "@/lib/actions/pers";
import { notFound } from "next/navigation";
import CharacterSheet from "@/lib/components/characterSheet/CharacterSheet";

export default async function CharacterSheetData({ id }: { id: number }) {
  const pers = await getPersById(id);
  if (!pers) notFound();

  // Intentionally defer groupedFeatures loading to the client so the sheet can render fast.
  // The client will fetch grouped features and hydrate the Features slide.
  return <CharacterSheet pers={pers} groupedFeatures={null} />;
}
