import { describe, it, expect } from "vitest";
import {
  BASTION_LEVELS,
  BastionFacilityData,
  CORE_BASTION_SOURCE,
  describeHirelings,
  getAllBastionFacilities,
  getBastionFacilityBySlug,
  translateOrder,
  translateSpace,
} from "@/lib/bastionsData";
import { buildOmniSearchIndex } from "@/lib/omniSearchData";
import { collectHomeCategories } from "@/components/home/homeCategories";
import sitemap from "@/app/sitemap";
import {
  bastionOrderTranslations,
  bastionSpaceTranslations,
  sourceTranslations,
} from "@/lib/refs/translation";
import { findGlossaryMarkers, stripGlossaryMarkers } from "@/lib/refs/glossary-marker";
import { stripSpellAnchors } from "@/lib/spell-link";

const facilities = getAllBastionFacilities();
const core = facilities.filter((facility) => facility.source === CORE_BASTION_SOURCE);

/// Прибирає те, чому англійська дозволена: оригінали в маркерах Р20, назви заклинань та
/// предметів у квадратних дужках і маршрут каталогу в якорі на заклинання (O25, KR25.4) — той
/// самий дозвіл, що й у гейті спорядження. Усе, що лишилося латиницею, — недоперекладений запис.
const stripAllowedEnglish = (text: string) =>
  stripSpellAnchors(stripGlossaryMarkers(text)).replace(/\[[^\]]*\]/g, "");

const ukrainianFieldsOf = (facility: BastionFacilityData) =>
  [facility.name, facility.shortDescription, facility.prerequisiteText, facility.description];

describe("KR19.1 — каталог приміщень бастіону", () => {
  it("несе всі 61 приміщення дзеркала, з них ядро DMG 2024 — 29 спеціальних і 6 базових", () => {
    expect(facilities).toHaveLength(61);
    expect(core.filter((facility) => facility.facilityType === "special")).toHaveLength(29);
    expect(core.filter((facility) => facility.facilityType === "basic")).toHaveLength(6);
  });

  it("розкладає спеціальні приміщення ядра за рівнями 5 / 9 / 13 / 17", () => {
    const byLevel = BASTION_LEVELS.map(
      (level) => core.filter((facility) => facility.level === level).length
    );

    expect(byLevel).toEqual([9, 10, 6, 4]);
    expect(core.filter((facility) => facility.facilityType === "special").length).toBe(
      byLevel.reduce((sum, amount) => sum + amount, 0)
    );
  });

  it("дає кожному приміщенню слаґ, українську назву й опис", () => {
    for (const facility of facilities) {
      expect(facility.slug).toMatch(/^[a-z0-9-]+$/);
      expect(facility.name).toMatch(/[Ѐ-ӿ]/);
      expect(facility.name).not.toMatch(/[a-zA-Z]/);
      expect(facility.shortDescription).toMatch(/[Ѐ-ӿ]/);
      expect(facility.description.length).toBeGreaterThan(40);
      expect(getBastionFacilityBySlug(facility.slug)?.engName).toBe(facility.engName);
    }
  });

  it("не лишає англійської в жодному українському полі", () => {
    for (const facility of facilities) {
      for (const field of ukrainianFieldsOf(facility)) {
        expect(stripAllowedEnglish(field)).not.toMatch(/[a-zA-Z]/);
      }
    }
  });

  it("тримає передумову виразом, а не текстом, і перекладає її", () => {
    const withPrerequisite = facilities.filter((facility) => facility.prerequisite);
    expect(withPrerequisite).toHaveLength(25);

    for (const facility of withPrerequisite) {
      expect(facility.prerequisite!.allOf.length).toBeGreaterThan(0);
      for (const group of facility.prerequisite!.allOf) {
        expect(group.length).toBeGreaterThan(0);
        for (const requirement of group) expect(requirement.kind).toBeTruthy();
      }
      expect(facility.prerequisiteText).toMatch(/[Ѐ-ӿ]/);
    }

    const warRoom = facilities.find((facility) => facility.engName === "War Room");
    expect(warRoom?.prerequisite).toEqual({
      allOf: [
        [
          { kind: "feature", featureEng: "Fighting Style" },
          { kind: "feature", featureEng: "Unarmored Defense" },
        ],
      ],
    });
  });

  it("бере накази й розміри простору лише з затверджених мап", () => {
    const orders = Object.values(bastionOrderTranslations);
    const spaces = Object.values(bastionSpaceTranslations);

    for (const facility of facilities) {
      expect(facility.space.length).toBeGreaterThan(0);
      for (const space of facility.space) expect(spaces).toContain(translateSpace(space));
      for (const order of facility.orders) expect(orders).toContain(translateOrder(order));
      expect(describeHirelings(facility.hirelings)).not.toBe("");
    }
  });

  it("показує кожне джерело українською назвою книги", () => {
    for (const source of new Set(facilities.map((facility) => facility.source))) {
      expect(sourceTranslations[source as keyof typeof sourceTranslations]).toMatch(/[Ѐ-ӿ]/);
    }
  });

  /// Р20-маркер бере стільки слів, скільки їх в оригіналі, і не знає ані про `- ` списку, ані
  /// про `**` жирного. Обидві помилки ламають розмітку тихо: список злипається в абзац, а
  /// жирний лишається сирими зірочками. Тому це перевірка, а не домовленість.
  it("ставить маркери оригіналу так, щоб вони не зʼїдали розмітку", () => {
    for (const facility of facilities) {
      for (const field of ukrainianFieldsOf(facility)) {
        for (const { term, original } of findGlossaryMarkers(field)) {
          expect(term, `${facility.engName}: маркер {{${original}}} без українського терміна`).not.toBe("");
          expect(term, `${facility.engName}: маркер {{${original}}} захопив розмітку`).not.toMatch(/^[*\-|]|[*|]/);
        }
      }
    }
  });

  it("виводить каталог на головну 2024 і не показує його в 2014", () => {
    const tiles2024 = collectHomeCategories("2024").filter((tile) => tile.slug === "bastions");
    const tiles2014 = collectHomeCategories("2014").filter((tile) => tile.slug === "bastions");

    expect(tiles2024).toHaveLength(1);
    expect(tiles2024[0].href).toBe("/2024/bastions");
    expect(tiles2014).toHaveLength(0);
  });

  it("веде кожне приміщення в sitemap", () => {
    const urls = new Set(sitemap().map((entry) => entry.url));

    expect([...urls].some((url) => url.endsWith("/2024/bastions"))).toBe(true);
    for (const facility of facilities) {
      expect([...urls].some((url) => url.endsWith(`/2024/bastions/${facility.slug}`))).toBe(true);
    }
  });

  it("додає приміщення в омні-пошук 2024 і не додає їх у 2014", () => {
    const index2024 = buildOmniSearchIndex("RULES_2024").filter((item) => item.category === "bastions");
    const index2014 = buildOmniSearchIndex("RULES_2014").filter((item) => item.category === "bastions");

    expect(index2024).toHaveLength(61);
    expect(index2014).toHaveLength(0);
    expect(index2024.every((item) => item.href.startsWith("/2024/bastions/"))).toBe(true);
  });
});
