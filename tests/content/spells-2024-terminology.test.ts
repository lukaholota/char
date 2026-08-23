import { describe, it, expect } from "vitest";
import catalog2024 from "../../data/2024/normalized/spells.json";

/// Рішення власника 2026-08-23: у розбіжностях «словник проти корпусу» виграє словник.
/// Перелік — заборонені форми, а не бажані: назвати правильне слово мало, бо старе повертається
/// разом із наступною партією, скопійованою з 2014-запису. Прозу це не чіпає — «глухим ревом»
/// у `Fireball` і «Крихітний» лишаються, бо в переліку стоять самі терміни.
const RETIRED_TERMS: { pattern: RegExp; instead: string }[] = [
  { pattern: /чарунк/iu, instead: "слот заклинань" },
  { pattern: /комірк/iu, instead: "слот заклинань" },
  { pattern: /магічний слот|слот для заклинань/iu, instead: "слот заклинань" },
  { pattern: /пункт\S*\s+здоров/iu, instead: "ХП" },
  { pattern: /(?<![\p{L}])хіт(?:и|ів|ами|ам|ах|ом|у|а)?(?![\p{L}])/iu, instead: "ХП" },
  { pattern: /осліплен/iu, instead: "Засліплений" },
  { pattern: /оглушен/iu, instead: "Оглухлий" },
  { pattern: /зачарован/iu, instead: "Причарований" },
  { pattern: /непроглядн/iu, instead: "Значна заслоненість" },
  { pattern: /чистою енергією/iu, instead: "силовим полем" },
  { pattern: /проколюванн/iu, instead: "колючі ушкодження" },
  { pattern: /вчинк|вчинок/iu, instead: "дія" },
  { pattern: /спаскидок/iu, instead: "рятівний кидок" },
  { pattern: /в межах діапазону/iu, instead: "в межах відстані" },
  { pattern: /оч(?:ок|ки|ками)\s+здоров/iu, instead: "ХП" },
  { pattern: /(?<![\p{L}])метр(?:и|ів|ам|ах|ами|а|у)?(?![\p{L}])/iu, instead: "фути" },
  { pattern: /\d+к\d+\s+пошкодж|пошкоджень\s+(?:кислотою|вогнем|холодом|блискавкою|отрутою|громом)|(?:дробильних|колотих|різаних|колючих|некротичних|психічних|променистих)\s+пошкодж/iu, instead: "ушкодження" },
  { pattern: /Посилення замовляння/iu, instead: "Покращення замовляння" },
];

const catalog = catalog2024 as { engName: string; description: string }[];

/// Заголовок підвищення рівня стояв у чотирьох формах — з двокрапкою всередині зірочок і поза
/// ними, а подекуди й зовсім без розділового знака. Правильна одна, і вона названа в Р18.
const RATIFIED_HEADINGS = [/\*\*На вищих рівнях\.\*\*/u, /\*\*Покращення замовляння\.\*\*/u];

const HEADING_STEMS = [/\*\*На вищих рівнях/u, /\*\*Покращення замовляння/u];

/// Звертання до гравця — на «ви» (house style). Два записи каталогу зверталися на «ти», і це
/// був не стиль, а слід іншого перекладу: разом із «ти» в них їхали «вчинок» замість дії,
/// метри замість футів і правило редакції 2014.
const INFORMAL_ADDRESS =
  /(?<![\p{L}])(?:ти|тебе|тобі|тобою|твій|тво(?:го|му|єї|єму|їй|їм|їх|їми|я|є|ї|ю))(?![\p{L}])/iu;

describe("каталог 2024 говорить словником", () => {
  it("жоден опис не вживає форми, яку словник замінив", () => {
    const offenders = catalog.flatMap((row) =>
      RETIRED_TERMS.filter((term) => term.pattern.test(row.description)).map(
        (term) => `${row.engName}: «${term.pattern.source}» → ${term.instead}`,
      ),
    );

    expect(offenders).toEqual([]);
  });

  it("заголовки підвищення рівня стоять у ратифікованій формі", () => {
    const offenders = catalog
      .filter((row) =>
        HEADING_STEMS.some((stem, index) => {
          const found = [...row.description.matchAll(new RegExp(stem.source, "gu"))].length;
          const ratified = [
            ...row.description.matchAll(new RegExp(RATIFIED_HEADINGS[index].source, "gu")),
          ].length;
          return found !== ratified;
        }),
      )
      .map((row) => row.engName);

    expect(offenders).toEqual([]);
  });

  it("жоден опис не звертається до гравця на «ти»", () => {
    const offenders = catalog
      .filter((row) => INFORMAL_ADDRESS.test(row.description))
      .map((row) => row.engName);

    expect(offenders).toEqual([]);
  });
});
