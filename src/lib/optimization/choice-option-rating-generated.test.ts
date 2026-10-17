import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import ratings from "@/lib/generated/rpgbot-choice-option-ratings.json";
import { parseArticleDocument } from "./document";
import { buildChoiceOptionRatingList, listRatedChoiceGroups, RATED_CLASS_SOURCES } from "./choice-option-rating-generation";
import { findChoiceOptionRating } from "./choice-option-rating-lookup";
import { choiceOptionRatingCatalog } from "./choice-option-rating-catalog";
import { isSpellRatingScore } from "./spell-rating-lookup";

type CreatorClass = { name: string; ruleset: string; classChoiceOptions: { choiceOption: { optionNameEng: string; ruleset: string } }[] };

const readJson = (path: string) => JSON.parse(readFileSync(resolve(path), "utf8"));
const findCreatorClass = (file: string, name: string) => (readJson(file).classes as CreatorClass[]).find((entry) => entry.name === name)!;

describe("згенеровані оцінки варіантів класу RPGbot", () => {
  for (const source of RATED_CLASS_SOURCES) {
    const list = ratings.classes[source.className as keyof typeof ratings.classes];
    const document = parseArticleDocument(readJson(`data/rpgbot/uk/${source.articleFile}`));
    const groups = listRatedChoiceGroups(source, readJson(source.catalogFile));

    it(`${source.className}: кожен варіант каталогу оцінений або явно названий неоціненим`, () => {
      const unrated = groups.flatMap((group) => group.optionNames).filter((name) => !Object.hasOwn(list.options, name));
      expect(unrated).toEqual([...source.expectedUnratedNames]);
    });

    it(`${source.className}: оцінка 1–4, коментар і розділ статті є в кожного варіанта`, () => {
      const sectionIds = new Set(document.translations.at(-1)!.sections.map((section) => section.sectionId));
      for (const [name, option] of Object.entries(list.options)) {
        expect(isSpellRatingScore(option.score), name).toBe(true);
        expect(option.comment.trim().length, name).toBeGreaterThan(0);
        expect(sectionIds.has(option.sectionId), name).toBe(true);
      }
      expect(list.sourceUrl).toMatch(/^https:\/\/rpgbot\.net\//);
    });

    it(`${source.className}: закомічений файл збігається з перегенерованим із даних`, async () => {
      const generated = await buildChoiceOptionRatingList(document, groups, list.sourceUrl);
      expect(generated.list).toEqual(list);
    });
  }

  it("Кривавий мисливець 2014 бачить оцінки проклять і обрядів із посиланням на розділ розбору", () => {
    const hunter = findCreatorClass("src/lib/generated/creator-content-2014.json", "BLOOD_HUNTER_2014");
    const rated = hunter.classChoiceOptions.map(({ choiceOption }) => [choiceOption.optionNameEng, findChoiceOptionRating(choiceOptionRatingCatalog, hunter, choiceOption)?.score ?? null]);

    expect(Object.fromEntries(rated)).toMatchObject({ "Blood Curse of Binding": 4, "Blood Curse of the Muddled Mind": 1, "Blood Curse of Exposure": null, "Rite of the Storm": 4, Dueling: null });
    expect(findChoiceOptionRating(choiceOptionRatingCatalog, hunter, { optionNameEng: "Blood Curse of Binding", ruleset: "RULES_2014" })?.articleHref).toBe("/rules/optimization/blood-hunter-2014#section-blood-curses");
  });

  it("Кривавий мисливець 2024 і варіанти 2024 оцінок не мають", () => {
    const hunter2024 = findCreatorClass("src/lib/generated/creator-content-2024.json", "BLOOD_HUNTER_2024");
    const hunter2014 = { name: "BLOOD_HUNTER_2014", ruleset: "RULES_2014" };

    expect(hunter2024.classChoiceOptions.length).toBeGreaterThan(0);
    for (const { choiceOption } of hunter2024.classChoiceOptions) {
      expect(findChoiceOptionRating(choiceOptionRatingCatalog, hunter2024, choiceOption), choiceOption.optionNameEng).toBeNull();
    }
    expect(findChoiceOptionRating(choiceOptionRatingCatalog, hunter2014, { optionNameEng: "Blood Curse of Binding", ruleset: "RULES_2024" })).toBeNull();
    expect(findChoiceOptionRating(choiceOptionRatingCatalog, { ...hunter2014, ruleset: "RULES_2024" }, { optionNameEng: "Blood Curse of Binding", ruleset: "RULES_2014" })).toBeNull();
  });
});
