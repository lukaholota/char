// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NoAiModeProvider } from "@/components/no-ai/NoAiModeProvider";
import { InlineContent } from "@/components/optimization/InlineContent";
import { ContentReferenceProvider } from "@/components/optimization/ContentReferenceProvider";
import { SessionContext } from "next-auth/react";
import { readSliceArticle, readSlicePreview } from "@/lib/optimization/slice-reader";
import { hydrateArticleDocument } from "@/lib/optimization/hydration-catalog";
import { ArticleBlock } from "@/components/optimization/ArticleBlocks";
import { buildRatingIndex } from "@/lib/optimization/article-view";
import type { ContentReference, InlineNode } from "@/lib/optimization/types";
import { getWeaponByIdOrSlug } from "@/lib/weaponsData";
import { getArmorByIdOrSlug } from "@/lib/armorData";
import { Suspense } from "react";

const mocks = vi.hoisted(() => ({ pathname: "/rules/optimization/monk-2014", openSpellLink: vi.fn(), openTermLink: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));
// The site bundles the App Router `next/dynamic`, which suspends; the package entry is the pages one.
vi.mock("next/dynamic", async () => ({ default: (await import("next/dist/shared/lib/app-dynamic")).default }));
vi.mock("@/lib/spell-link", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/spell-link")>()), openSpellLink: mocks.openSpellLink }));
vi.mock("@/lib/term-link", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/term-link")>()), openTermLink: mocks.openTermLink }));

afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); mocks.pathname = "/rules/optimization/monk-2014"; });

function renderLinks(nodes: InlineNode[], references: ContentReference[] = []) {
  return render(<NoAiModeProvider><ContentReferenceProvider references={references} surface="article_reader">
    <InlineContent nodes={nodes} resolveLink={(href) => ({ href, isExternal: href.startsWith("http") })} linkClassName="text-slate-100" ruleset="RULES_2014" />
  </ContentReferenceProvider></NoAiModeProvider>);
}

it("expands the official Ukrainian variant inside a shared-feature modal", async () => {
  const options: ContentReference[] = ["Боєць", "Монах"].map((name) => ({ kind: "feature", name: "Додаткова атака", engName: "Extra Attack", href: `/classes?class=${name}`, description: `Опис: ${name}`, details: [{ label: "Клас", value: name }] }));
  const reference: ContentReference = { kind: "feature", name: "Додаткова атака", engName: "Extra Attack", href: "/classes?reference=extra-attack", details: [], options };
  renderLinks([{ type: "link", text: reference.name, href: reference.href }], [reference]);
  fireEvent.click(screen.getByRole("link", { name: reference.name }));
  const dialog = await screen.findByRole("dialog");
  const summary = within(dialog).getByText("Додаткова атака · Клас: Монах");
  expect(summary.closest("details")?.open).toBe(false);
  fireEvent.click(summary);
  expect(summary.closest("details")?.open).toBe(true);
  expect(within(summary.closest("details")!).getByText("Опис: Монах")).toBeTruthy();
  expect(within(dialog).queryByText("Аналіз RPGbot")).toBeNull();
});

it("opens canonical spell and term modals with their explicit edition", () => {
  renderLinks([{ type: "link", text: "Вогняна куля", href: "/2024/spells/fireball" }, { type: "link", text: "Отруєний", href: "/rules/conditions#condition-poisoned" }]);
  fireEvent.click(screen.getByRole("link", { name: "Вогняна куля" }));
  expect(mocks.openSpellLink).toHaveBeenCalledWith({ ruleset: "RULES_2024", spellKey: "fireball" });
  fireEvent.click(screen.getByRole("link", { name: "Отруєний" }));
  expect(mocks.openTermLink).toHaveBeenCalledWith({ ruleset: "RULES_2014", original: "Poisoned" });
});

it("opens the official feature over the article and retains a catalog fallback", async () => {
  const reference: ContentReference = { kind: "feature", name: "Тіньовий крок", engName: "Shadow Step", href: "/classes?class=monk&subclass=way-of-shadow&feature=shadow-step-6", description: "Офіційний текст телепортації", details: [{ label: "Рівень", value: "6" }] };
  renderLinks([{ type: "link", text: reference.name, href: reference.href }], [reference]);
  fireEvent.click(screen.getByRole("link", { name: reference.name }));
  await screen.findByRole("dialog");
  expect(screen.getByText(reference.description!)).toBeTruthy();
  expect(screen.getByRole("link", { name: "Відкрити в каталозі" }).getAttribute("href")).toBe(reference.href);
});

it("loads the catalog weapon card only on click and keeps no-AI in the link", async () => {
  mocks.pathname = "/no-ai/rules/optimization/monk-2014";
  const weapon = getWeaponByIdOrSlug("longbow")!;
  const fetch = vi.fn(async () => ({ ok: true, json: async () => ({ catalog: "weapon", weapon }) }));
  vi.stubGlobal("fetch", fetch);
  const reference: ContentReference = { kind: "weapon", name: "Довгий лук", engName: "Longbow", href: "/weapons/longbow", details: [] };
  renderLinks([{ type: "link", text: reference.name, href: reference.href }], [reference]);
  await waitFor(() => expect(screen.getByRole("link", { name: reference.name }).getAttribute("href")).toBe("/no-ai/weapons/longbow"));
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("link", { name: reference.name }));
  const dialog = await screen.findByRole("dialog");
  expect(await within(dialog).findByText("Шкода")).toBeTruthy();
  expect(within(dialog).getAllByText(new RegExp(weapon.damage!)).length).toBeGreaterThan(0);
  expect(within(dialog).getByText("Дворучна [Two-Handed]")).toBeTruthy();
  expect(within(dialog).getByText("Книга Гравця (2014)")).toBeTruthy();
  expect(within(dialog).queryByText("Вага / Ціна")).toBeNull();
  expect(String(fetch.mock.calls[0][0])).toBe("/api/reference-card?href=%2Fweapons%2Flongbow");
});

it("keeps the article on screen while the card code loads, so the page does not jump to the top", async () => {
  const armor = getArmorByIdOrSlug("chain-mail")!;
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ catalog: "armor", armor }) })));
  const reference: ContentReference = { kind: "armor", name: "Кольчуга", engName: "Chain Mail", href: "/armor/chain-mail", details: [] };
  const { container } = render(<Suspense fallback={null}><div data-testid="article">
    <NoAiModeProvider><ContentReferenceProvider references={[reference]} surface="article_reader">
      <InlineContent nodes={[{ type: "link", text: reference.name, href: reference.href }]} resolveLink={(href) => ({ href, isExternal: false })} linkClassName="text-slate-100" ruleset="RULES_2014" />
    </ContentReferenceProvider></NoAiModeProvider>
  </div></Suspense>);
  const hiddenStyles: string[] = [];
  const observer = new MutationObserver((records) => records.forEach((record) => {
    const style = (record.target as HTMLElement).getAttribute("style") ?? "";
    if (style.includes("display: none")) hiddenStyles.push(style);
  }));
  observer.observe(container, { subtree: true, attributes: true, attributeFilter: ["style"] });
  fireEvent.click(screen.getByRole("link", { name: reference.name }));
  const dialog = await screen.findByRole("dialog");
  await within(dialog).findByRole("heading", { level: 1, name: "Кольчуга" }, { timeout: 5000 });
  observer.disconnect();
  expect(hiddenStyles).toEqual([]);
});

it("underlines dialog links and turns links that leave the page into badges", () => {
  const reference: ContentReference = { kind: "feature", name: "Тіньовий крок", engName: "Shadow Step", href: "/classes?class=monk&feature=shadow-step-6", description: "Текст", details: [] };
  renderLinks([
    { type: "link", text: reference.name, href: reference.href },
    { type: "link", text: "Гайд Монаха", href: "/rules/optimization/monk-2014" },
    { type: "link", text: "Оригінал", href: "https://rpgbot.net/dnd5/" },
  ], [reference]);
  const dialogLink = screen.getByRole("link", { name: reference.name });
  expect(dialogLink.className).toContain("underline");
  expect(dialogLink.querySelector("svg")).toBeNull();
  const pageLink = screen.getByRole("link", { name: "Гайд Монаха" });
  expect(pageLink.className).toContain("no-underline");
  expect(pageLink.querySelector("svg")).not.toBeNull();
  const tabLink = screen.getByRole("link", { name: /Оригінал/ });
  expect(tabLink.getAttribute("target")).toBe("_blank");
  expect(tabLink.textContent).toContain("відкриється в новій вкладці");
});

it("keeps English glossary markers as tooltips when they have no explicit link", () => {
  renderLinks([{ type: "text", text: "{{Приклад|Example}}" }]);
  expect(screen.queryByRole("link")).toBeNull();
  expect(screen.getByRole("button", { name: "Приклад — Example" })).toBeTruthy();
});

it("opens only the official text from the article without fetching or repeating RPGbot analysis", async () => {
  const entity = { ruleset: "RULES_2014", kind: "subclass", parentKey: "MONK_2014", entityKey: "WAY_OF_MERCY" } as const;
  const preview = (await readSlicePreview(entity))!;
  const document = await hydrateArticleDocument((await readSliceArticle("monk-subclasses-2014", "RULES_2014"))!);
  const feature = preview.features[0];
  const reference = document.contentReferences.find((entry) => entry.feature?.featureKey === feature.binding.entity.entityKey)!;
  const fetch = vi.fn(async () => ({ ok: true, json: async () => preview }));
  vi.stubGlobal("fetch", fetch);
  const owner = { data: { user: { email: "lukagolota1@gmail.com" }, expires: "2099-01-01T00:00:00Z" }, status: "authenticated" as const, update: vi.fn() };
  render(<NoAiModeProvider><SessionContext.Provider value={owner}><ContentReferenceProvider references={[reference]} surface="article_reader">
    <InlineContent nodes={[{ type: "link", text: reference.name, href: reference.href }]} resolveLink={(href) => ({ href, isExternal: false })} linkClassName="text-slate-100" ruleset="RULES_2014" />
  </ContentReferenceProvider></SessionContext.Provider></NoAiModeProvider>);
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("link", { name: reference.name }));
  await screen.findByRole("dialog");
  expect(screen.queryByRole("button", { name: `Аналіз RPGbot: ${feature.name}` })).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});

it.each([
  ["Додаткові володіння", /Ви отримуєте володіння навичкою Виступ/],
  ["Пʼяна техніка", /Щоразу, коли ви використовуєте Шквал ударів/],
  ["Хитка хода", /Ви рухаєтеся хистко й непередбачувано/],
  ["Підскок на ноги", /вам потрібно лише 5 футів руху/],
  ["Перенаправлення атаки", /Коли істота промахується по вам атакою/],
  ["Удача пʼяниці", /ви можете витратити 2 очки кі/],
  ["Спʼяніла лють", /до трьох додаткових ударів без зброї/],
])("opens the official Ukrainian text for %s in the actual Drunken Master article", async (name, expectedText) => {
  const document = await hydrateArticleDocument((await readSliceArticle("monk-drunken-master-2014", "RULES_2014"))!);
  const section = document.translations.at(-1)!.sections.find((section) => section.sectionId === "section-features")!;
  const context = { ratingIndex: buildRatingIndex(document.ratings, section.blocks), ratings: document.ratings,
    resolveLink: (href: string) => ({ href, isExternal: false }), linkClassName: "text-blue-300",
    ownArticlePath: "/rules/optimization/monk-drunken-master-2014", headingLevel: 2, sectionHeading: section.heading, ruleset: "RULES_2014" as const };
  render(<NoAiModeProvider><ContentReferenceProvider references={document.contentReferences} surface="article_reader">
    {section.blocks.map((block) => <ArticleBlock key={block.blockId} block={block} context={context} />)}
  </ContentReferenceProvider></NoAiModeProvider>);
  fireEvent.click(screen.getAllByRole("link", { name: String(name) })[0]);
  await screen.findByRole("dialog");
  expect(screen.getByText(expectedText)).toBeTruthy();
});
