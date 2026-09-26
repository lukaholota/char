import grantedSpells2014 from "../../data/2014/subclass-granted-spells.json";
import { findSpellEngName2024, type LegacySubclass2024 } from "@/rules/legacy-subclasses-2024";

export type LegacySubclassSpell = { engName: string; classLevel2014: number };

/// Ті самі заклинання, що підклас 2014 дає без вибору гравця (O48), лише рядками 2024: 5etools і каталог 2024 пишуть назви по-різному («Animate dead»).
export function findLegacySubclassSpells(entry: LegacySubclass2024, spellNames2024: Iterable<string>): LegacySubclassSpell[] {
  const granted = grantedSpells2014.subclasses.find((list) => list.className === entry.class2014 && list.subclass === entry.subclass);
  if (!granted) return [];

  const byLooseName = new Map([...spellNames2024].map((engName) => [toLooseName(engName), engName]));
  return granted.spells.map((spell) => {
    const engName = byLooseName.get(toLooseName(findSpellEngName2024(spell.engName)));
    if (!engName) throw new Error(`${entry.subclass}: заклинання «${spell.engName}» немає серед заклинань 2024`);
    return { engName, classLevel2014: spell.classLevel };
  });
}

function toLooseName(engName: string): string {
  return engName.toLowerCase().replace(/[^a-z0-9]/g, "");
}
