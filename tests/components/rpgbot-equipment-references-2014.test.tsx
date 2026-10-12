import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import FeatureDescriptionPage from "@/app/rules/features/[catalog]/[slug]/page";
import { collectSupplementalReferences } from "@/lib/optimization/supplemental-hydration";
import { readingReferenceHref } from "@/lib/optimization/reading-reference-href";
import { hydrateArticleRevision } from "@/lib/optimization/content-hydration";
import { fixtureCorpus } from "@/lib/optimization/fixtures.test-helper";

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("404"); } }));
vi.mock("@/components/no-ai/ModeLink", () => ({ ModeLink: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("@/components/ui/FormattedDescription", () => ({ FormattedDescription: ({ content }: { content: string }) => <p>{content}</p> }));

const extract = JSON.parse(readFileSync("data/2014/source-extracts/equipment-phb-vrgr-2014.json", "utf8"));
const lock = JSON.parse(readFileSync("data/5etools/source-lock.json", "utf8"));
const hasMirror = existsSync("data/5etools/raw");
const references = collectSupplementalReferences("RULES_2014", []).filter((reference) => reference.kind === "equipment");

const expectedEquipment = [
  { engName: "Component Pouch", name: "Мішечок компонентів", slug: "component-pouch", book: "Книга Гравця (2014), с. 151", facts: ["водонепроникний шкіряний поясний мішечок", "25 зм", "2 фнт", "витрачається"] },
  { engName: "Explorer's Pack", name: "Набір мандрівника", slug: "explorers-pack", book: "Книга Гравця (2014), с. 151", facts: ["10 смолоскипів", "раціони на 10 днів", "50 футів конопляної мотузки", "10 зм", "59 фнт"] },
  { engName: "Monster Hunter's Pack", name: "Набір мисливця на монстрів", slug: "monster-hunters-pack", book: "Путівник Ван Ріхтена по Равенлофту, с. 34", facts: ["три деревʼяні кілки", "флягу святої води", "кайдани", "сталеве дзеркало", "3 смолоскипи", "33 зм", "48,5 фнт"] },
  { engName: "Flute", name: "Флейта", slug: "flute", book: "Книга Гравця (2014), с. 154", facts: ["2 зм", "1 фнт", "бонус майстерності", "чаротворчий фокус", "окремого володіння"] },
  { engName: "Druidic Focus", name: "Друїдське фокусування", slug: "druidic-focus", book: "Книга Гравця (2014), с. 151", facts: ["гілочка омели", "Деревʼяний посох | 5 зм | 4 фнт", "Тисовий жезл | 10 зм | 1 фнт", "тотем із пірʼя", "чаротворчий фокус"] },
  { engName: "Arcane Focus", name: "Містичне фокусування", slug: "arcane-focus", book: "Книга Гравця (2014), с. 151", facts: ["Кристал | 10 зм | 1 фнт", "Куля | 20 зм | 3 фнт", "Скіпетр | 10 зм | 2 фнт", "Посох | 5 зм | 4 фнт", "Жезл | 10 зм | 1 фнт", "деревʼяний прут на кшталт жезла", "Чародій, чорнокнижник або чарівник", "чаротворчий фокус"] },
  { engName: "Holy Symbol", name: "Священний символ", slug: "holy-symbol", book: "Книга Гравця (2014), с. 151", facts: ["Амулет | 5 зм | 1 фнт", "Емблема | 5 зм | -", "Reliquary (крихітна скринька) | 5 зм | 2 фнт", "фрагментом священного обряду", "тримати його в руці, носити на видноті або мати на щиті", "Клірик чи паладин"] },
];

describe("2014 equipment reading entries", () => {
  it("keeps the extract tied to the locked 5etools revision and file hashes", () => {
    expect(extract.revision).toBe(lock.revision);
    for (const [file, sha256] of Object.entries<string>(extract.files)) expect(sha256).toBe(lock.files[file].sha256);
  });

  it.skipIf(!hasMirror)("hashes the mirror files exactly as the extract records", () => {
    for (const [file, sha256] of Object.entries<string>(extract.files)) {
      expect(createHash("sha256").update(readFileSync(`data/5etools/raw/${file}`)).digest("hex")).toBe(sha256);
    }
  });

  it("records the PHB and VRGR entries in the extract", () => {
    expect(extract.entries.monsterHuntersPack.value.page).toBe(34);
    expect(extract.entries.monsterHuntersPack.value.otherSources).toEqual([{ source: "CoS", page: 209 }]);
    expect(extract.entries.druidicFocusGroup.value.items).toEqual(["Sprig of mistletoe|phb", "Totem|phb", "Wooden staff|phb", "Yew wand|phb"]);
    expect(extract.entries.arcaneFocusGroup.value.items).toEqual(["Crystal|phb", "Orb|phb", "Rod|phb", "Staff|phb", "Wand|phb"]);
    expect(extract.entries.holySymbolGroup.value.items).toEqual(["Amulet|phb", "Emblem|phb", "Reliquary|phb"]);
    expect(Object.values<{ value: { source?: string } }>(extract.entries).filter((entry) => entry.value.source).every((entry) => ["PHB", "VRGR"].includes(entry.value.source!))).toBe(true);
  });

  it.skipIf(!hasMirror)("extracts the PHB and VRGR entries verbatim from the locked files", () => {
    const rawItems = JSON.parse(readFileSync("data/5etools/raw/items.json", "utf8"));
    const rawBase = JSON.parse(readFileSync("data/5etools/raw/items-base.json", "utf8"));
    const pack = rawItems.item.find((item: { name: string; source: string }) => item.name === "Monster Hunter's Pack" && item.source === "VRGR");
    expect(extract.entries.monsterHuntersPack.value).toEqual(pack);
    expect(pack.page).toBe(34);
    expect(pack.otherSources).toEqual([{ source: "CoS", page: 209 }]);
    expect(extract.entries.flute.value).toEqual(rawBase.baseitem.find((item: { name: string; source: string }) => item.name === "Flute" && item.source === "PHB"));
    expect(extract.entries.druidicFocusGroup.value.items).toEqual(["Sprig of mistletoe|phb", "Totem|phb", "Wooden staff|phb", "Yew wand|phb"]);
    const rawGroups = rawItems.itemGroup as Array<{ name: string; source: string; items: string[] }>;
    expect(extract.entries.arcaneFocusGroup.value).toEqual(rawGroups.find((group) => group.name === "Arcane Focus" && group.source === "PHB"));
    expect(extract.entries.holySymbolGroup.value).toEqual(rawGroups.find((group) => group.name === "Holy Symbol" && group.source === "PHB"));
    expect(extract.entries.arcaneFocusGroup.value.items).toEqual(["Crystal|phb", "Orb|phb", "Rod|phb", "Staff|phb", "Wand|phb"]);
    expect(extract.entries.holySymbolGroup.value.items).toEqual(["Amulet|phb", "Emblem|phb", "Reliquary|phb"]);
    expect(extract.entries.reliquary.value).toEqual(rawItems.item.find((item: { name: string; source: string }) => item.name === "Reliquary" && item.source === "PHB"));
    expect(extract.entries.arcaneStaff.value).toEqual(rawBase.baseitem.find((item: { name: string; source: string; group?: string[] }) => item.name === "Staff" && item.source === "PHB" && item.group?.[0] === "Arcane Focus"));
    expect(Object.values<{ value: { source?: string } }>(extract.entries).filter((entry) => entry.value.source).every((entry) => ["PHB", "VRGR"].includes(entry.value.source!))).toBe(true);
  });

  it("provides exactly the seven Ukrainian names with full bodies", () => {
    expect(references.map((reference) => reference.engName).sort()).toEqual(expectedEquipment.map((entry) => entry.engName).sort());
    for (const expected of expectedEquipment) {
      const reference = references.find((entry) => entry.engName === expected.engName)!;
      expect(reference.name).toBe(expected.name);
      expect(reference.href).toBe(`/equipment?reference=${expected.slug}`);
      expect(reference.details.at(-1)).toEqual({ label: "Джерело", value: expected.book });
      for (const fact of expected.facts) expect(`${reference.description}\n${reference.details.map((detail) => detail.value).join("\n")}`, `${expected.engName}: ${fact}`).toContain(fact);
      expect(reference.description).not.toMatch(/Wizards|RPGbot|XPHB/);
    }
  });

  it.each(expectedEquipment)("opens $name on its reading page with source and no analysis block", async ({ slug, name, book }) => {
    const page = await FeatureDescriptionPage({ params: Promise.resolve({ catalog: "equipment", slug }) });
    const rendered = renderToStaticMarkup(page);
    expect(rendered).toContain(name);
    expect(rendered).toContain(book);
    expect(rendered).toContain('href="/rules"');
    expect(rendered).not.toContain("Аналіз RPGbot");
  });

  it("routes supplemental equipment links to the reading page", () => {
    expect(readingReferenceHref("/equipment?reference=flute")).toBe("/rules/features/equipment/flute");
    expect(readingReferenceHref("/equipment?reference=flute&ruleset=RULES_2024")).toBe("/equipment?reference=flute&ruleset=RULES_2024");
  });

  it.each(expectedEquipment)("links the author's marker for $engName to the full entry", ({ engName }) => {
    const revision = fixtureCorpus().translations[0];
    revision.sections[0].blocks = [{ type: "paragraph", blockId: "equipment-marker", content: [{ type: "text", text: `{{Назва|${engName.replace("'", "ʼ")}}}` }] }];
    const hydrated = hydrateArticleRevision(revision, references);
    const target = references.find((entry) => entry.engName === engName)!;
    expect(hydrated.sections[0].blocks[0]).toMatchObject({ content: [{ type: "link", text: "Назва", href: target.href }] });
  });
});
