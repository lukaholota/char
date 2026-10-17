import { describe, expect, it } from "vitest";
import { findLegendRating, findLinkCards, findLoneLink, isOwnArticleLink, joinLeadingMarkers, splitJargon, splitLineBreaks, splitRatedLabel } from "./inline-view";
import type { InlineNode } from "./types";

const text = (value: string): InlineNode => ({ type: "text", text: value });
const link = (value: string, href: string): InlineNode => ({ type: "link", text: value, href });

describe("splitRatedLabel", () => {
  it("відділяє назву до двокрапки й лишає двокрапку в залишку", () => {
    const split = splitRatedLabel([text("Хіт Поїнти{{Hit Points}}: з Кубиком Здоровʼя к8")]);
    expect(split?.label).toEqual([text("Хіт Поїнти{{Hit Points}}")]);
    expect(split?.rest).toEqual([text(": з Кубиком Здоровʼя к8")]);
  });

  it("бере в назву й посилання на книгу, якщо двокрапка стоїть після нього", () => {
    const nodes = [text("Захист без броні{{Unarmored Defense}} "), link("PHB", "https://rpgbot.net/dnd5/abbreviations/"), text(": КБ 20")];
    const split = splitRatedLabel(nodes);
    expect(split?.label).toEqual([nodes[0], nodes[1]]);
    expect(split?.rest).toEqual([text(": КБ 20")]);
  });

  it("не чіпає речення, де двокрапка стоїть надто далеко для назви", () => {
    const sentence = "Це довге пояснення без жодної назви на початку, у якому двокрапка трапляється аж наприкінці речення: ось";
    expect(splitRatedLabel([text(sentence)])).toBeUndefined();
  });

  it("не вважає двокрапкою час чи співвідношення без пробілу", () => {
    expect(splitRatedLabel([text("Шанс 3:1 на користь Монаха")])).toBeUndefined();
  });

  it("не будує порожню назву, коли рядок починається з двокрапки", () => {
    expect(splitRatedLabel([text(": просто текст")])).toBeUndefined();
  });

  it("повертає нічого, коли двокрапки немає", () => {
    expect(splitRatedLabel([text("Без назви")])).toBeUndefined();
  });
});

describe("findLegendRating", () => {
  it.each([["Червоний", 1], ["Помаранчевий", 2], ["Зелений", 3], ["Синій", 4]] as const)("%s → %i з 4", (word, score) => {
    expect(findLegendRating([text(`${word}: пояснення`)])).toEqual({ score, context: "" });
  });

  it("не плутає звичайний текст із легендою", () => {
    expect(findLegendRating([text("Червоний дракон: небезпечний")])).toBeUndefined();
    expect(findLegendRating([link("Синій", "https://example.com")])).toBeUndefined();
  });
});

describe("картки-посилання", () => {
  const resolve = (href: string) => ({ href, isExternal: !href.startsWith("/") });

  it("упізнає абзац чи пункт, що складається з одного посилання", () => {
    const only = link("Гайд", "https://rpgbot.net/x/");
    expect(findLoneLink([only])).toBe(only);
    expect(findLoneLink([only, text(".")])).toBeUndefined();
  });

  it("робить картки зі списку лише посилань і підписує, куди вони ведуть", () => {
    const cards = findLinkCards(
      [[link("Гайд про раси{{Races}}", "https://rpgbot.net/races/")], [link("Підкласи", "/rules/optimization/monk-subclasses-2014")], [link("Відео", "https://www.youtube.com/watch?v=1")]],
      resolve, "/rules/optimization/monk-2014",
    );
    expect(cards?.map((card) => [card.title, card.source])).toEqual([
      ["Гайд про раси", "RPGbot — оригінал англійською"], ["Підкласи", "Український переклад"], ["Відео", "youtube.com"],
    ]);
  });

  it("не перетворює на картки зміст самої статті", () => {
    const contents = [[link("Вступ", "/rules/optimization/monk-2014#section-introduction")], [link("Раси", "/rules/optimization/monk-2014#section-races")]];
    expect(findLinkCards(contents, resolve, "/rules/optimization/monk-2014")).toBeUndefined();
  });

  it("лишає звичайний список, якщо в ньому є пункт не з одного посилання", () => {
    expect(findLinkCards([[link("A", "https://a.test/")], [text("Текст "), link("B", "https://b.test/")]], resolve, "/x")).toBeUndefined();
    expect(findLinkCards([], resolve, "/x")).toBeUndefined();
  });

  it("не робить картки з позначок джерел, що ведуть на сторінку скорочень RPGbot", () => {
    const marker = link("PHB", "https://rpgbot.net/dnd5/abbreviations/");
    expect(findLoneLink([marker])).toBeUndefined();
    expect(findLinkCards([[marker], [link("XGtE", "https://rpgbot.net/dnd5/abbreviations/")]], resolve, "/x")).toBeUndefined();
  });

  it("відрізняє власну статтю від сусідньої з тим самим початком адреси", () => {
    expect(isOwnArticleLink("/rules/optimization/monk-2014", "/rules/optimization/monk-2014")).toBe(true);
    expect(isOwnArticleLink("/rules/optimization/monk-2014#a", "/rules/optimization/monk-2014")).toBe(true);
    expect(isOwnArticleLink("/rules/optimization/monk-2014-extra", "/rules/optimization/monk-2014")).toBe(false);
  });
});

describe("joinLeadingMarkers", () => {
  it("приєднує маркер, що стоїть одразу після посилання, до цього посилання", () => {
    const nodes = [text("Послушник "), link("Дампір", "https://example.com/d"), text("{{Dhampir}}: опис")];
    expect(joinLeadingMarkers(nodes)).toEqual([text("Послушник "), link("Дампір{{Dhampir}}", "https://example.com/d"), text(": опис")]);
  });

  it("приєднує маркер до жирного й лишає закривальну лапку в тексті", () => {
    const joined = joinLeadingMarkers([{ type: "strong", text: "Традиція" }, text("{{Tradition}}: підкласи")]);
    expect(joined).toEqual([{ type: "strong", text: "Традиція{{Tradition}}" }, text(": підкласи")]);
    expect(joinLeadingMarkers([link("Вливання", "https://example.com/i"), text("»{{Infusions}}. Далі")]))
      .toEqual([link("Вливання{{Infusions}}", "https://example.com/i"), text("». Далі")]);
  });

  it("не чіпає маркер у середині тексту й маркер, перед яким звичайний текст", () => {
    const nodes = [text("променевої{{radiant}} шкоди"), link("PHB", "https://example.com/p"), text(" і {{Термін|Term}}")];
    expect(joinLeadingMarkers(nodes)).toEqual(nodes);
  });

  it("прибирає порожній залишок тексту після приєднаного маркера", () => {
    expect(joinLeadingMarkers([link("Докір", "https://example.com/r"), text("{{Rebuke}}")])).toEqual([link("Докір{{Rebuke}}", "https://example.com/r")]);
  });
});

describe("splitJargon", () => {
  it("виділяє MAD і SAD з поясненням, решту тексту лишає", () => {
    const segments = splitJargon("клас (MAD) проти SAD-класів");
    expect(segments.map((segment) => segment.text)).toEqual(["клас (", "MAD", ") проти ", "SAD", "-класів"]);
    expect(segments.filter((segment) => segment.jargon).map((segment) => segment.jargon?.expansion)).toEqual(["Multiple Ability Dependent", "Single Ability Dependent"]);
  });

  it("не чіпає слова, що лише містять ці літери", () => {
    expect(splitJargon("MADE SADLY mad")).toEqual([{ text: "MADE SADLY mad" }]);
  });

  it("повертає порожній масив для порожнього тексту", () => {
    expect(splitJargon("")).toEqual([]);
  });
});

describe("splitLineBreaks", () => {
  it("відрізняє перенос рядка від розриву абзацу", () => {
    expect(splitLineBreaks("Перше.\nДруге.\n\nТреті.")).toEqual([
      { kind: "text", text: "Перше." },
      { kind: "line" },
      { kind: "text", text: "Друге." },
      { kind: "paragraph" },
      { kind: "text", text: "Треті." },
    ]);
  });

  it("лишає текст без переносів одним шматком", () => {
    expect(splitLineBreaks("Один рядок")).toEqual([{ kind: "text", text: "Один рядок" }]);
  });
});
