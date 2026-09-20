import type { Ruleset } from "@prisma/client";
import loreGroupsJson from "@/lib/generated/creature-lore-groups.json";

/// Вступ до групи істот («Дракони», «Демони») — KR33.8. Каталог збирає
/// `scripts/build-creature-lore-groups.ts` з `data/<редакція>/bestiary-lore/groups.json` і дерева
/// лору 5etools; сторінка істоти шукає свою групу за id на сервері, тож у клієнт їде одна група.
export type CreatureLoreGroup = {
  key: string;
  ruleset: Ruleset;
  name: string;
  engName: string;
  source: string;
  description: string;
  creatureIds: number[];
};

const loreGroups = loreGroupsJson as CreatureLoreGroup[];

export function findCreatureLoreGroup(creatureId: number, ruleset: Ruleset): CreatureLoreGroup | null {
  return loreGroups.find((group) => group.ruleset === ruleset && group.creatureIds.includes(creatureId)) ?? null;
}
