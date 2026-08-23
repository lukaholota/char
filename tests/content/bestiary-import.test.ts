import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import {
  getAllCreatures,
  getCreatureByIdOrSlug,
  getAllCreatureTypes,
  getAllCreatureSizes,
  getAllCreatureCRs,
} from "@/lib/bestiaryData";
import {
  generateStaticParams as generateBestiary2014Params,
  generateMetadata as generateBestiary2014Metadata,
} from "@/app/bestiary/[slug]/page";
import {
  generateStaticParams as generateBestiary2024Params,
  generateMetadata as generateBestiary2024Metadata,
} from "@/app/2024/bestiary/[slug]/page";
import { buildOmniSearchIndex } from "@/lib/omniSearchData";
import { createCreature } from "../../scripts/data/creature-builder";

describe("KR11.1 — Каталог та нормалізація Бестіарію 2014", () => {
  it("loads 2014 creatures dataset with rich catalogue (300+ creatures)", () => {
    const list = getAllCreatures("RULES_2014");
    expect(list.length).toBeGreaterThanOrEqual(300);
    expect(list.every((c) => c.ruleset === "RULES_2014")).toBe(true);
  });

  it("ensures all 2014 creatures have valid stats and required fields", () => {
    const list = getAllCreatures("RULES_2014");
    for (const c of list) {
      expect(c.creatureId).toBeGreaterThan(0);
      expect(c.name).toBeTruthy();
      expect(c.nameEng).toBeTruthy();
      expect(c.size).toBeTruthy();
      expect(c.type).toBeTruthy();
      expect(c.ac).toBeTruthy();
      expect(c.hp).toBeTruthy();
      expect(c.speed).toBeTruthy();
      expect(c.strength).toMatch(/\d+\s*\([+-]?\d+\)/);
      expect(c.dexterity).toMatch(/\d+\s*\([+-]?\d+\)/);
      expect(c.constitution).toMatch(/\d+\s*\([+-]?\d+\)/);
      expect(c.intelligence).toMatch(/\d+\s*\([+-]?\d+\)/);
      expect(c.wisdom).toMatch(/\d+\s*\([+-]?\d+\)/);
      expect(c.charisma).toMatch(/\d+\s*\([+-]?\d+\)/);
      expect(c.challenge).toBeTruthy();
    }
  });

  it("contains classic D&D 2014 monsters (Goblin, Dragon, Beholder, Lich, Mimic)", () => {
    const list = getAllCreatures("RULES_2014");
    const namesEng = list.map((c) => c.nameEng.toLowerCase());
    expect(namesEng).toContain("goblin");
    expect(namesEng).toContain("beholder");
    expect(namesEng).toContain("lich");
    expect(namesEng).toContain("mimic");
    expect(namesEng).toContain("adult red dragon");
    expect(namesEng).toContain("gelatinous cube");
    expect(namesEng).toContain("owlbear");
  });
});

describe("KR11.2 — Інтеграція Бестіарію 2024 (Супутники, Призвані істоти та Монстри 2024)", () => {
  it("loads 2024 creatures with RULES_2024 segregation", () => {
    const list2024 = getAllCreatures("RULES_2024");
    expect(list2024.length).toBeGreaterThanOrEqual(20);
    expect(list2024.every((c) => c.ruleset === "RULES_2024")).toBe(true);
  });

  it("contains 2024 summons and companions", () => {
    const list2024 = getAllCreatures("RULES_2024");
    const namesEng = list2024.map((c) => c.nameEng.toLowerCase());
    expect(namesEng).toContain("bestial spirit");
    expect(namesEng).toContain("fey spirit");
    expect(namesEng).toContain("undead spirit");
    expect(namesEng).toContain("elemental spirit");
    expect(namesEng).toContain("celestial spirit");
    expect(namesEng).toContain("draconic spirit");
    expect(namesEng).toContain("otherworldly steed");
    expect(namesEng).toContain("beast of the land");
  });

  it("maintains strict separation between 2014 and 2024 catalogues", () => {
    const list2014 = getAllCreatures("RULES_2014");
    const list2024 = getAllCreatures("RULES_2024");

    const ids2014 = new Set(list2014.map((c) => c.creatureId));
    const ids2024 = new Set(list2024.map((c) => c.creatureId));

    for (const id of ids2024) {
      expect(ids2014.has(id)).toBe(false);
    }
  });
});

describe("KR11.3 — Хелпери фільтрації, Slug Lookup та SSG сторінки", () => {
  it("provides unique creature types, sizes and CRs", () => {
    const types2014 = getAllCreatureTypes("RULES_2014");
    expect(types2014.length).toBeGreaterThan(5);
    expect(types2014).toContain("Гуманоїд");
    expect(types2014).toContain("Дракон");
    expect(types2014).toContain("Нежить");
    expect(types2014).toContain("Звір");

    const sizes2014 = getAllCreatureSizes("RULES_2014");
    expect(sizes2014).toContain("Малий");
    expect(sizes2014).toContain("Середній");
    expect(sizes2014).toContain("Великий");

    const crs2014 = getAllCreatureCRs("RULES_2014");
    expect(crs2014).toContain("1/4");
    expect(crs2014).toContain("1");
    expect(crs2014).toContain("17");
  });

  it("finds creatures by ID or slug/name in getCreatureByIdOrSlug", () => {
    const byId = getCreatureByIdOrSlug("101", "RULES_2014");
    expect(byId).toBeDefined();
    expect(byId?.nameEng).toBe("Goblin");

    const bySlug = getCreatureByIdOrSlug("adult-red-dragon", "RULES_2014");
    expect(bySlug).toBeDefined();
    expect(bySlug?.name).toBe("Дорослий червоний дракон");

    const by2024Slug = getCreatureByIdOrSlug("bestial-spirit", "RULES_2024");
    expect(by2024Slug).toBeDefined();
    expect(by2024Slug?.nameEng).toBe("Bestial Spirit");
  });

  it("generates static params for 2014 bestiary SSG pages", async () => {
    const params = await generateBestiary2014Params();
    const creatures = getAllCreatures("RULES_2014");
    expect(params.length).toBe(creatures.length);

    const slugs = params.map((p) => p.slug);
    expect(slugs.every((slug) => Number.isNaN(Number(slug)))).toBe(true);
    expect(slugs).toContain("goblin");
    expect(slugs).toContain("beholder");
    expect(slugs).toContain("lich");
  });

  it("generates static params for 2024 bestiary SSG pages", async () => {
    const params = await generateBestiary2024Params();
    const creatures = getAllCreatures("RULES_2024");
    expect(params.length).toBe(creatures.length);

    const slugs = params.map((p) => p.slug);
    expect(slugs).toContain("bestial-spirit");
    expect(slugs).toContain("fey-spirit");
  });

  it("generates metadata for creature SSG pages", async () => {
    const meta2014 = await generateBestiary2014Metadata({
      params: Promise.resolve({ slug: "goblin" }),
    });
    expect(meta2014.title).toContain("Гоблін");
    expect(meta2014.title).toContain("Goblin");

    const meta2024 = await generateBestiary2024Metadata({
      params: Promise.resolve({ slug: "bestial-spirit" }),
    });
    expect(meta2024.title).toContain("Дух звіра");
    expect(meta2024.title).toContain("2024");
  });

  it("indexes creatures in Omni-Search with direct SSG links", () => {
    const index2014 = buildOmniSearchIndex("RULES_2014");
    const bestiary2014 = index2014.filter((item) => item.category === "bestiary");
    expect(bestiary2014.length).toBeGreaterThanOrEqual(20);

    const goblinItem = bestiary2014.find((item) => item.subtitle === "Goblin");
    expect(goblinItem).toBeDefined();
    expect(goblinItem?.href).toBe("/bestiary/goblin");
    expect(goblinItem?.badge).toBe("CR 1/4");

    const index2024 = buildOmniSearchIndex("RULES_2024");
    const bestiary2024 = index2024.filter((item) => item.category === "bestiary");
    const summonItem = bestiary2024.find((item) => item.subtitle === "Bestial Spirit");
    expect(summonItem).toBeDefined();
    expect(summonItem?.href).toBe("/2024/bestiary/bestial-spirit");
  });
});

describe("KR11.4 — Розширений бестіарій WotC (Volo's, Fizban's, Mordenkainen)", () => {
  const EXPANSION_SOURCES = ["VGM", "FTD", "MMotM"];

  it("expands the 2014 catalogue past 380 creatures", () => {
    expect(getAllCreatures("RULES_2014").length).toBeGreaterThanOrEqual(380);
  });

  it("imports every expansion source with a meaningful batch", () => {
    const list = getAllCreatures("RULES_2014");
    const countBySource = (source: string) => list.filter((c) => c.source === source).length;

    // Партія 22 KR12.3 перевела Shoosuva, і aidedd цитує його як Monsters of the Multiverse,
    // тож запис пішов із VGM у MPMM: 15 → 14. Партія 23 зробила те саме з Froghemoth: 14 → 13.
    // Партія 25 — з Ki-rin і Boneclaw одразу: 13 → 11.
    expect(countBySource("VGM")).toBeGreaterThanOrEqual(11);
    expect(countBySource("FTD")).toBeGreaterThanOrEqual(15);
    expect(countBySource("MMotM")).toBeGreaterThanOrEqual(15);
  });

  it("contains the signature Volo's Guide monsters", () => {
    const namesEng = getAllCreatures("RULES_2014").map((c) => c.nameEng.toLowerCase());
    for (const name of [
      "gazer",
      "babau",
      "neogi",
      "neogi hatchling",
      "neogi master",
      "flind",
      "ulitharid",
      "mindwitness",
      "kobold dragonshield",
      "hobgoblin devastator",
      "gnoll witherling",
      "shoosuva",
      "tanarukk",
      "yuan-ti anathema",
      "meenlock",
      "nilbog",
      "ki-rin",
      "korred",
    ]) {
      expect(namesEng).toContain(name);
    }
  });

  it("covers all five gem dragons across every age category", () => {
    const namesEng = getAllCreatures("RULES_2014").map((c) => c.nameEng.toLowerCase());
    const gems = ["crystal", "topaz", "emerald", "sapphire", "amethyst"];
    const ages = ["{gem} dragon wyrmling", "young {gem} dragon", "adult {gem} dragon", "ancient {gem} dragon"];

    for (const gem of gems) {
      for (const age of ages) {
        expect(namesEng).toContain(age.replace("{gem}", gem));
      }
    }
  });

  it("contains the signature Mordenkainen monsters", () => {
    const namesEng = getAllCreatures("RULES_2014").map((c) => c.nameEng.toLowerCase());
    for (const name of [
      "alhoon",
      "adult oblex",
      "elder oblex",
      "adult kruthik",
      "githyanki gish",
      "githyanki kith'rak",
      "githzerai anarch",
      "shadar-kai shadow dancer",
      "shadar-kai gloom weaver",
      "spawn of kyuss",
      "the angry",
      "boggle",
    ]) {
      expect(namesEng).toContain(name);
    }
  });

  it("gives every imported creature a Ukrainian name, description and statblock", () => {
    const imported = getAllCreatures("RULES_2014").filter((c) => EXPANSION_SOURCES.includes(c.source));
    // Поріг спадає з кожною партією KR12.3: перезаписані записи отримують канонічний MPMM замість
    // застарілих VGM/MMotM. Партія 10 перевела Nilbog і Kobold Scale Sorcerer, 73 → 72; партія 12
    // перевела Hobgoblin Iron Shadow і Meenlock, 72 → 70 (VGM 25 → 23); партія 16 перевела Babau
    // і Deathlock, 70 → 68 (VGM 23 → 21); партія 17 перевела Neogi Master і Warlock of the Archfey,
    // 68 → 66 (VGM 21 → 19); партія 19 перевела Tanarukk, Bodak і Yuan-ti Pit Master,
    // 66 → 63 (VGM 19 → 16); партія 20 перевела Warlock of the Great Old One (VGM → MPMM) і
    // Githzerai Zerth (MMotM → MM), 63 → 61 (VGM 16 → 15, MMotM 23 → 22); партія 22 перевела
    // Shoosuva (VGM → MPMM), 61 → 60 (VGM 15 → 14); партія 23 перевела Froghemoth (VGM → MPMM),
    // 60 → 59 (VGM 14 → 13); партія 25 перевела Ki-rin і Boneclaw (обидва VGM → MPMM),
    // 59 → 57 (VGM 13 → 11).
    expect(imported.length).toBeGreaterThanOrEqual(57);

    for (const creature of imported) {
      expect(creature.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature.name).not.toMatch(/[a-zA-Z]{3}/);
      expect(creature.description).toMatch(/[Ѐ-ӿ]/);
      expect(creature.actions).toMatch(/[Ѐ-ӿ]/);
      expect(creature.senses).toMatch(/[Ѐ-ӿ]/);
      expect(creature.ruleset).toBe("RULES_2014");
      expect(creature.xp).toMatch(/^[\d,]+ XP$/);
      expect(creature.proficiencyBonus).toMatch(/^\+\d+$/);
    }
  });

  it("keeps creature ids and slugs unique across the whole 2014 catalogue", () => {
    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((c) => c.creatureId)).size).toBe(list.length);
    expect(new Set(list.map((c) => c.nameEng.toLowerCase())).size).toBe(list.length);
    expect(new Set(list.map((c) => c.name)).size).toBe(list.length);
  });

  it("exposes imported creatures through slug lookup and Omni-Search", () => {
    const gazer = getCreatureByIdOrSlug("gazer", "RULES_2014");
    expect(gazer?.name).toBe("Ґейзер");
    // KR12.3 партія 7 перезаписала цей запис: aidedd цитує колишні Volo's-істоти як
    // MPMM (перевидання «Monsters of the Multiverse»), тож застарілий VGM тут більше не вірний.
    expect(gazer?.source).toBe("MPMM");

    const ancientEmerald = getCreatureByIdOrSlug("ancient-emerald-dragon", "RULES_2014");
    expect(ancientEmerald?.name).toBe("Стародавній смарагдовий дракон");
    expect(ancientEmerald?.challenge).toBe("23");

    const alhoon = buildOmniSearchIndex("RULES_2014").find((item) => item.subtitle === "Alhoon");
    expect(alhoon?.href).toBe("/bestiary/alhoon");
    expect(alhoon?.badge).toBe("CR 10");
  });

  it("registers the new challenge ratings in the filter helpers", () => {
    const crs = getAllCreatureCRs("RULES_2014");
    for (const cr of ["19", "20", "21", "22", "23"]) {
      expect(crs).toContain(cr);
    }
  });
});

describe("KR12.1 — поля статблока 2024 у білдері істот", () => {
  const buildSample = (meta: Parameters<typeof createCreature>[13]) =>
    createCreature(
      99001,
      "Проба",
      "Sample",
      "Середній",
      "Нежить",
      "Нейтральний",
      "MM",
      "14",
      "10 (2d8)",
      "30 фт.",
      [10, 10, 10, 10, 10, 10],
      "1",
      "200",
      meta
    );

  it("більше не ковтає damageVulnerability, переданий у meta", () => {
    expect(buildSample({ damageVulnerability: "Дробляча" }).damageVulnerability).toBe("Дробляча");
  });

  it("проносить решту полів 2024 наскрізь", () => {
    const creature = buildSample({
      initiative: "+4 (14)",
      gear: "Короткий лук, Короткий меч",
      bonusActions: "<p><b>Спритна втеча.</b> Дух відступає.</p>",
      xpInLair: "7200",
      imageUrl: "https://www.aidedd.org/monster/img/skeleton.jpg",
    });

    expect(creature.initiative).toBe("+4 (14)");
    expect(creature.gear).toBe("Короткий лук, Короткий меч");
    expect(creature.bonusActions).toBe("<p><b>Спритна втеча.</b> Дух відступає.</p>");
    expect(creature.xpInLair).toBe("7200");
    expect(creature.imageUrl).toBe("https://www.aidedd.org/monster/img/skeleton.jpg");
  });

  it("не додає порожні ключі, щоб успадковані каталоги не роздувалися", () => {
    const creature = buildSample({ damageVulnerability: "" });
    for (const field of ["initiative", "gear", "bonusActions", "damageVulnerability", "xpInLair", "imageUrl"]) {
      expect(creature).not.toHaveProperty(field);
    }
  });
});
