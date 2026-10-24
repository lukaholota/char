import { getLevelUpInfo } from "@/lib/actions/levelup";
import LevelUpWizard from "@/lib/components/levelUp/LevelUpWizard";
import { PersEditionPin } from "@/components/ui/PersEditionPin";
import { loadGuidedLevelUp } from "@/server/db/guided-level-up";
import { createLogger } from "@/server/logging/logger";
import { ModeLink } from "@/components/no-ai/ModeLink";

const log = createLogger("levelup.guided");

export default async function LevelUpData({ id }: { id: number }) {
  // Гайд рахується паралельно, але віддається лише після гейту доступу в getLevelUpInfo.
  const [info, guide] = await Promise.all([getLevelUpInfo(id), loadGuidedLevelUp(id).catch((err) => {
    log.error("guided-level-up.failed", { persId: id, err });
    return null;
  })]);

  if ("error" in info) {
    const isMaximumLevel = info.error === "Max level reached";
    return <section className="mx-auto max-w-xl space-y-4 px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-100">{isMaximumLevel ? "Досягнуто максимального рівня" : "Не вдалося відкрити підвищення рівня"}</h1>
      <p className="text-slate-300">{isMaximumLevel ? "Персонаж уже має 20 рівнів. Подальше підвищення недоступне." : "Перевірте доступ до персонажа й спробуйте ще раз."}</p>
      <ModeLink href={`/char/${id}`} className="inline-flex min-h-10 items-center rounded-md px-3 text-arcane-300 underline focus-visible:outline focus-visible:outline-2">Повернутися до персонажа</ModeLink>
    </section>;
  }

  return (
    <>
      <PersEditionPin ruleset={info.pers.ruleset} />
      <LevelUpWizard info={info} guide={guide} />
    </>
  );
}
