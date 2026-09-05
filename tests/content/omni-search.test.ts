import { describe, it, expect } from "vitest";
import { buildOmniSearchIndex, searchOmniIndex } from "@/lib/omniSearchData";
import { findAliasEntry } from "@/lib/search/searchAliases";
import { buildQueryMatcher, buildSearchableText, matchesQuery } from "@/lib/search/searchQuery";
import { findOmniSearchVisual } from "@/lib/search/searchVisuals";

describe("Omni-Search Index and Querying (KR10.2)", () => {
  it("builds 2014 index with all 10 categories", () => {
    const index2014 = buildOmniSearchIndex("RULES_2014");
    expect(index2014.length).toBeGreaterThan(500);

    const categories = new Set(index2014.map((item) => item.category));
    expect(categories.has("spells")).toBe(true);
    expect(categories.has("magic-items")).toBe(true);
    expect(categories.has("weapons")).toBe(true);
    expect(categories.has("armor")).toBe(true);
    expect(categories.has("bestiary")).toBe(true);
    expect(categories.has("feats")).toBe(true);
    expect(categories.has("invocations")).toBe(true);
    expect(categories.has("classes")).toBe(true);
    expect(categories.has("races")).toBe(true);
    expect(categories.has("rules")).toBe(true);

    // Ensure 2014 URLs do not have /2024 prefix
    const spell = index2014.find((i) => i.category === "spells");
    expect(spell).toBeDefined();
    expect(spell?.href.startsWith("/spells")).toBe(true);
    expect(spell?.href.startsWith("/2024")).toBe(false);
  });

  it("builds 2024 index with segregated 2024 URLs", () => {
    const index2024 = buildOmniSearchIndex("RULES_2024");
    expect(index2024.length).toBeGreaterThan(500);

    const categories = new Set(index2024.map((item) => item.category));
    expect(categories.has("spells")).toBe(true);
    expect(categories.has("magic-items")).toBe(true);
    expect(categories.has("weapons")).toBe(true);
    expect(categories.has("armor")).toBe(true);
    expect(categories.has("feats")).toBe(true);
    expect(categories.has("invocations")).toBe(true);
    expect(categories.has("classes")).toBe(true);
    expect(categories.has("races")).toBe(true);
    expect(categories.has("rules")).toBe(true);

    // Ensure 2024 URLs have /2024 prefix
    const spell = index2024.find((i) => i.category === "spells");
    expect(spell).toBeDefined();
    expect(spell?.href.startsWith("/2024/spells")).toBe(true);

    const rule = index2024.find((i) => i.category === "rules");
    expect(rule).toBeDefined();
    expect(rule?.href.startsWith("/2024/rules")).toBe(true);
  });

  it("searches Ukrainian and English titles accurately", () => {
    const resultsUa = searchOmniIndex("Вогнекуля", "RULES_2014");
    expect(resultsUa.length).toBeGreaterThan(0);
    expect(resultsUa[0].title).toBe("Вогнекуля");

    const resultsEng = searchOmniIndex("fireball", "RULES_2014");
    expect(resultsEng.length).toBeGreaterThan(0);
    expect(resultsEng[0].subtitle).toBe("Fireball");
  });

  it("filters search results by category", () => {
    const spellResults = searchOmniIndex("щит", "RULES_2014", "spells");
    expect(spellResults.every((r) => r.category === "spells")).toBe(true);

    const armorResults = searchOmniIndex("щит", "RULES_2014", "armor");
    expect(armorResults.every((r) => r.category === "armor")).toBe(true);
  });

  it("finds rules articles and conditions", () => {
    const conditionResults = searchOmniIndex("Отруєний", "RULES_2014");
    expect(conditionResults.some((r) => r.category === "rules" && r.title === "Отруєний")).toBe(true);

    const combatRuleResults = searchOmniIndex("Дії в бою", "RULES_2014");
    expect(combatRuleResults.some((r) => r.category === "rules" && r.title.includes("Дії"))).toBe(true);
  });
});

describe("KR13.4 — тіло статей, якорі підрозділів, г↔х та аліаси", () => {
  it("індексує тіло статей правил, а не лише назви й теги", () => {
    // «Пегасі» зустрічається тільки в subsections[].content, ніде в title/tags.
    const results = searchOmniIndex("пегасі", "RULES_2014");

    expect(results.some((item) => item.href === "/rules/combat#mounted-combat--mounted-combat")).toBe(true);
  });

  it("веде на якір підрозділу, а не на початок розділу", () => {
    // KR12.6 підключив 203 перекладені статті SRD 2024 (див. блок нижче) — серед них своя,
    // повна стаття «Випромінювання» (article.slug === "emanation"), яка тепер переважає над
    // рукописною заглушкою "emanation-area": коротший заголовок при рівному ранзі, і зміст
    // повніший за рукописний однорядковий стаб. Обидва посилання ведуть на конкретний якір,
    // не на початок розділу — умова KR13.4 виконана, просто якір тепер точніший.
    const results = searchOmniIndex("випроміню", "RULES_2024");

    expect(results[0]?.href).toBe("/2024/rules/spellcasting#emanation");
    expect(results[0]?.href).not.toBe("/2024/rules/spellcasting#rules-of-magic");
  });

  it("знаходить «бій верхи» і «бонусна дія» у 2014", () => {
    const mounted = searchOmniIndex("бій верхи", "RULES_2014");
    expect(mounted.some((item) => item.href === "/rules/combat#mounted-combat")).toBe(true);

    const bonusAction = searchOmniIndex("бонусна дія", "RULES_2014");
    expect(bonusAction.some((item) => item.href.startsWith("/rules/combat#"))).toBe(true);
  });

  it("нормалізує г↔х в обидва боки", () => {
    const withH = searchOmniIndex("бехолдер", "RULES_2014");
    const withG = searchOmniIndex("беголдер", "RULES_2014");
    expect(withH.length).toBeGreaterThan(0);
    expect(withG.map((item) => item.id)).toEqual(withH.map((item) => item.id));

    const goblinWithH = searchOmniIndex("хоблін", "RULES_2014");
    expect(goblinWithH.some((item) => item.title === "Гоблін")).toBe(true);
  });

  it("аліас віддає очікувану сутність", () => {
    expect(findAliasEntry("class", "rogue")?.variants).toContain("спритник");

    const results = searchOmniIndex("спритник", "RULES_2014");
    expect(results[0]?.title).toBe("Пройдисвіт");
    expect(results[0]?.category).toBe("classes");
  });

  it("тримає підрозділи правил окремими записами індексу", () => {
    const index = buildOmniSearchIndex("RULES_2014");
    const article = index.find((item) => item.href === "/rules/combat#mounted-combat");
    const subsection = index.find((item) => item.href === "/rules/combat#mounted-combat--mounting-and-dismounting");

    expect(article?.title).toBe("Верховий бій");
    expect(subsection?.title).toBe("Сісти верхи й зсісти");
  });
});

describe("Доповнення власника 2026-08-22 — Б9, Б10, шкода/ушкодження, аліаси Походження", () => {
  it("Б10: клас стоїть вище за однойменну істоту бестіарію («друїд»)", () => {
    const results = searchOmniIndex("друїд", "RULES_2014");
    const classIndex = results.findIndex((item) => item.category === "classes");
    const bestiaryIndex = results.findIndex((item) => item.category === "bestiary");

    expect(classIndex).toBeGreaterThanOrEqual(0);
    expect(bestiaryIndex).toBeGreaterThan(classIndex);
  });

  it("Б10: раса стоїть вище за однойменну істоту бестіарію («гоблін»)", () => {
    const results = searchOmniIndex("гоблін", "RULES_2014");
    const raceIndex = results.findIndex((item) => item.category === "races");
    const bestiaryIndex = results.findIndex((item) => item.category === "bestiary");

    expect(raceIndex).toBeGreaterThanOrEqual(0);
    expect(bestiaryIndex).toBeGreaterThan(raceIndex);
  });

  it("Б9: результат несе те саме сире значення visualKey, яким малює іконку каталог", () => {
    const results = searchOmniIndex("злочинець", "RULES_2014");
    const background = results.find((item) => item.category === "backgrounds" && item.title === "Злочинець");

    expect(background?.visualKey).toBeTruthy();
  });

  it("Б9: findOmniSearchVisual віддає однакову іконку для того самого visualKey в обох джерелах", () => {
    const backgroundVisual = findOmniSearchVisual({
      id: "x",
      title: "x",
      category: "backgrounds",
      categoryLabel: "x",
      href: "/x",
      visualKey: "PHB",
    });
    const bestiaryVisual = findOmniSearchVisual({
      id: "y",
      title: "y",
      category: "bestiary",
      categoryLabel: "y",
      href: "/y",
      visualKey: "humanoid",
    });

    expect(backgroundVisual.icon).toBeDefined();
    expect(bestiaryVisual.icon).toBeDefined();
    expect(backgroundVisual.iconWrap).not.toBe(bestiaryVisual.iconWrap);
  });

  it("нормалізація запиту зводить «шкода» і «ушкодження» до одного результату", () => {
    const text = buildSearchableText(["Умисне ушкодження власності"]);
    expect(matchesQuery(buildQueryMatcher("шкода")!, text)).toBe(true);

    const otherText = buildSearchableText(["Кидок шкоди при влучанні"]);
    expect(matchesQuery(buildQueryMatcher("ушкодження")!, otherText)).toBe(true);
  });

  it("«шкода» і «ушкодження» дають однакову видачу в реальному індексі 2014", () => {
    const withShkoda = searchOmniIndex("шкода", "RULES_2014");
    const withUshkodzhennia = searchOmniIndex("ушкодження", "RULES_2014");

    expect(withShkoda.length).toBeGreaterThan(0);
    expect(withUshkodzhennia.map((item) => item.id)).toEqual(withShkoda.map((item) => item.id));
  });

  it("зводить и/ї до і — «друид» знаходить «Друїд» так само, як «друїд»", () => {
    const results = searchOmniIndex("друид", "RULES_2014");
    expect(results.some((item) => item.title === "Друїд" && item.category === "classes")).toBe(true);
  });

  it("«бекграунд», «передісторія», «історія» ведуть на каталог Походжень", () => {
    for (const query of ["бекграунд", "передісторія", "історія"]) {
      const results = searchOmniIndex(query, "RULES_2014");
      expect(results[0]?.category, `запит «${query}»`).toBe("backgrounds");
      expect(results[0]?.href, `запит «${query}»`).toBe("/backgrounds");
    }

    const results2024 = searchOmniIndex("бекграунд", "RULES_2024");
    expect(results2024[0]?.href).toBe("/2024/backgrounds");
  });

  it("KR12.6: 203 перекладені статті SRD 2024 підключені до індексу 2024", () => {
    const index2024 = buildOmniSearchIndex("RULES_2024");
    expect(index2024.some((item) => item.id === "rule-srd-rhythm-of-play")).toBe(true);

    const results = searchOmniIndex("ритм гри", "RULES_2024");
    expect(results.some((item) => item.id === "rule-srd-rhythm-of-play")).toBe(true);
  });

  it("KR13.4: «маг» віддає обидва класи — і Чародія, і Чарівника (рішення власника 2026-08-22)", () => {
    expect(findAliasEntry("class", "sorcerer")?.variants).toContain("маг");
    expect(findAliasEntry("class", "wizard")?.variants).toContain("маг");

    for (const ruleset of ["RULES_2014", "RULES_2024"] as const) {
      const classes = searchOmniIndex("маг", ruleset)
        .filter((item) => item.category === "classes")
        .map((item) => item.title);

      expect(classes, `редакція ${ruleset}`).toContain("Чародій");
      expect(classes, `редакція ${ruleset}`).toContain("Чарівник");
    }
  });

  it("аліас підкласу віддає очікувану сутність («батл мастер» → Майстер бойових мистецтв)", () => {
    expect(findAliasEntry("subclass", "battle-master")?.variants).toContain("батл мастер");

    const results = searchOmniIndex("батл мастер", "RULES_2014");
    expect(results.some((item) => item.title === "Майстер бойових мистецтв")).toBe(true);
  });
});

describe("KR23.8 / Р34 — стара форма назви плану веде на канонічну статтю", () => {
  const PLANE_ARTICLES = ["Плани існування", "Планарні ефекти"];

  it.each([
    ["іссгард", "Ісгард"],
    ["байтопія", "Бітопія"],
    ["земля звірів", "Землі Звірів"],
    ["лімбо", "Лімб"],
    ["девʼять пеклів", "Девʼять Пекл"],
    ["фейвальд", "Фейвайлд"],
    ["далекий обшир", "Далеке Царство"],
  ])("«%s» знаходить статтю з планами (канон — «%s»)", (variant) => {
    const titles = searchOmniIndex(variant, "RULES_2014").map((item) => item.title);
    expect(titles.some((title) => PLANE_ARTICLES.includes(title))).toBe(true);
  });

  it("KR29.3: аліаси створення персонажа ведуть на статті PHB 2014 там, де пошук мовчав", () => {
    const wanted: Array<[string, string]> = [
      ["покрокове створення", "#step-by-step-characters"],
      ["point buy", "#3-determine-ability-scores--variant-customizing-ability-scores"],
      ["standard array", "#3-determine-ability-scores"],
      ["ступінь гри", "#tiers-of-play-phb"],
      ["квік білд", "#2-choose-a-class--quick-build"],
    ];
    for (const [query, anchor] of wanted) {
      const [first] = searchOmniIndex(query, "RULES_2014");
      expect(first, `«${query}» нічого не знайшов`).toBeDefined();
      expect(first.href, query).toContain(anchor);
    }
  });

  it("KR29.3: ті самі звички ведуть у 2024 на власні статті створення персонажа", () => {
    expect(searchOmniIndex("point buy", "RULES_2024")[0]?.href).toContain("#step-3-ability-scores--generate-your-scores");
    expect(searchOmniIndex("standard array", "RULES_2024")[0]?.href).toContain("#step-3-ability-scores--generate-your-scores");
    expect(searchOmniIndex("покрокове створення", "RULES_2024")[0]?.href).toContain("#create-your-character");
  });

  it("«аід» знаходиться нормалізацією запиту, тому рядка в таблиці не має", () => {
    const entry = findAliasEntry("rule", "planes");
    expect(entry?.variants).not.toContain("аід");
    expect(searchOmniIndex("аід", "RULES_2014").length).toBeGreaterThan(0);
  });
});
