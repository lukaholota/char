// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { ArticleIndex } from "@/components/optimization/ArticleIndex";
import { ArticleReader } from "@/components/optimization/ArticleReader";
import { groupDraftSummaries, resolveArticleLink } from "@/lib/optimization/article-view";
import { readDraftArticle } from "@/lib/optimization/draft-reader";

afterEach(cleanup);

const RULE_CATEGORIES = [{ key: "combat", title: "Бій" }, { key: "spellcasting", title: "Чарування" }];

const MONK_2014_SLUGS = [
  "monk-2014", "monk-subclasses-2014", "monk-astral-self-2014", "monk-drunken-master-2014", "monk-four-elements-2014",
  "monk-kensei-2014", "monk-open-hand-2014", "monk-shadow-2014", "monk-sun-soul-2014", "monk-way-of-mercy-2014",
  "monk-way-of-the-long-death-2014", "monk-ascendant-dragon-2014",
];

async function readSummaries() {
  return (await readDraftArticle("monk-2014"))!.summaries;
}

async function renderDraft(slug: string) {
  const { summaries, ...draft } = (await readDraftArticle(slug))!;
  const groups = groupDraftSummaries(summaries.filter((summary) => summary.ruleset === draft.article.ruleset));
  const view = render(<ArticleReader {...draft} groups={groups} ruleCategories={RULE_CATEGORIES} />);
  return { draft, ...view };
}

const FIGHTER_2014_SLUGS = [
  "fighter-subclasses-2014", "fighter-arcane-archer-2014", "fighter-battle-master-2014", "fighter-cavalier-2014",
  "fighter-echo-knight-2014", "fighter-eldritch-knight-2014", "fighter-eldritch-knight-spells-2014", "fighter-psi-warrior-2014",
  "fighter-purple-dragon-knight-2014", "fighter-rune-knight-2014", "fighter-samurai-2014",
];

async function expectDraftFullyRendered(slug: string) {
  const { draft, container } = await renderDraft(slug);
  const blocks = draft.revision.sections.flatMap((section) => section.blocks);
  const itemCount = blocks.reduce((sum, block) => sum + (block.type === "list" ? block.items.length : 0), 0);

  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(draft.article.titleUk);
  expect(container.querySelectorAll("table")).toHaveLength(blocks.filter((block) => block.type === "table").length);
  expect(container.querySelectorAll("p[id^='block-']")).toHaveLength(blocks.filter((block) => block.type === "paragraph").length);
  expect(container.querySelectorAll("[data-article-content] li")).toHaveLength(itemCount);
  const legendBadges = container.querySelectorAll("#section-disclaimer [data-rating-tone]").length;
  expect(container.querySelectorAll("[data-article-content] [data-rating-tone]").length - legendBadges).toBe(draft.ratings.length);
}

const BARBARIAN_2014_SLUGS = [
  "barbarian-2014", "barbarian-subclasses-2014", "barbarian-ancestral-guardian-2014", "barbarian-battlerager-2014", "barbarian-path-of-the-beast-2014",
  "barbarian-path-of-the-giant-2014", "barbarian-path-of-wild-magic-2014", "barbarian-storm-herald-2014",
  "barbarian-totem-warrior-2014", "barbarian-zealot-2014",
];

describe("читач чернетки: Варвар 2014", () => {
  it.each(BARBARIAN_2014_SLUGS)("%s: показує все, що є в даних", expectDraftFullyRendered);
});

const ROGUE_2014_SLUGS = [
  "rogue-2014", "rogue-subclasses-2014", "rogue-arcane-trickster-2014", "rogue-arcane-trickster-spells-2014", "rogue-assassin-2014",
  "rogue-inquisitive-2014", "rogue-mastermind-2014", "rogue-phantom-2014", "rogue-scout-2014", "rogue-soulknife-2014",
  "rogue-swashbuckler-2014",
];

describe("читач чернетки: Пройдисвіт 2014", () => {
  it.each(ROGUE_2014_SLUGS)("%s: показує все, що є в даних", expectDraftFullyRendered);
});

const WIZARD_2014_SLUGS = [
  "wizard-2014", "wizard-subclasses-2014", "wizard-spells-2014", "wizard-abjuration-2014", "wizard-bladesinging-2014",
  "wizard-chronurgy-magic-2014", "wizard-conjuration-2014", "wizard-divination-2014",
  "wizard-enchantment-2014", "wizard-evoker-2014", "wizard-graviturgy-magic-2014", "wizard-illusion-2014",
  "wizard-necromancy-2014", "wizard-scribes-2014", "wizard-transmutation-2014",
  "wizard-war-magic-2014",
];

describe("читач чернетки: Чарівник 2014", () => {
  it.each(WIZARD_2014_SLUGS)("%s: показує все, що є в даних", expectDraftFullyRendered);
});

const CLERIC_2014_SLUGS = [
  "cleric-2014", "cleric-subclasses-2014", "cleric-spells-2014", "cleric-arcana-domain-2014", "cleric-death-2014", "cleric-forge-2014",
  "cleric-grave-2014", "cleric-knowledge-domain-2014", "cleric-life-domain-2014", "cleric-light-domain-2014", "cleric-nature-2014",
  "cleric-order-2014", "cleric-peace-domain-2014", "cleric-tempest-domain-2014",
  "cleric-trickery-domain-2014", "cleric-twilight-2014", "cleric-war-domain-2014",
];

describe("читач чернетки: Клірик 2014", () => {
  it.each(CLERIC_2014_SLUGS)("%s: показує все, що є в даних", expectDraftFullyRendered);
});

const WARLOCK_2014_SLUGS = [
  "warlock-2014", "warlock-archfey-2014", "warlock-celestial-2014", "warlock-fathomless-2014", "warlock-fiend-2014", "warlock-genie-2014",
  "warlock-great-old-one-2014", "warlock-invocations-2014", "warlock-pact-boons-2014", "warlock-spells-2014",
  "warlock-hexblade-2014",
  "warlock-subclasses-2014", "warlock-undead-2014", "warlock-undying-2014",
];

describe("читач чернетки: Чорнокнижник 2014", () => {
  it.each(WARLOCK_2014_SLUGS)("%s: показує все, що є в даних", expectDraftFullyRendered);
});

const DRUID_2014_SLUGS = [
  "druid-2014", "druid-circle-of-dreams-2014", "druid-circle-of-stars-2014", "druid-circle-of-the-land-2014",
  "druid-circle-of-wildfire-2014", "druid-moon-2014", "druid-spells-2014", "druid-subclasses-2014",
  "druid-circle-of-spores-2014", "druid-circle-of-the-shepherd-2014",
  "druid-wild-shape-2014",
];

describe("читач чернетки: Друїд 2014", () => {
  it.each(DRUID_2014_SLUGS)("%s: показує все, що є в даних", expectDraftFullyRendered);
});

const SORCERER_2014_SLUGS = [
  "sorcerer-2014", "sorcerer-metamagic-2014", "sorcerer-spells-2014", "sorcerer-subclasses-2014",
];

describe("читач чернетки: Чародій 2014", () => {
  it.each(SORCERER_2014_SLUGS)("%s: показує все, що є в даних", expectDraftFullyRendered);
});

const BARD_2014_SLUGS = [
  "bard-spells-2014", "bard-2014", "bard-subclasses-2014", "bard-creation-2014",
  "bard-eloquence-2014", "bard-glamour-2014", "bard-lore-2014", "bard-spirits-2014",
  "bard-swords-2014", "bard-valor-2014", "bard-whispers-2014",
];

describe("читач чернетки: Бард 2014", () => {
  it.each(BARD_2014_SLUGS)("%s: показує все, що є в даних", expectDraftFullyRendered);
});

const PALADIN_2014_SLUGS = [
  "paladin-2014", "paladin-subclasses-2014", "paladin-spells-2014",
  "paladin-oath-of-vengeance-2-2014", "paladin-oath-of-vengeance-2014", "paladin-oathbreaker-2014",
  "paladin-oath-of-conquest-2014", "paladin-oath-of-devotion-2014", "paladin-oath-of-glory-2014", "paladin-oath-of-redemption-2014",
  "paladin-oath-of-the-ancients-2014", "paladin-oath-of-the-crown-2014", "paladin-oath-of-the-watchers-2014",
];

describe("читач чернетки: Паладин 2014", () => {
  it.each(PALADIN_2014_SLUGS)("%s: показує все, що є в даних", expectDraftFullyRendered);
});

describe("читач чернетки: Воїн 2014", () => {
  it.each(FIGHTER_2014_SLUGS)("%s: показує все, що є в даних", expectDraftFullyRendered);
});

describe("читач чернетки: Монах 2014", () => {
  it.each(MONK_2014_SLUGS)("%s: показує все, що є в даних", expectDraftFullyRendered);

  it("клас: числом і словом пояснює оцінку, є легенда, а підказка з оригіналом лишається", async () => {
    const { container } = await renderDraft("monk-2014");
    expect(screen.getAllByText("4/4 Чудово", { exact: false }).length).toBeGreaterThan(0);
    expect(container.querySelector("#section-class-features [data-rating-tone='blue'] .sr-only")?.textContent).toMatch(/^Оцінка «.+»: 4 з 4, чудово/);
    expect(screen.getAllByRole("button", { name: /Хіт Поїнти — Hit Points/ }).length).toBeGreaterThan(0);
    expect(screen.getByText("Оцінки RPGbot:")).toBeTruthy();
  });

  it("клас: розділи є картками, а бічний зміст веде на ці картки", async () => {
    const { draft, container } = await renderDraft("monk-2014");
    const toc = screen.getByRole("navigation", { name: "Зміст довідника" });
    const targets = within(toc).getAllByRole("link").map((link) => link.getAttribute("href")!).filter((href) => href.startsWith("#")).map((href) => href.slice(1));
    expect(targets.length).toBeGreaterThan(25);
    for (const sectionId of targets) expect(container.querySelector(`section[id="${sectionId}"]`), sectionId).not.toBeNull();
    expect(container.querySelectorAll("[data-article-content] > section").length).toBeGreaterThan(10);
    expect(draft.sourceUrl).toBeDefined();
  });

  it("бічний зміст показує інші статті Монаха, виділяє поточну й веде в довідник", async () => {
    await renderDraft("monk-2014");
    const toc = screen.getByRole("navigation", { name: "Зміст довідника" });
    expect(within(toc).getByText("Монах", { selector: "p" })).toBeTruthy();
    expect(within(toc).getAllByRole("link", { name: /Шлях/ }).length).toBeGreaterThanOrEqual(9);
    expect(within(toc).getByRole("link", { current: "page" }).getAttribute("href")).toBe("/rules/optimization/monk-2014");
    expect(within(toc).getByRole("link", { name: "Бій" }).getAttribute("href")).toBe("/rules/combat");
  });

  it("пошук у змісті лишає лише збіги серед статей і розділів поточної статті", async () => {
    await renderDraft("monk-2014");
    const toc = screen.getByRole("navigation", { name: "Зміст довідника" });
    const before = within(toc).getAllByRole("link").length;
    fireEvent.change(screen.getByPlaceholderText("Пошук у статтях..."), { target: { value: "Навички" } });
    const titles = within(toc).getAllByRole("link").map((link) => link.textContent);
    expect(titles.length).toBeLessThan(before);
    expect(titles.some((title) => title?.includes("Навички Монаха"))).toBe(true);
    fireEvent.change(screen.getByPlaceholderText("Пошук у статтях..."), { target: { value: "такого немає ніде" } });
    expect(screen.getByText("Нічого не знайдено.")).toBeTruthy();
  });

  it("клас: посилання між перекладеними сторінками лишаються всередині довідника", async () => {
    const { draft, container } = await renderDraft("monk-2014");
    expect(container.querySelectorAll("[data-article-content] a[href^='/rules/optimization/']").length).toBeGreaterThan(5);
    const external = container.querySelectorAll("[data-article-content] a[href^='https://']");
    expect(external.length).toBeGreaterThan(0);
    for (const link of external) {
      expect(link.getAttribute("rel")).toBe("noreferrer");
      expect(resolveArticleLink(link.getAttribute("href")!, draft.linkTargets).isExternal, link.getAttribute("href")!).toBe(true);
    }
  });

  it("клас: таблиці прокручуються з клавіатури й мають назву", async () => {
    const { container } = await renderDraft("monk-2014");
    const regions = container.querySelectorAll("div[role='region'][tabindex='0']");
    expect(regions.length).toBeGreaterThan(0);
    for (const region of regions) expect(region.getAttribute("aria-label")).toMatch(/^Таблиця: .+/);
  });

  it("публічний гайд 2014 має авторів і навігацію без банера приватної чернетки", async () => {
    await renderDraft("monk-shadow-2014");
    expect(screen.queryByText(/Приватна чернетка, не опублікована/)).toBeNull();
    expect(screen.getByText('T.E. "RPGBOT" Kamstra')).toBeTruthy();
    const crumbs = screen.getByRole("navigation", { name: "Навігація" });
    expect(within(crumbs).getByRole("link", { name: "Довідник правил" }).getAttribute("href")).toBe("/rules");
    expect(within(crumbs).getByRole("link", { name: "Аналітика RPGbot" }).getAttribute("href")).toBe("/rules/optimization");
  });
});

describe("читач чернетки: оформлення оцінок і посилань", () => {
  it("легенда пояснює оцінки тими самими бейджами, що стоять у тексті", async () => {
    const { container } = await renderDraft("monk-2014");
    const items = container.querySelectorAll("#section-disclaimer li");
    const tones = [...items].slice(0, 4).map((item) => item.querySelector("[data-rating-tone]")?.getAttribute("data-rating-tone"));
    expect(tones).toEqual(["red", "orange", "green", "blue"]);
    expect(items[0].querySelector("[data-rating-label]")?.textContent).toBe("Червоний");
  });

  it("назва оцінки жирна й має колір оцінки, а решта абзацу лишається звичайною", async () => {
    const { container } = await renderDraft("monk-2014");
    const label = [...container.querySelectorAll("#section-class-features [data-rating-label]")].find((element) => element.textContent?.startsWith("Хіт Поїнти"));
    expect(label?.className).toContain("font-semibold");
    expect(label?.className).toContain("text-orange-300");
    expect(label?.nextSibling?.textContent).toMatch(/^: з Кубиком Здоровʼя/);
    expect(container.querySelectorAll("#section-class-features [data-rating-label]").length).toBeGreaterThan(5);
  });

  it("пов'язані статті у вступі стають картками: свої — всередині довідника, чужі — назовні", async () => {
    const { container } = await renderDraft("monk-2014");
    const cards = [...container.querySelectorAll<HTMLAnchorElement>("#section-introduction [data-link-card]")];
    expect(cards).toHaveLength(5);
    expect(cards[0].getAttribute("target")).toBe("_blank");
    expect(cards[0].textContent).toContain("RPGbot — оригінал англійською");
    const own = cards.find((card) => card.textContent?.includes("Гайд про підкласи Монаха"));
    expect(own?.getAttribute("href")).toBe("/rules/optimization/monk-subclasses-2014");
    expect(own?.textContent).toContain("Український переклад");
  });

  it("посилання-абзаци порівняльної статті — теж картки, а зміст статті лишається списком", async () => {
    const comparison = await renderDraft("monk-subclasses-2014");
    expect(comparison.container.querySelectorAll("[data-article-content] p > [data-link-card]").length).toBe(9);
    expect(comparison.container.querySelectorAll("#section-2 [data-rating-tone]")).toHaveLength(0);
    expect(comparison.container.querySelector("#section-mercy [data-rating-tone]")?.textContent).toContain("4/4");
    comparison.unmount();
    const champion = await renderDraft("champion-2014");
    expect(champion.container.querySelectorAll("[data-link-card]")).toHaveLength(0);
  });

  it("MAD пояснюється підказкою з розшифровкою", async () => {
    await renderDraft("monk-2014");
    const [term] = screen.getAllByRole("button", { name: /MAD — Multiple Ability Dependent\. Залежність від багатьох характеристик/ });
    fireEvent.click(term);
    expect(screen.getByRole("tooltip").textContent).toContain("Multiple Ability Dependent");
    expect(screen.getByRole("tooltip").textContent).toContain("бали доводиться ділити");
  });
});

describe("індекс аналітики", () => {
  it("2014: групує статті за темою й веде на читач у довіднику", async () => {
    const summaries = (await readSummaries()).filter((summary) => summary.ruleset === "RULES_2014");
    const { container } = render(<ArticleIndex ruleset="RULES_2014" summaries={summaries} ruleCategories={RULE_CATEGORIES} />);
    const main = container.querySelector<HTMLElement>("[data-article-content]")!;
    expect(within(main).getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toContain("Монах");
    const link = within(main).getByRole("link", { name: /Монах — класовий гайд D&D 5e 2014/ });
    expect(link.getAttribute("href")).toBe("/rules/optimization/monk-2014");
  });

  it("2014: описує індекс як відкритий, а 2024 лишає приватним", async () => {
    const { container, unmount } = render(<ArticleIndex ruleset="RULES_2014" summaries={[]} ruleCategories={RULE_CATEGORIES} />);
    expect(container.textContent).toContain("Каталог відкритий для всіх.");
    expect(container.textContent).not.toContain("лише ви");
    unmount();
    const owner = render(<ArticleIndex ruleset="RULES_2024" summaries={[]} ruleCategories={RULE_CATEGORIES} />);
    expect(owner.container.textContent).toContain("Їх бачите лише ви; публічного каталогу ще немає.");
  });

  it("2024: веде в довідник 2024", async () => {
    const summaries = (await readSummaries()).filter((summary) => summary.ruleset === "RULES_2024");
    const { container } = render(<ArticleIndex ruleset="RULES_2024" summaries={summaries} ruleCategories={RULE_CATEGORIES} />);
    const first = within(container.querySelector<HTMLElement>("[data-article-content]")!).getAllByRole("link")[0];
    expect(first.getAttribute("href")).toMatch(/^\/2024\/rules\/optimization\//);
    expect(screen.getByRole("link", { name: "Бій" }).getAttribute("href")).toBe("/2024/rules/combat");
  });

  it("порожня редакція показує пояснення, а не порожнечу", () => {
    render(<ArticleIndex ruleset="RULES_2024" summaries={[]} ruleCategories={RULE_CATEGORIES} />);
    expect(screen.getByText("Чернеток для цієї редакції ще немає.")).toBeTruthy();
  });
});
