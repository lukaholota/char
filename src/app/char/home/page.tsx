import { getUserPerses } from "@/lib/actions/pers";
import { CharHomeClient } from "@/app/char/home/CharHomeClient";

export default async function Page() {
  const perses = await getUserPerses();

  const items = perses.map((pers) => ({
    persId: pers.persId,
    name: pers.name,
    level: pers.level,
    currentHp: pers.currentHp,
    maxHp: pers.maxHp,
    raceName: pers.race.name,
    className: pers.class.name,
    backgroundName: pers.background.name,
  }));

  return <CharHomeClient perses={items} />;
}
