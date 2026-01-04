import { getLevelUpInfo } from "@/lib/actions/levelup";
import LevelUpWizard from "@/lib/components/levelUp/LevelUpWizard";

export default async function LevelUpData({ id }: { id: number }) {
  const info = await getLevelUpInfo(id);

  if ("error" in info) {
    return <div>Error: {info.error}</div>;
  }

  return <LevelUpWizard info={info} />;
}
