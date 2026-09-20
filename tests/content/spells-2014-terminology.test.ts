import { describe, expect, it } from "vitest";
import {
  ARMOR_CLASS_RETIRED,
  CAST_SPELL_PHRASE,
  CHALLENGE_RATING_RETIRED,
  DAMAGE_NOUN,
  SPELL_WORD,
  STAT_BLOCK_RETIRED,
} from "./ratified-term-forms";
import { readSpellSource2014 } from "../../prisma/seed/spellSource2014";

/// KR34.5: до файла-джерела тест застосовував 19 партій корекцій до каталогу в памʼяті й читав лише
/// ті ~570 описів, яких партії торкалися. Тепер текст живе в `data/2014/spells.json`, і гейт
/// читає кожен опис файла як є — саме так спливли «рівнем небезпеки» в Conjure Elemental і
/// Conjure Fey, які латка дрейфу лишила поза переписаним реченням.
const spells = readSpellSource2014();

const RETIRED_TERMS: { label: string; pattern: RegExp }[] = [
  /// KR17.7 закрито 2026-09-01: лінія А зведена до нуля, тому форма переїхала сюди з
  /// храповика `SPELL_WORD_CONVERTED`. Межі слова й перелік закінчень навмисні —
  /// «чарівник», «чародій», «чаротворча», «Причарований» законні й не мають червонити.
  { label: "заклинання", pattern: SPELL_WORD },
  { label: "чарунка", pattern: /чарунк/iu },
  { label: "комірка", pattern: /комірк/iu },
  {
    label: "ХП",
    pattern:
      /пункт\S*\s+здоров|(?<![\p{L}])хіт(?:и|ів|ами|ам|ах|ом|у|а)?(?![\p{L}])|оч(?:ок|ки|ками)\s+здоров/iu,
  },
  {
    label: "шкода",
    pattern:
      /\d+к\d+\s+пошкодж|пошкоджень\s+(?:кислотою|вогнем|холодом|блискавкою|отрутою|громом)|(?:дробильних|колотих|різаних|колючих|некротичних|психічних|променистих)\s+пошкодж/iu,
  },
  { label: "Засліплений", pattern: /осліплен/iu },
  { label: "Оглухлий", pattern: /оглушен/iu },
  { label: "Причарований", pattern: /зачарован/iu },
  { label: "рятівний кидок", pattern: /спаскидок/iu },
  /// КБ, показник небезпеки, накладаєте заклинання, шкода(ушкоджен) і статблок — спільне
  /// визначення з 2024-гейтом ([`ratified-term-forms.ts`](./ratified-term-forms.ts)). До
  /// KR32.1 цей файл тримав власну вужчу копію показника небезпеки без форми «рівень» —
  /// саме через це латка `prod-drift-repair-2026-09-02.json` не побачила «рівнем небезпеки»,
  /// що лишилося в `Conjure Elemental` і `Conjure Fey` поза перепиcаним реченням.
  { label: "КБ", pattern: ARMOR_CLASS_RETIRED },
  { label: "показник небезпеки", pattern: CHALLENGE_RATING_RETIRED },
  { label: "накладаєте заклинання", pattern: CAST_SPELL_PHRASE },
  { label: "променева шкода", pattern: /променист/iu },
  { label: "променева шкода", pattern: /(?:шкод\S*|[Уу]шкодж\S*)\s+Світлом/u },
  /// Іменникові форми damage. «неушкодженими» і «ушкоджує» — не термін, тому відсічені
  /// межею слова й хвостом «-ь»/«-н»; «пошкодження» має власний рядок вище.
  { label: "шкода", pattern: DAMAGE_NOUN },
  /// stat block. Форми «блок параметрів» і «статистичний блок» зняті 2026-08-23; «блок
  /// характеристик», «блок показників», «блок статистики» і «блок стану» — той самий термін.
  { label: "статблок", pattern: STAT_BLOCK_RETIRED },
  /// radiant, третя форма. З якорем на слово шкоди: без нього «іскри яскравого випромінювання»
  /// й «полумʼя випромінювання опускається» — законна проза — читалися б як тип шкоди.
  {
    label: "променева шкода",
    pattern: /шкод\S*\s+випромінюванн|випромінюванн\S*\s+\d+к\d+|\d+к\d+\s+випромінюванн|випромінювання\s+та\s+некротичн/iu,
  },
  /// Апостроф. Рішення власника 2026-08-30: ʼ (U+02BC).
  { label: "апостроф ʼ", pattern: /['’‘`´]/u },
];

function findRetiredForms(field: "description" | "components" | "castingTime"): string[] {
  return spells.flatMap((spell) => {
    const text = spell[field] ?? "";
    return RETIRED_TERMS.filter((term) => term.pattern.test(text)).map((term) => `${spell.engName}: ${term.label}`);
  });
}

describe("заклинання 2014 говорять ратифікованими термінами", () => {
  it("жоден опис файла-джерела не тримає знятої форми", () => {
    expect(findRetiredForms("description")).toEqual([]);
  });

  it("KR17.7: жоден опис не каже «чари» в жодній формі", () => {
    expect(spells.filter((spell) => SPELL_WORD.test(spell.description)).map((spell) => spell.engName)).toEqual([]);
  });

  /// KR32.1: жодна термінологічна партія 2014 ніколи не чіпала `components`/`castingTime`.
  /// Перелік — виміряний обсяг на день підключення, а не доказ, що восьмої форми чи сотого
  /// запису більше немає ([Р21](../../docs/DECISIONS.md#р21)).
  it("KR32.1: тримає виміряний обсяг знятих форм у `components`", () => {
    expect(findRetiredForms("components")).toHaveLength(34);
  });

  it("KR32.1: тримає виміряний обсяг знятих форм у `castingTime`", () => {
    expect(findRetiredForms("castingTime")).toHaveLength(2);
  });
});
