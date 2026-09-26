/**
 * O48 — заклинання, які дає обрана опція підкласу 2014: біом Кола землі («Circle Spells — Arctic»),
 * рівнем класу, як у таблиці PHB. Перелік — поле `options` у `data/2014/subclass-granted-spells.json`.
 */

import subclassGrantedSpells from "../../data/2014/subclass-granted-spells.json";

export type SubclassOptionSpells2014 = { subclass: string; optionNameEng: string; spells: { engName: string; classLevel: number }[] };

export function listSubclassOptionSpells2014(): readonly SubclassOptionSpells2014[] {
  return subclassGrantedSpells.options;
}
