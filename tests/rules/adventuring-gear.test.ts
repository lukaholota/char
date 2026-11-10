import { describe, expect, it } from "vitest";

import rules2014 from "@/lib/generated/rules-2014.json";
import rules2024 from "@/lib/generated/rules-2024.json";
import { findMatchingGear, parseGear2014, parseGear2024, type GearItem } from "@/rules/adventuring-gear";

type GearChapter = { slug: string; subsections: { title: string; content: string }[] };

function findChapter(articles: unknown): GearChapter {
  return (articles as GearChapter[]).find((article) => article.slug === "adventuring-gear")!;
}

const gear2014 = parseGear2014(findChapter(rules2014).subsections[0].content);
const gear2024 = parseGear2024(findChapter(rules2024).subsections);

function findItem(items: GearItem[], name: string): GearItem {
  return items.find((item) => item.name === name)!;
}

const CHAPTER = [
  "Вступ без речі.",
  "",
  "***Алхімічний вогонь{{alchemist's fire}}***. Ця рідина горить.",
  "",
  "Другий абзац.",
  "",
  "***Зілля лікування [Potion of Healing]***. Лікує.",
  "",
  "***Містичне фокусування{{arcane focus}}***. Фокус для магів.",
  "",
  "***Мотузка***. Має 2 хіт-поїнти.",
  "",
  "**Набори спорядження**",
  "",
  "Вступ до наборів.",
  "",
  "***Набір злодія (16 зм)***. Містить рюкзак.",
  "",
  "**Таблиця. Спорядження шукача пригод**",
  "",
  "| Річ | Вартість | Вага |",
  "|-----|----------|------|",
  "| Алхімічний вогонь (фляга) | 50 зм | 1 фнт |",
  "| Зілля лікування | 50 зм | ½ фнт |",
  "| Кошик | 4 см | 2 фнт |",
  "| Кухоль | 2 мм | 1 фнт |",
  "| *Містичне фокусування* | | |",
  "| ~ Кристал | 10 зм | 1 фнт |",
  "| *Боєприпаси* | | |",
  "| ~ Стріли (20) | 1 зм | - |",
  "| Мотузка, шовкова (50 футів) | 10 зм | 5 фнт |",
  "",
  "**Таблиця. Місткість вмістищ**",
  "",
  "| Вмістище | Місткість |",
  "|----------|-----------|",
  "| Кошик* | 2 кубічні фути |",
  "| Фляга або кухоль | 1 пінта рідини |",
  "",
  "\\* Примітка.",
].join("\n");

describe("розбір розділу спорядження 2014", () => {
  const items = parseGear2014(CHAPTER);

  it("бере абзаци опису до наступної речі й чистить назву від глосарних позначок", () => {
    const fire = findItem(items, "Алхімічний вогонь");
    expect(fire.description).toBe("Ця рідина горить.\n\nДругий абзац.");
    expect(fire).toMatchObject({ price: "50 зм", weight: "1 фнт", group: null });
    expect(findItem(items, "Зілля лікування").description).toBe("Лікує.");
  });

  it("набір бере ціну з назви, а вступ розділу не стає річчю", () => {
    expect(findItem(items, "Набір злодія")).toMatchObject({ price: "16 зм", description: "Містить рюкзак." });
    expect(items.some((item) => item.description?.includes("Вступ"))).toBe(false);
  });

  it("рядок лише з таблиці стає річчю, а місткість дописується в опис", () => {
    expect(findItem(items, "Кошик")).toMatchObject({ price: "4 см", weight: "2 фнт", description: "Місткість: 2 кубічні фути." });
    expect(findItem(items, "Кухоль").description).toBe("Місткість: 1 пінта рідини.");
  });

  it("різновид успадковує правила групи чи батьківської речі; дефіс у вазі означає її відсутність", () => {
    expect(findItem(items, "Кристал")).toMatchObject({ group: "Містичне фокусування", description: "Фокус для магів." });
    expect(findItem(items, "Стріли (20)")).toMatchObject({ group: "Боєприпаси", weight: null, description: null });
    expect(findItem(items, "Мотузка, шовкова (50 футів)").description).toBe("Має 2 хіт-поїнти.");
  });

  it("заголовки таблиць і назви груп не стають речами", () => {
    const names = items.map((item) => item.name);
    expect(names).not.toContain("Річ");
    expect(names).not.toContain("Боєприпаси");
    expect(names).not.toContain("Вмістище");
  });
});

describe("розбір розділу спорядження 2024", () => {
  it("відділяє ціну від назви й пропускає вступ", () => {
    const items = parseGear2024([
      { title: "Спорядження шукача пригод", content: "Вступ" },
      { title: "Сувій заклинань (замовляння — 30 зм; 1-й рівень — 50 зм)", content: " Текст " },
      { title: "Намет", content: "Прихисток" },
    ]);
    expect(items.map((item) => item.name)).toEqual(["Намет", "Сувій заклинань"]);
    expect(items[1]).toMatchObject({ price: "замовляння — 30 зм; 1-й рівень — 50 зм", description: "Текст" });
  });
});

describe("пошук речі", () => {
  const items = parseGear2014(CHAPTER);

  it("порожній запит показує все", () => {
    expect(findMatchingGear(items, "  ")).toHaveLength(items.length);
  });

  it("збіг у назві стоїть вище за збіг в описі", () => {
    const [first, ...rest] = findMatchingGear(items, "фокус");
    expect(first.name).toBe("Містичне фокусування");
    expect(rest.map((item) => item.name)).toContain("Кристал");
    expect(rest.map((item) => item.name)).not.toContain("Містичне фокусування");
  });

  it.each([["2014", gear2014], ["2024", gear2024]] as const)("%s: слово зі столу «масло» веде на олію", (_edition, gear) => {
    expect(findMatchingGear(gear, "масло")[0].name).toBe("Олія");
  });
});

describe.each([["2014", gear2014], ["2024", gear2024]] as const)("справжній розділ %s", (_edition, gear) => {
  it("містить десятки речей, а назви не повторюються й без службових позначок", () => {
    expect(gear.length).toBeGreaterThan(60);
    expect(new Set(gear.map((item) => item.name)).size).toBe(gear.length);
    for (const item of gear) expect(item.name, item.name).not.toMatch(/[{}[\]*~|]/u);
  });

  it("кожна річ має ціну або опис", () => {
    for (const item of gear) expect(item.price ?? item.description, item.name).toBeTruthy();
  });

  it("олія має ціну й правило кидка", () => {
    const oil = findItem(gear, "Олія");
    expect(oil.price).toBe("1 см");
    expect(oil.description).toContain("20 футів");
  });
});

it("2014: зведена таблиця справді дала ціну, вагу й місткість", () => {
  expect(findItem(gear2014, "Олія")).toMatchObject({ weight: "1 фнт", description: expect.stringContaining("вогняну шкоду") });
  expect(findItem(gear2014, "Мішок").description).toContain("Місткість: 1 кубічний фут");
  expect(findItem(gear2014, "Набір злодія").price).toBe("16 зм");
});
