import { describe, expect, it } from "vitest";

import { MIRROR_REVISION } from "../../scripts/5etools/mirror";
import { getBeyondSrdArticlesByRuleset } from "@/lib/rulesBeyondSrdData";
import { getAllRuleArticles2014 } from "@/lib/rules2014Data";
import { RULE_CATEGORIES } from "@/lib/rulesData";
import { isBeyondSrd, isFromSrd } from "@/lib/rulesProvenance";

/// 68 варіантних правил (KR20.5/KR23.1) + 10 дрібних реєстрів (KR23.5) + 9 статей глав 1 і 4
/// PHB (KR29.1).
const EXPECTED_ARTICLES = 87;
const EXPECTED_PER_CATEGORY = {
  combat: 12,
  adventuring: 31,
  /// 11 + девʼять статей створення персонажа PHB, які KR29.1 поклала до «Передісторій»,
  /// «Расових особливостей» і «Рис» KR20.10.
  abilities: 20,
  spellcasting: 7,
  gamemaster: 17,
  conditions: 0,
  equipment: 0,
};

/// Ця стаття про 2014 — KR23.4 додав 2024-корпус (глави XDMG) у той самий генерований файл,
/// звужуємо за ruleset, інакше тут порахувалося б 119, а не 87.
const beyondSrd = getBeyondSrdArticlesByRuleset("RULES_2014");

describe("KR20.5 — правила поза SRD з дзеркала 5etools", () => {
  it("імпортує 68 варіантних правил DMG, XGtE і TCoE, 10 дрібних реєстрів KR23.5 і 9 статей PHB KR29.1", () => {
    expect(beyondSrd.length).toBe(EXPECTED_ARTICLES);

    const counted = Object.fromEntries(
      RULE_CATEGORIES.map((category) => [
        category.key,
        beyondSrd.filter((article) => article.category === category.key).length,
      ])
    );
    expect(counted).toEqual(EXPECTED_PER_CATEGORY);
  });

  it("несе походження, за яким купу можна зняти одним фільтром", () => {
    for (const article of beyondSrd) {
      expect(article.provenance.kind, article.slug).toBe("beyond-srd");
      expect(isBeyondSrd(article.provenance)).toBe(true);
      expect(isFromSrd(article.provenance)).toBe(false);

      if (article.provenance.kind !== "beyond-srd") throw new Error("очікували beyond-srd");
      expect(article.provenance.revision).toBe(MIRROR_REVISION);
      /// PHB — KR23.5: шість хвороб Додатка A й три статті глосарію чуттів, яких SRD 5.1
      /// не передруковує (сторінка «Monsters», не «Rules»). Самі варіантні правила PHB, як
      /// і раніше, не беруться — KR23.1 узяв їх зі SRD.
      expect(["DMG", "XGE", "TCE", "PHB"]).toContain(article.provenance.book);
      expect(article.provenance.page).toBeGreaterThan(0);
      /// KR23.1 живе на variantrules.html; KR23.5 додає три інші сторінки 5etools —
      /// actions/conditionsdiseases/senses; KR29.1 — глави книжки на book.html.
      expect(article.provenance.url).toMatch(
        /5e\.tools\/(variantrules|actions|conditionsdiseases|senses|book)\.html/
      );
    }
  });

  it("не бере того, що вже є у SRD 5.1", () => {
    const titles = beyondSrd.map((article) => article.engTitle);
    expect(titles).not.toContain("Madness");
    expect(titles).toContain("Flanking");
    expect(titles).toContain("Rest Variants");
    expect(titles).toContain("Spell Points");
    expect(titles).toContain("Hero Points");
  });

  /// KR23.5: `actions.json`/`conditionsdiseases.json`/`senses.json` здебільшого дублюють уже
  /// наявне — 10 записів справді нові, звірені вручну заголовком і текстом (журнал KR23.5).
  it("KR23.5 бере рівно 10 записів дрібних реєстрів і не бере жодного дубля", () => {
    const titles = beyondSrd.map((article) => article.engTitle);

    const newTitles = [
      "Identify a Spell",
      "Blinding Sickness",
      "Filth Fever",
      "Flesh Rot",
      "Mindfire",
      "Seizure",
      "Slimy Doom",
      "Blindsight",
      "Darkvision",
      "Truesight",
    ];
    for (const title of newTitles) expect(titles, title).toContain(title);

    /// Дублі, знайдені звіркою, а не прапорцем: шість дій DMG уже приїхали як підрозділи
    /// «Action Options» (KR23.1), «Healing Surge» — підрозділ «Healing», «Waking Someone» —
    /// підрозділ «Sleep»; «Activate an Item» уже в статті «Magic Items»; діагнози DMG/XDMG
    /// (Cackle Fever, Sewer Plague, Sight Rot) і всі 14 станів — дослівно вже в SRD-корпусі.
    const excludedDuplicates = [
      "Climb onto a Bigger Creature",
      "Disarm",
      "Mark",
      "Overrun",
      "Shove Aside",
      "Tumble",
      "Healing Surge",
      "Waking Someone",
      "Activate an Item",
      "Cackle Fever",
      "Sewer Plague",
      "Sight Rot",
    ];
    for (const title of excludedDuplicates) expect(titles, title).not.toContain(title);
  });

  /// KR29.1: глави 1 і 4 PHB 2014 — покрокове створення персонажа, якого SRD 5.1 не містить
  /// узагалі. Пʼять підрозділів глав відкинуто до імпорту як дослівний дубль SRD, ще один — як
  /// навігацію книжкою (звірка реченнями, журнал KR29.1).
  it("KR29.1 бере рівно 9 статей глав PHB і жодного дубля SRD 5.1", () => {
    const phb = beyondSrd.filter((article) => article.provenance.url.includes("book.html#phb"));

    expect(phb.map((article) => article.slug)).toEqual([
      "step-by-step-characters",
      "1-choose-a-race",
      "2-choose-a-class",
      "3-determine-ability-scores",
      "4-describe-your-character",
      "5-choose-equipment-phb",
      "6-come-together",
      "tiers-of-play-phb",
      "character-details",
    ]);

    for (const article of phb) {
      if (article.provenance.kind !== "beyond-srd") throw new Error("очікували beyond-srd");
      expect(article.provenance.book, article.slug).toBe("PHB");
      expect(article.category, article.slug).toBe("abilities");
      expect(article.ruleset, article.slug).toBe("RULES_2014");
    }

    /// Ці пʼять підрозділів глав SRD 5.1 уже друкує дослівно, і всі пʼять уже є статтями
    /// довідника 2014. Звіряємо саме купу PHB: однойменний варіант DMG («Inspiration»,
    /// KR23.1) — інша стаття з іншим текстом і має лишитися.
    const phbTitles = phb.map((article) => article.engTitle);
    for (const duplicated of ["Beyond 1st Level", "Inspiration", "Backgrounds", "Alignment", "Languages"]) {
      expect(phbTitles, duplicated).not.toContain(duplicated);
    }

    /// «Tiers of Play» — єдине, що врятовано з відкинутого «Beyond 1st Level»: у SRD 5.1 його
    /// немає, а заголовок батька в довіднику 2014 уже зайнятий статтею зі SRD.
    const tiers = phb.find((article) => article.slug === "tiers-of-play-phb");
    expect(tiers?.subsections.map((subsection) => subsection.engTitle)).toEqual(["Tiers of Play"]);

    /// «Character Details» лишилася статтею, але без двох вкладених блоків — це дослівний SRD.
    const details = phb.find((article) => article.slug === "character-details");
    expect(details?.subsections.map((subsection) => subsection.engTitle)).toEqual([
      "Character Details",
      "Name",
      "Sex",
      "Height and Weight",
      "Other Physical Characteristics",
      "Personal Characteristics",
    ]);
  });

  it("не краде слагів у статей SRD і рукописних", () => {
    const all = getAllRuleArticles2014();
    const slugs = all.map((article) => article.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(all.length).toBeGreaterThan(beyondSrd.length);
  });

  it("кожна стаття має непорожні підрозділи з унікальними якорями", () => {
    for (const article of beyondSrd) {
      expect(article.subsections.length, article.slug).toBeGreaterThan(0);
      const ids = article.subsections.map((subsection) => subsection.id);
      expect(new Set(ids).size).toBe(ids.length);

      for (const subsection of article.subsections) {
        expect(subsection.content.trim().length, subsection.id).toBeGreaterThan(0);
        expect(subsection.id.startsWith(`${article.slug}--`), subsection.id).toBe(true);
      }
    }
  });

  it("розмітка 5etools розкладена, а не протягнута як є", () => {
    const body = beyondSrd
      .flatMap((article) => article.subsections.map((subsection) => subsection.content))
      .join("\n");

    expect(body).not.toMatch(/\{@\w+/);
  });
});
