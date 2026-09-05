import { describe, expect, it } from "vitest";
import {
  buildFullSearchText,
  buildIndexedSearchText,
  collectCreatureCRs,
  collectCreatureSizes,
  collectCreatureSources,
  collectCreatureTypes,
  matchesCreatureSelection,
} from "@/lib/bestiary-index";
import { getAllCreatures, getCreatureIndex } from "@/lib/bestiaryData";
import {
  findCreatureKeysMatchingText,
  loadCreatureStatblock,
} from "@/lib/actions/bestiary-actions";
import { toEntitySlug } from "@/lib/slug-utils";

/// KR20.9. `/bestiary` качав у браузер `creatures.json` + `creatures2024.json` — 6,54 МіБ raw,
/// 1 399 КіБ gzip, бо `BestiaryClient` фільтрував увесь каталог на клієнті. 64% цієї ваги — дії,
/// особливості й описи, потрібні лише розгорнутому статблоку. Тепер у браузер їде вузький індекс,
/// а статблок і глибокий пошук лишаються на сервері. Ці тести стережуть обидві половини:
/// індекс не має погладшати, а пошук — не має почати знаходити менше.

const EDITIONS = ["RULES_2014", "RULES_2024"] as const;

const INDEX_FIELDS = [
  "key",
  "creatureId",
  "name",
  "nameEng",
  "type",
  "size",
  "challenge",
  "source",
  "ac",
  "hp",
  "imageUrl",
  "flySpeed",
  "swimSpeed",
  "climbSpeed",
  "hasConditionalSpeed",
];

const emptySelection = (q = "") => ({
  q,
  types: new Set<string>(),
  sizes: new Set<string>(),
  crs: new Set<string>(),
  source: { sources: new Set<string>(), homebrew: true },
  moves: new Set<string>(),
});

describe("вузький індекс бестіарію", () => {
  it.each(EDITIONS)("покриває весь каталог %s і адресується слаґом сторінки істоти", (ruleset) => {
    const creatures = getAllCreatures(ruleset);
    const index = getCreatureIndex(ruleset);

    expect(index).toHaveLength(creatures.length);
    expect(index.map((entry) => entry.key)).toEqual(
      creatures.map((creature) => toEntitySlug(creature.nameEng))
    );
  });

  it.each(EDITIONS)("не несе прози статблока для %s", (ruleset) => {
    const extraFields = new Set<string>();
    for (const entry of getCreatureIndex(ruleset)) {
      for (const field of Object.keys(entry)) {
        if (!INDEX_FIELDS.includes(field)) extraFields.add(field);
      }
    }

    expect([...extraFields]).toEqual([]);
  });

  /// KR24.1 доклав до рядка три швидкості й позначку умовності — рівно те, що питає правило
  /// придатності Дикої форми. Розріджено: ключ без швидкості означає «режиму немає», інакше
  /// пʼять полів із `null` на 1 490 істот коштували б у девʼять разів дорожче.
  it.each(EDITIONS)("несе швидкості правил і не несе решти чисел (%s)", (ruleset) => {
    const creatures = getAllCreatures(ruleset);
    const index = getCreatureIndex(ruleset);

    for (const [position, entry] of index.entries()) {
      const creature = creatures[position];

      expect(entry.flySpeed ?? null).toBe(creature.flySpeed);
      expect(entry.swimSpeed ?? null).toBe(creature.swimSpeed);
      expect(entry.climbSpeed ?? null).toBe(creature.climbSpeed);
      expect(entry.hasConditionalSpeed ?? false).toBe(creature.hasConditionalSpeed);
    }

    expect(index.some((entry) => "walkSpeed" in entry || "burrowSpeed" in entry)).toBe(false);
  });

  it("важить від каталогу дрібну частку — інакше винесення втрачає сенс", () => {
    const catalogBytes = EDITIONS.reduce(
      (sum, ruleset) => sum + JSON.stringify(getAllCreatures(ruleset)).length,
      0
    );
    const indexBytes = EDITIONS.reduce(
      (sum, ruleset) => sum + JSON.stringify(getCreatureIndex(ruleset)).length,
      0
    );

    expect(indexBytes / catalogBytes).toBeLessThan(0.15);
  });

  it.each(EDITIONS)("дає фільтрам ті самі значення, що й повний каталог %s", (ruleset) => {
    const creatures = getAllCreatures(ruleset);
    const index = getCreatureIndex(ruleset);

    const distinct = (values: string[]) => [...new Set(values.filter(Boolean))];

    expect(new Set(collectCreatureTypes(index))).toEqual(
      new Set(distinct(creatures.map((creature) => creature.type.split("(")[0].trim())))
    );
    expect(new Set(collectCreatureSizes(index))).toEqual(
      new Set(distinct(creatures.map((creature) => creature.size.trim())))
    );
    expect(new Set(collectCreatureCRs(index))).toEqual(
      new Set(distinct(creatures.map((creature) => creature.challenge.trim())))
    );
    expect(new Set(collectCreatureSources(index))).toEqual(
      new Set(distinct(creatures.map((creature) => creature.source.trim())))
    );
  });
});

describe("пошук у каталозі після виносу прози на сервер", () => {
  /// Рівно та формула, за якою `BestiaryClient` фільтрував до KR20.9.
  const findLegacyMatches = (ruleset: (typeof EDITIONS)[number], query: string) =>
    getAllCreatures(ruleset)
      .filter((creature) =>
        `${creature.name} ${creature.nameEng} ${creature.type} ${creature.size} ${creature.description} ${creature.specialAbilities} ${creature.actions}`
          .toLowerCase()
          .includes(query.toLowerCase())
      )
      .map((creature) => toEntitySlug(creature.nameEng));

  const QUERIES = ["щупальц", "вогнян", "отруйн", "дракон", "аболет"];

  it.each(EDITIONS)("дві фази разом дають той самий набір, що й один пошук по всьому запису (%s)", async (ruleset) => {
    for (const query of QUERIES) {
      const deep = new Set(await findCreatureKeysMatchingText(query, ruleset));
      const both = getCreatureIndex(ruleset)
        .filter((entry) => matchesCreatureSelection(entry, emptySelection(query), deep))
        .map((entry) => entry.key);

      expect(both).toEqual(findLegacyMatches(ruleset, query));
    }
  });

  it("перша фаза — підмножина другої, тож список поки їде відповідь звужений, а не порожній", () => {
    for (const creature of getAllCreatures("RULES_2014")) {
      const entry = { ...creature, key: toEntitySlug(creature.nameEng) };
      expect(buildFullSearchText(creature).startsWith(buildIndexedSearchText(entry))).toBe(true);
    }
  });

  it("«щупальця» немає в жодній назві — цей запит живе тільки з другої фази", async () => {
    const withoutDeep = getCreatureIndex("RULES_2014").filter((entry) =>
      matchesCreatureSelection(entry, emptySelection("щупальц"), null)
    );
    const deep = await findCreatureKeysMatchingText("щупальц", "RULES_2014");

    expect(withoutDeep).toEqual([]);
    expect(deep.length).toBeGreaterThan(30);
  });

  it("порожній запит не ганяє сервер", async () => {
    expect(await findCreatureKeysMatchingText("   ", "RULES_2014")).toEqual([]);
  });
});

describe("статблок на розкриття", () => {
  it.each(EDITIONS)("віддає повний запис своєї редакції (%s)", async (ruleset) => {
    const first = getAllCreatures(ruleset)[0];
    const loaded = await loadCreatureStatblock(toEntitySlug(first.nameEng), ruleset);

    expect(loaded?.nameEng).toBe(first.nameEng);
    expect(loaded?.ruleset).toBe(ruleset);
    expect(loaded?.actions).toBe(first.actions);
  });

  it("невідомий ключ дає null, а не падіння", async () => {
    expect(await loadCreatureStatblock("немає-такої-істоти", "RULES_2014")).toBeNull();
    expect(await loadCreatureStatblock("", "RULES_2014")).toBeNull();
  });
});
