import { getLevelUpInfo } from "@/lib/actions/levelup";
import { notFound } from "next/navigation";
import LevelUpWizard from "@/lib/components/levelUp/LevelUpWizard";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr);
  if (isNaN(id)) notFound();

  const info = await getLevelUpInfo(id);
  
  if ('error' in info) {
      // Handle error (e.g. unauthorized, max level)
      return <div>Error: {info.error}</div>;
  }

  return <LevelUpWizard info={info} />;
}
