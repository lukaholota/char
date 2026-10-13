import { getLevelUpInfo } from "@/lib/actions/levelup";
import LevelUpWizard from "@/lib/components/levelUp/LevelUpWizard";
import { PersEditionPin } from "@/components/ui/PersEditionPin";
import { loadGuidedLevelUp } from "@/server/db/guided-level-up";
import { createLogger } from "@/server/logging/logger";

const log = createLogger("levelup.guided");

export default async function LevelUpData({ id }: { id: number }) {
  // Гайд рахується паралельно, але віддається лише після гейту доступу в getLevelUpInfo.
  const [info, guide] = await Promise.all([getLevelUpInfo(id), loadGuidedLevelUp(id).catch((err) => {
    log.error("guided-level-up.failed", { persId: id, err });
    return null;
  })]);

  if ("error" in info) {
    return <div>Error: {info.error}</div>;
  }

  return (
    <>
      <PersEditionPin ruleset={info.pers.ruleset} />
      <LevelUpWizard info={info} guide={guide} />
    </>
  );
}
