import { describe, expect, it } from "vitest";
import { buildOmniSearchPanelRows, type OmniSearchPanelRowsInput } from "@/lib/search/omniSearchPanelRows";
import type { HomebrewSearchHit } from "@/server/db/homebrew-search-actions";
import type { UserSearchHit } from "@/server/db/pers-search-actions";

const HOMEBREW_SORCEROUS_BURST: HomebrewSearchHit = {
  entryId: 1,
  kind: "SPELL",
  title: "Чародійний сплеск 2014",
  subtitle: "Автор",
  badge: "Заклинання",
  href: "/homebrew/1",
};

const PERS_NAMED_SPLESK: UserSearchHit = { kind: "pers", id: 7, title: "Сплеск", subtitle: "Чарівник 3", href: "/pers/7" };

function buildInput(overrides: Partial<OmniSearchPanelRowsInput>): OmniSearchPanelRowsInput {
  return {
    query: "",
    ruleset: "RULES_2014",
    activeCategory: "ALL",
    personalResults: [],
    homebrewResults: [],
    ...overrides,
  };
}

function collectItemTitles(input: OmniSearchPanelRowsInput): string[] {
  return buildOmniSearchPanelRows(input).rows.flatMap((row) => (row.kind === "item" ? [row.item.title] : []));
}

describe("хоумбрю й персонажі ранжуються разом із каталогом", () => {
  it("точна назва хоумбрю стоїть першою, а не після збігу каталогу за ключовими словами", () => {
    const titles = collectItemTitles(
      buildInput({ query: "Чародійний сплеск 2014", homebrewResults: [HOMEBREW_SORCEROUS_BURST] }),
    );

    expect(titles[0]).toBe("Чародійний сплеск 2014");
    expect(titles).toContain("Таблиця сплесків дикої магії");
  });

  it("персонаж із точною назвою теж першим", () => {
    const titles = collectItemTitles(buildInput({ query: "сплеск", personalResults: [PERS_NAMED_SPLESK] }));
    expect(titles[0]).toBe("Сплеск");
  });

  it("фільтр каталогу ховає серверні рядки чужого каталогу", () => {
    const titles = collectItemTitles(
      buildInput({
        query: "Чародійний сплеск 2014",
        activeCategory: "rules",
        homebrewResults: [HOMEBREW_SORCEROUS_BURST],
      }),
    );
    expect(titles).not.toContain("Чародійний сплеск 2014");
  });
});

describe("підказка «є в іншій редакції»", () => {
  it("2014 без жодного збігу показує заклинання 2024 з адресою 2024", () => {
    const { rows, otherEdition } = buildOmniSearchPanelRows(buildInput({ query: "Sorcerous Burst" }));

    expect(otherEdition).toBe("2024");
    expect(rows[0]).toMatchObject({
      kind: "item",
      item: { title: "Чародійний сплеск", edition: "2024", href: expect.stringMatching(/^\/2024\/spells/) },
    });
  });

  it("не вмикається, коли в поточній редакції знайшлося хоч щось із каталогу", () => {
    const { otherEdition, rows } = buildOmniSearchPanelRows(buildInput({ query: "Чародійний сплеск" }));

    expect(otherEdition).toBeNull();
    expect(rows.every((row) => row.kind !== "item" || !row.item.edition?.includes("2024"))).toBe(true);
  });

  it("не вмикається, коли в поточній редакції знайшлося лише хоумбрю", () => {
    const { otherEdition } = buildOmniSearchPanelRows(
      buildInput({ query: "Sorcerous Burst", homebrewResults: [{ ...HOMEBREW_SORCEROUS_BURST, title: "Sorcerous Burst" }] }),
    );
    expect(otherEdition).toBeNull();
  });

  it("працює й у зворотний бік: із 2024 на 2014", () => {
    const { otherEdition, rows } = buildOmniSearchPanelRows(buildInput({ query: "Chaos Bolt", ruleset: "RULES_2024" }));
    expect(otherEdition).toBe("2014");
    expect(rows[0]).toMatchObject({ kind: "item", item: { title: "Снаряд хаосу", href: expect.stringMatching(/^\/spells/) } });
  });

  it("не показує більше трьох рядків і жодного ярлика каталогу", () => {
    const { rows } = buildOmniSearchPanelRows(buildInput({ query: "Sorcerous" }));
    expect(rows.length).toBeLessThanOrEqual(3);
    expect(rows.every((row) => row.kind === "item" && !row.item.id.includes("category-"))).toBe(true);
  });

  it("порожньо в обох редакціях — порожньо й без підказки", () => {
    expect(buildOmniSearchPanelRows(buildInput({ query: "щзфхъжэ" }))).toEqual({ rows: [], otherEdition: null });
  });
});
