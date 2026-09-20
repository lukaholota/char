import { getLevelUpInfo } from "@/lib/actions/levelup";
import LevelUpWizard from "@/lib/components/levelUp/LevelUpWizard";
import { PersEditionPin } from "@/components/ui/PersEditionPin";

export default async function LevelUpData({ id }: { id: number }) {
  const info = await getLevelUpInfo(id);

  if ("error" in info) {
    return <div>Error: {info.error}</div>;
  }

  return (
    <>
      <PersEditionPin ruleset={info.pers.ruleset} />
      <LevelUpWizard info={info} />
    </>
  );
}
