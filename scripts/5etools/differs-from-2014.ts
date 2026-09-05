/// KR16.2 — прапорець `differsFrom2014` рахується, а не ставиться руками.
///
/// Рахуємо **джерело проти джерела**: запис XPHB проти запису 2014 у тому самому пінованому
/// корпусі. Порівнювати наш український запис 2024 із XPHB для цього не годиться — саме так
/// прапорець і зіпсувався: 273 записи несли текст 2014 і мовчки погоджувалися самі з собою.
///
/// Перелік класів у порівняння не входить. 5etools кодує «заклинання з супліменту додається до
/// списку класу» через `classVariant`, тому в TCE-заклинання базовий перелік 2014 порожній, а
/// в XPHB — ні: вийшла б «зміна» там, де змінилося кодування, а не правило. Список класів — це
/// властивість класу, а не заклинання, і він лишається в звіті розбіжностей.

import { findLooseNameKey, readSpells, SourceSpell } from "./schema";
import { readFactsFromSource } from "./source-spell-facts";
import { compareSpellFacts, FactMismatch } from "./spell-facts";

/// Три заклинання 2024 успадкували механіку 2014-запису під іншою назвою. Джерела машинного
/// звʼязку між ними не дають — назви беруться з `kind: "renamed"` у нашому каталозі.
export const RENAMED_FROM_2014: Readonly<Record<string, string>> = {
  "Shining Smite": "Branding Smite",
  "Summon Dragon": "Summon Draconic Spirit",
  Befuddlement: "Feeblemind",
};

export type DerivedFlag = {
  engName: string;
  differsFrom2014: boolean;
  /// Порожньо, коли заклинання 2024 нове: порівнювати нема з чим, а «змінилося» — це правда.
  mismatches: FactMismatch[];
  isNewIn2024: boolean;
};

export function deriveDiffersFrom2014(engNames: string[]): DerivedFlag[] {
  const spells = readSpells();
  const of2024 = indexByLooseName(spells, "RULES_2024");
  const of2014 = indexByLooseName(spells, "RULES_2014");

  return engNames.map((engName) => {
    const modern = of2024.get(findLooseNameKey(engName));
    if (!modern) throw new Error(`${engName}: немає запису в книгах 2024`);

    const oldName = RENAMED_FROM_2014[engName] ?? engName;
    const classic = of2014.get(findLooseNameKey(oldName));
    if (!classic) {
      return { engName, differsFrom2014: true, mismatches: [], isNewIn2024: true };
    }

    const mismatches = compareSpellFacts(
      readFactsFromSource(classic, [], `${oldName} 2014`),
      readFactsFromSource(modern, [], `${engName} 2024`),
      { compareClasses: false }
    );

    return { engName, differsFrom2014: mismatches.length > 0, mismatches, isNewIn2024: false };
  });
}

function indexByLooseName(spells: SourceSpell[], edition: string): Map<string, SourceSpell> {
  const index = new Map<string, SourceSpell>();

  for (const spell of spells) {
    if (spell.edition !== edition) continue;
    const key = findLooseNameKey(spell.nameEng);
    if (!index.has(key)) index.set(key, spell);
  }

  return index;
}
