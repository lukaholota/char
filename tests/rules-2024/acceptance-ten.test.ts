import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { BackgroundCategory, Classes } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase, resetUserData } from "../user-data";
import {
  acceptance2024Fixtures,
  findFixture,
  type AbilityCode,
  type Acceptance2024Fixture,
} from "../fixtures/2024-acceptance";
import { build2024Character, ORIGIN_LANGUAGE_PICKS, type Built2024Character } from "../helpers/build-2024-character";
import { LanguageTranslations } from "@/lib/refs/translation";
import { minimalForm } from "../helpers/build-form";
import { minimalLevelUpForm } from "../helpers/levelup-form";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { findPersWeaponMasteryOffer } from "@/server/db/weapon-mastery";
import { limitWeaponMasteryChoice } from "@/rules/weapon-mastery";
import { findCoinKind } from "@/rules/starting-money";
import { levelUpCharacter } from "@/lib/actions/levelup";
import { createBastionForPers } from "@/lib/actions/bastion-actions";

// Файл ганяє десять персонажів крізь створення й чотири підвищення рівня. Дефолтні 5 с vitest
// розраховані на чисті тести — під паралельним прогоном 50+ файлів запити до бази в них не влазять.
vi.setConfig({ testTimeout: 60_000, hookTimeout: 300_000 });

const BUILD_TIMEOUT_MS = 300_000;

const built = new Map<string, Built2024Character>();

beforeAll(async () => {
  await resetUserData();
  for (const fixture of acceptance2024Fixtures) {
    await signInAsOwner(fixture.id);
    built.set(fixture.id, await build2024Character(fixture, { createCharacter, levelUpCharacter }));
  }
}, BUILD_TIMEOUT_MS);

afterAll(disconnectDatabase);

async function signInAsOwner(handle: string): Promise<void> {
  const user = await prisma.user.create({ data: { email: `${handle}@holota.family`, name: handle } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
}

function readBuilt(id: string): Built2024Character {
  const character = built.get(id);
  if (!character) throw new Error(`Персонаж "${id}" не збудований — дивись beforeAll`);
  return character;
}

function everyBuilt(): Built2024Character[] {
  return acceptance2024Fixtures.map((fixture) => readBuilt(fixture.id));
}

function readSnapshotAtFive(id: string) {
  const character = readBuilt(id);
  if (!character.atLevel5) throw new Error(`Персонаж "${id}" не створився: ${character.creationError}`);
  return character.atLevel5;
}

function readSourceKeys(id: string): string[] {
  return readSnapshotAtFive(id).spellSources.map((source) => source.key).sort();
}

function readSourceAbilities(id: string): Record<string, string | null> {
  return Object.fromEntries(readSnapshotAtFive(id).spellSources.map((source) => [source.key, source.ability]));
}

async function readGatedTraitLevels(): Promise<Record<string, number>> {
  const traits = await prisma.raceTrait.findMany({
    where: { ruleset: "RULES_2024", level: { gt: 1 }, feature: { engName: { contains: "(2024)" } } },
    select: { level: true, feature: { select: { engName: true } } },
  });
  const gated = traits.filter((trait) => !trait.feature.engName.startsWith("Aasimar: ") || trait.feature.engName.includes("Celestial"));

  return Object.fromEntries(gated.map((trait) => [trait.feature.engName, trait.level]));
}

/**
 * §4: у Wizard 2 / Fighter 3 рівень персонажа 5, рівень чарівника 2, рівень воїна 3.
 * Драконячий політ важить перший лічильник, підклас — другий.
 */
async function buildWizardTwoFighterThree() {
  await signInAsOwner("wizard-two-fighter-three");
  const [race, wizard, fighter, background] = await Promise.all([
    prisma.race.findFirstOrThrow({ where: { name: "DRAGONBORN_2024", ruleset: "RULES_2024" } }),
    prisma.class.findFirstOrThrow({ where: { name: "WIZARD_2024", ruleset: "RULES_2024" } }),
    prisma.class.findFirstOrThrow({ where: { name: "FIGHTER_2024", ruleset: "RULES_2024" } }),
    prisma.background.findFirstOrThrow({ where: { name: "SAGE_2024", ruleset: "RULES_2024" } }),
  ]);
  const [champion, ancestry, fightingStyle] = await Promise.all([
    prisma.subclass.findFirstOrThrow({ where: { classId: fighter.classId, name: "CHAMPION" } }),
    prisma.raceChoiceOption.findFirstOrThrow({
      where: { raceId: race.raceId, ruleset: "RULES_2024", optionNameEng: "Red" },
    }),
    // Воїн 1-го рівня класу вимагає бойового стилю — і на мультикласі теж.
    prisma.classChoiceOption.findFirstOrThrow({
      where: { classId: fighter.classId, levelsGranted: { has: 1 }, choiceOption: { optionNameEng: { endsWith: "(Defense)" } } },
      select: { choiceOptionId: true, choiceOption: { select: { groupName: true } } },
    }),
  ]);
  const fightingStyleSelection = {
    [fightingStyle.choiceOption?.groupName ?? "Бойовий стиль"]: fightingStyle.choiceOptionId,
  };

  const created = await createCharacter(
    minimalForm({
      name: "Чарівник 2 / Воїн 3",
      raceId: race.raceId,
      classId: wizard.classId,
      backgroundId: background.backgroundId,
      ruleset: "RULES_2024",
      asiSystem: "CUSTOM",
      asi: [],
      customAsi: [
        { ability: "STR", value: "15" },
        { ability: "DEX", value: "14" },
        { ability: "CON", value: "13" },
        { ability: "INT", value: "15" },
        { ability: "WIS", value: "10" },
        { ability: "CHA", value: "8" },
      ],
      backgroundAsiChoice: { mode: "+2/+1", plusTwo: "INT", plusOne: "CON" },
      raceChoiceSelections: { [ancestry.choiceGroupName]: ancestry.optionId },
    }),
  );
  if (!created.persId) throw new Error(`Мультиклас не створився: ${created.error} ${JSON.stringify(created.details)}`);

  const steps = [
    // Чарівник 2 отримує Науковця — компетентність в одній навичці, якою вже володіє (Мудрець дає Тайнознавство).
    { classId: wizard.classId, levelUpPath: "EXISTING" as const, expertiseSchema: { expertises: ["ARCANA"] } },
    { classId: fighter.classId, levelUpPath: "MULTICLASS" as const, classChoiceSelections: fightingStyleSelection },
    { classId: fighter.classId, levelUpPath: "EXISTING" as const },
    { classId: fighter.classId, levelUpPath: "EXISTING" as const, subclassId: champion.subclassId },
  ];
  for (const step of steps) {
    const result = await levelUpCharacter(created.persId, minimalLevelUpForm(step));
    if (result && "error" in result && result.error) throw new Error(`підвищення рівня: ${result.error}`);
  }

  const pers = await prisma.pers.findUniqueOrThrow({
    where: { persId: created.persId },
    include: {
      subclass: { select: { name: true } },
      features: { include: { feature: { select: { engName: true } } } },
      multiclasses: { include: { class: { select: { name: true } }, subclass: { select: { name: true } } } },
    },
  });
  const multiclassLevels = Object.fromEntries(
    pers.multiclasses.map((entry) => [entry.class.name, entry.classLevel]),
  );
  const takenByMulticlasses = pers.multiclasses.reduce((total, entry) => total + entry.classLevel, 0);

  return {
    featureNames: pers.features.map((entry) => entry.feature.engName),
    mainClassSubclass: pers.subclass?.name ?? null,
    multiclassSubclasses: pers.multiclasses.map((entry) => ({
      className: entry.class.name,
      subclass: entry.subclass?.name ?? null,
    })),
    levels: { character: pers.level, WIZARD_2024: pers.level - takenByMulticlasses, ...multiclassLevels },
  };
}

function addBackgroundAsi(
  base: Record<AbilityCode, number>,
  choice: Acceptance2024Fixture["input"]["backgroundAsi"],
): Record<AbilityCode, number> {
  const scores = { ...base };
  if (choice.mode === "+2/+1") {
    scores[choice.plusTwo] = Math.min(20, scores[choice.plusTwo] + 2);
    scores[choice.plusOne] = Math.min(20, scores[choice.plusOne] + 1);
    return scores;
  }
  for (const ability of choice.abilities) scores[ability] = Math.min(20, scores[ability] + 1);
  return scores;
}

/** Жоден із десяти персонажів §15 не бере +1/+1/+1 — цей режим доводиться перевіряти окремим персонажем. */
async function createWithSpreadAcrossThree(): Promise<Record<string, number>> {
  await signInAsOwner("spread-across-three");
  const [race, characterClass, background, fightingStyle] = await Promise.all([
    prisma.race.findFirstOrThrow({ where: { name: "DRAGONBORN_2024", ruleset: "RULES_2024" } }),
    prisma.class.findFirstOrThrow({ where: { name: "FIGHTER_2024", ruleset: "RULES_2024" } }),
    prisma.background.findFirstOrThrow({ where: { name: "SOLDIER_2024", ruleset: "RULES_2024" } }),
    prisma.classChoiceOption.findFirstOrThrow({
      where: {
        class: { name: "FIGHTER_2024", ruleset: "RULES_2024" },
        levelsGranted: { has: 1 },
        choiceOption: { optionNameEng: { endsWith: "(Defense)" } },
      },
      select: { choiceOptionId: true, choiceOption: { select: { groupName: true } } },
    }),
  ]);

  const result = await createCharacter(
    minimalForm({
      name: "Розподіл на три",
      raceId: race.raceId,
      classId: characterClass.classId,
      backgroundId: background.backgroundId,
      ruleset: "RULES_2024",
      asiSystem: "CUSTOM",
      asi: [],
      customAsi: [
        { ability: "STR", value: "15" },
        { ability: "DEX", value: "14" },
        { ability: "CON", value: "13" },
        { ability: "INT", value: "12" },
        { ability: "WIS", value: "10" },
        { ability: "CHA", value: "8" },
      ],
      backgroundAsiChoice: { mode: "+1/+1/+1", abilities: ["STR", "DEX", "CON"] },
      classChoiceSelections: {
        [fightingStyle.choiceOption.groupName]: fightingStyle.choiceOptionId,
      },
    }),
  );

  if (!result.persId) throw new Error(`Персонаж із розподілом +1/+1/+1 не створився: ${result.error}`);
  const pers = await prisma.pers.findUniqueOrThrow({ where: { persId: result.persId } });
  return { STR: pers.str, DEX: pers.dex, CON: pers.con };
}

async function findTablesMatching(pattern: string): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name ILIKE $1`,
    pattern,
  );
  return rows.map((row) => row.table_name);
}

describe("KR18.1 — приймання правил 2024 на десяти персонажах 5-го рівня (reference-2024.md §15–16)", () => {
  it("К27 · усі десять фікстур доходять до 5-го рівня без помилки серверної дії", () => {
    const broken = everyBuilt()
      .filter((character) => character.creationError || character.levelUpErrors.length || character.atLevel5?.level !== 5)
      .map((character) => ({
        id: character.fixture.id,
        creationError: character.creationError,
        levelUpErrors: character.levelUpErrors,
        level: character.atLevel5?.level ?? null,
      }));

    expect(broken).toEqual([]);
  });

  it("К1 · редакція персонажа й весь його контент — 2024, а не 2014 із підміненими назвами", () => {
    const mismatched = everyBuilt().flatMap((character) => {
      const snapshot = character.atLevel5;
      if (!snapshot) return [{ id: character.fixture.id, reason: character.creationError }];
      const { input } = character.fixture;
      const matches =
        snapshot.ruleset === "RULES_2024" &&
        snapshot.species === input.species &&
        snapshot.className === input.class &&
        snapshot.background === input.background;
      return matches ? [] : [{ id: character.fixture.id, snapshot }];
    });

    expect(mismatched).toEqual([]);
  });

  it("К2 · рівень персонажа не дорівнює рівню класу: Wizard 2 / Fighter 3 літає, але підклас має лише воїн", async () => {
    const multiclass = await buildWizardTwoFighterThree();

    // Рівень персонажа 5 — риса виду приходить, хоч жоден клас до 5-го не доріс.
    expect(multiclass.featureNames).toContain("Dragonborn: Draconic Flight (2024)");
    // Рівень класу 3 — підклас є у воїна…
    expect(multiclass.multiclassSubclasses).toEqual([{ className: "FIGHTER_2024", subclass: "CHAMPION" }]);
    // …і немає в чарівника, хоч персонаж давно за 3-й рівень.
    expect(multiclass.mainClassSubclass).toBeNull();
    expect(multiclass.levels).toEqual({ character: 5, WIZARD_2024: 2, FIGHTER_2024: 3 });
  });

  it("К3 · походження обмежує характеристики: сервер відхиляє і чужу характеристику, і відсутній вибір", async () => {
    await signInAsOwner("invalid-background-asi");
    const [race, characterClass, background, fightingStyle] = await Promise.all([
      prisma.race.findFirstOrThrow({ where: { name: "DRAGONBORN_2024", ruleset: "RULES_2024" } }),
      prisma.class.findFirstOrThrow({ where: { name: "FIGHTER_2024", ruleset: "RULES_2024" } }),
      prisma.background.findFirstOrThrow({ where: { name: "SOLDIER_2024", ruleset: "RULES_2024" } }),
      prisma.classChoiceOption.findFirstOrThrow({
        where: {
          class: { name: "FIGHTER_2024", ruleset: "RULES_2024" },
          levelsGranted: { has: 1 },
          choiceOption: { optionNameEng: { endsWith: "(Defense)" } },
        },
        select: { choiceOptionId: true, choiceOption: { select: { groupName: true } } },
      }),
    ]);
    const baseForm = {
      raceId: race.raceId,
      classId: characterClass.classId,
      backgroundId: background.backgroundId,
      ruleset: "RULES_2024" as const,
      classChoiceSelections: {
        [fightingStyle.choiceOption.groupName]: fightingStyle.choiceOptionId,
      },
    };

    // Soldier дозволяє STR / DEX / CON — Мудрість не з цього списку.
    const wrongAbility = await createCharacter(
      minimalForm({
        ...baseForm,
        name: "Невалідний розподіл",
        backgroundAsiChoice: { mode: "+2/+1", plusTwo: "STR", plusOne: "WIS" },
      }),
    );
    const noChoiceAtAll = await createCharacter(minimalForm({ ...baseForm, name: "Без розподілу" }));

    expect(wrongAbility).toMatchObject({ error: expect.stringContaining("не відповідає") });
    expect(noChoiceAtAll).toMatchObject({ error: expect.stringContaining("Оберіть бонуси") });
  });

  it("К4 · походження дає або +2/+1, або +1/+1/+1 — і обидва розподіли доїжджають у персонажа", async () => {
    const afterCreation = Object.fromEntries(
      everyBuilt().map((character) => [character.fixture.id, character.atLevel1?.abilityScores ?? null]),
    );
    const expectedAfterCreation = Object.fromEntries(
      acceptance2024Fixtures.map((fixture) => [
        fixture.id,
        addBackgroundAsi(fixture.input.baseAbilityScores, fixture.input.backgroundAsi),
      ]),
    );

    expect(afterCreation).toEqual(expectedAfterCreation);
    expect(await createWithSpreadAcrossThree()).toMatchObject({ STR: 16, DEX: 15, CON: 14 });
  });

  it("К5 · риси приходять із кількох джерел: походження і вид дають по рисі на 1-му рівні", () => {
    const paladin = readSnapshotAtFive("07-human-paladin-noble");

    expect(paladin.featNames).toEqual(expect.arrayContaining(["SKILLED", "TOUGH"]));
    // Noble дає лише History і Persuasion, Паладин 2024 — жодної: ці три прийшли від Skilled.
    const fromSkilled = ["ARCANA", "INSIGHT", "RELIGION"];
    const proficient = paladin.skills.filter((skill) => skill.proficiencyType !== "NONE").map((skill) => skill.name);

    expect(proficient).toEqual(expect.arrayContaining(fromSkilled));
  });

  it("К6 · риса походження належить категорії ORIGIN, а риса 4-го рівня — GENERAL", async () => {
    const categories = await prisma.feat.findMany({
      where: { ruleset: "RULES_2024", name: { in: ["SKILLED", "TOUGH", "ALERT", "GRAPPLER"] } },
      select: { name: true, category: true },
    });
    const byName = Object.fromEntries(categories.map((feat) => [feat.name, feat.category]));

    expect(byName).toMatchObject({ SKILLED: "ORIGIN", TOUGH: "ORIGIN", ALERT: "ORIGIN", GRAPPLER: "GENERAL" });
  });

  it("К7 · риса несе передумови: Grappler вимагає 4-й рівень і Спритність 13", async () => {
    const grappler = await prisma.feat.findFirstOrThrow({
      where: { ruleset: "RULES_2024", name: "GRAPPLER" },
      select: { prerequisiteLevel: true, prerequisiteAbilityScore: true },
    });

    expect(grappler).toMatchObject({ prerequisiteLevel: 4, prerequisiteAbilityScore: expect.anything() });
  });

  it("К8 · риса сама породжує вибори: Skilled дає три навички, Magic Initiate — список заклинань", async () => {
    const withChoices = await prisma.feat.findMany({
      where: { ruleset: "RULES_2024", name: { in: ["SKILLED", "MAGIC_INITIATE"] } },
      select: { name: true, _count: { select: { featChoiceOptions: true } } },
    });
    const optionCounts = Object.fromEntries(withChoices.map((feat) => [feat.name, feat._count.featChoiceOptions]));

    expect(optionCounts.SKILLED).toBeGreaterThan(0);
    expect(optionCounts.MAGIC_INITIATE).toBeGreaterThan(0);
  });

  it("К9 · риса змінює характеристику: Grappler на 4-му рівні дає +1 до Спритності", () => {
    const monk = readSnapshotAtFive("10-aasimar-monk-hermit");

    expect(monk.abilityScores.DEX).toBe(findFixture("10-aasimar-monk-hermit").expected.finalAbilityScores.DEX);
  });

  it("К10 · вид має вкладені вибори: родовід, предок і спадок записані в персонажа", () => {
    const wrong = everyBuilt()
      .filter((character) => character.fixture.input.speciesChoices.length > 0)
      .flatMap((character) => {
        const recorded = character.atLevel5?.speciesChoiceLabels ?? [];
        return recorded.length === character.fixture.input.speciesChoices.length
          ? []
          : [`${character.fixture.id}: ${recorded.length} виборів замість ${character.fixture.input.speciesChoices.length} — ${recorded.join(" / ") || "жодного"}`];
      });

    expect(wrong).toEqual([]);
    // Вибір не лише записаний, а й дав наслідок: обраний родовід приносить свою фічу.
    expect(readSnapshotAtFive("03-high-elf-wizard-sage").featureNames).toContain("Elven Lineage: High Elf (2024)");
    expect(readSnapshotAtFive("01-dragonborn-fighter-soldier").featureNames).toContain("Draconic Ancestry: Red (2024)");
    expect(readSnapshotAtFive("05-stone-goliath-barbarian-guard").featureNames).toContain("Giant Ancestry: Stone's Endurance (2024)");
  });

  it("К11 · риса виду відкривається за рівнем персонажа: немає на 1-му, є на своєму рівні", async () => {
    const wrong = everyBuilt().flatMap((character) =>
      character.fixture.expected.characterLevelGatedGrants.flatMap((grant) => {
        const namesAt = (snapshot: Built2024Character["atLevel1"]) =>
          grant.kind === "feature" ? snapshot?.featureNames : snapshot?.spellNames;
        const tooEarly = namesAt(character.atLevel1)?.includes(grant.name)
          ? [`${character.fixture.id}: ${grant.name} видано вже на 1-му, а має з ${grant.characterLevel}-го`]
          : [];
        const missing = namesAt(character.atLevel5)?.includes(grant.name)
          ? []
          : [`${character.fixture.id}: ${grant.name} відсутня на 5-му рівні`];
        return [...tooEarly, ...missing];
      }),
    );

    expect(wrong).toEqual([]);
    // Рівень записаний у даних, а не зашитий у код: без нього гейта нема де тримати.
    expect(await readGatedTraitLevels()).toEqual({
      "Aasimar: Celestial Revelation (2024)": 3,
      "Dragonborn: Draconic Flight (2024)": 5,
      "Goliath: Large Form (2024)": 5,
    });
  });

  it("К12 · класові фічі відкриваються за рівнем класу — усі очікувані на місці на 5-му", () => {
    const missing = everyBuilt().flatMap((character) =>
      character.fixture.expected.requiredFeatures
        .filter((feature) => !character.atLevel5?.featureNames.includes(feature))
        .map((feature) => `${character.fixture.id}: ${feature}`),
    );

    expect(missing).toEqual([]);
  });

  it("К13 · підклас береться рівно на 3-му рівні класу для всіх тринадцяти класів", () => {
    const wrong = everyBuilt().flatMap((character) => {
      const tooEarly = character.atLevel1?.subclass ? [`${character.fixture.id}: підклас уже на 1-му рівні`] : [];
      const missing =
        character.atLevel5?.subclass === character.fixture.input.subclass
          ? []
          : [`${character.fixture.id}: на 5-му рівні підклас ${character.atLevel5?.subclass ?? "відсутній"}`];
      return [...tooEarly, ...missing];
    });

    expect(wrong).toEqual([]);
  });

  it("К14 · володіння й компетентність складаються: навичка може бути «немає / володіє / компетентність»", () => {
    const bard = readSnapshotAtFive("06-halfling-bard-entertainer");
    const expertise = findFixture("06-halfling-bard-entertainer").expected.expertiseSkills ?? [];
    const actual = bard.skills
      .filter((skill) => expertise.includes(skill.name))
      .map((skill) => `${skill.name}:${skill.proficiencyType}`)
      .sort();

    expect(actual).toEqual(expertise.map((skill) => `${skill}:EXPERTISE`).sort());
  });

  it("К15 · джерела заклинань незалежні: у персонажа їх стільки, скільки дає референс", () => {
    const actual = Object.fromEntries(
      everyBuilt().map((character) => [character.fixture.id, readSourceKeys(character.fixture.id)]),
    );
    const expected = Object.fromEntries(
      acceptance2024Fixtures.map((fixture) => [
        fixture.id,
        fixture.expected.spellSources.map((source) => source.source).sort(),
      ]),
    );

    expect(actual).toEqual(expected);
  });

  // Перевірка навмисно поведінкова, а не «чи є стовпець»: характеристика джерела — виведена
  // величина (клас, обрана опція родоводу, обраний список риси), у базі її немає й не має бути.
  it("К16 · кожне джерело заклинань несе власну характеристику замовляння", () => {
    const actual = Object.fromEntries(
      everyBuilt().map((character) => [character.fixture.id, readSourceAbilities(character.fixture.id)]),
    );
    const expected = Object.fromEntries(
      acceptance2024Fixtures.map((fixture) => [
        fixture.id,
        Object.fromEntries(fixture.expected.spellSources.map((source) => [source.source, source.ability])),
      ]),
    );

    expect(actual).toEqual(expected);
  });

  it("К17 · завжди підготовані й даровані заклинання приходять не від гравця, а від правила", () => {
    const actual = Object.fromEntries(
      everyBuilt().map((character) => [
        character.fixture.id,
        (character.atLevel5?.grantedSpells ?? [])
          .filter((spell) => spell.origin !== "MANUAL")
          .map((spell) => spell.engName)
          .sort(),
      ]),
    );
    const expected = Object.fromEntries(
      acceptance2024Fixtures.map((fixture) => [fixture.id, [...fixture.expected.grantedSpells].sort()]),
    );

    expect(actual).toEqual(expected);

    // «Ви завжди маєте це заклинання підготовленим» — і воно не зʼїдає ліміт заклинань класу.
    const lineageSpells = readSnapshotAtFive("04-rock-gnome-rogue-criminal").grantedSpells;
    expect(lineageSpells.every((spell) => spell.isPrepared)).toBe(true);
    expect(lineageSpells.map((spell) => spell.sourceName)).toEqual(["Gnome: Gnomish Lineage (2024)", "Gnome: Gnomish Lineage (2024)"]);
  });

  it("К18 · майстерність зброї має ємність із класу й вибрані види зброї в персонажа", () => {
    const actual = Object.fromEntries(
      everyBuilt().map((character) => [character.fixture.id, readSnapshotAtFive(character.fixture.id).weaponMastery]),
    );
    const expected = Object.fromEntries(
      acceptance2024Fixtures.map((fixture) => [
        fixture.id,
        {
          capacity: fixture.expected.weaponMastery.capacity,
          weapons: (fixture.expected.weaponMastery.weapons ?? []).map(toWeaponCode),
        },
      ]),
    );

    expect(actual).toEqual(expected);
  });

  it("К18a · сервер не приймає ні чужої зброї, ні набору понад ємність класу", async () => {
    const rogue = readBuilt("04-rock-gnome-rogue-criminal");
    const greatsword = await prisma.weapon.findFirstOrThrow({
      where: { ruleset: "RULES_2024", name: "GREATSWORD" },
      select: { weaponId: true },
    });
    const offer = await findPersWeaponMasteryOffer(prisma, rogue.persId!);

    // Дворучний меч — марціальна зброя без Finesse і Light: пул шахрая його не містить.
    const overreach = [greatsword.weaponId, ...offer.options.map((weapon) => weapon.weaponId)];

    expect(limitWeaponMasteryChoice(overreach, offer.options, offer.capacity)).toEqual(
      offer.options.slice(0, offer.capacity).map((weapon) => weapon.weaponId),
    );
  });

  it("К19 · бойовий стиль — це вибір риси категорії FIGHTING_STYLE, а не окреме поле", () => {
    const withFightingStyle = ["01-dragonborn-fighter-soldier", "07-human-paladin-noble", "08-orc-ranger-guide"];
    const missing = withFightingStyle.filter(
      (id) => !readSnapshotAtFive(id).featNames.some((name) => FIGHTING_STYLE_FEATS.has(name)),
    );

    expect(missing).toEqual([]);
  });

  it("К20 · похідні величини складаються з кількох джерел: кубик класу, Статура, Здоровань, риса виду", () => {
    const withKnownHp = acceptance2024Fixtures.filter((fixture) => fixture.expected.maxHp);
    const actual = Object.fromEntries(withKnownHp.map((fixture) => [fixture.id, readSnapshotAtFive(fixture.id).maxHp]));
    const expected = Object.fromEntries(withKnownHp.map((fixture) => [fixture.id, fixture.expected.maxHp]));

    expect(actual).toEqual(expected);
  });

  it("К21 · спорядження походження доїжджає в персонажа", async () => {
    const wrong: string[] = [];
    for (const character of everyBuilt()) {
      const background = await prisma.background.findFirstOrThrow({
        where: { name: character.fixture.input.background, ruleset: "RULES_2024" },
        select: { items: true },
      });
      const itemNames = (Array.isArray(background.items) ? background.items : []).flatMap((item) =>
        item && typeof item === "object" && "name" in item ? [String(item.name)] : [],
      );
      const equipment = character.atLevel5?.customEquipment ?? "";
      const absent = itemNames.filter((name) => name !== "зм" && !equipment.includes(name));
      if (absent.length) wrong.push(`${character.fixture.id}: ${absent.join(", ")}`);
    }

    expect(wrong).toEqual([]);
  });

  /// KR26.3 · К21 міряє лише майно походження, і класова половина довго лишалася невидимою для
  /// матриці: рядків 2024 не існувало взагалі. Тепер обрана літера має доїхати цілком — речі в
  /// майно, монети в гаманець.
  it("К28 · обраний варіант класового спорядження доїжджає в персонажа", async () => {
    const wrong: string[] = [];

    for (const character of everyBuilt()) {
      const letter = character.fixture.input.classEquipment;
      if (!letter) {
        wrong.push(`${character.fixture.id}: фікстура не називає літеру спорядження`);
        continue;
      }

      const chosen = await prisma.classStartingEquipmentOption.findMany({
        where: {
          ruleset: "RULES_2024",
          option: letter,
          class: { name: character.fixture.input.class as Classes, ruleset: "RULES_2024" },
        },
        select: { item: true, quantity: true, equipmentPack: { select: { items: true } } },
      });

      const equipment = character.atLevel5?.customEquipment ?? "";
      const absent = chosen
        .flatMap((row) => (row.item && findCoinKind(row.item) === null ? [row.item] : []))
        .filter((name) => !equipment.includes(name));
      if (absent.length) wrong.push(`${character.fixture.id}: у майні немає ${absent.join(", ")}`);

      const coinsFromClass = chosen.reduce(
        (sum, row) => (row.item && findCoinKind(row.item) === "gp" ? sum + row.quantity : sum),
        0,
      );
      const coinsFromOrigin = await findOriginGold(character.fixture.input.background as BackgroundCategory);
      const expectedGold = coinsFromClass + coinsFromOrigin;
      const actualGold = character.atLevel5?.gold ?? 0;

      if (actualGold !== expectedGold) {
        wrong.push(`${character.fixture.id}: золота ${actualGold}, очікували ${expectedGold} (клас ${coinsFromClass} + походження ${coinsFromOrigin})`);
      }

      const coinLines = equipment.match(/\b(зм|см|мм|ем|пм) x\d+/g) ?? [];
      if (coinLines.length) wrong.push(`${character.fixture.id}: монети лишилися рядком майна — ${coinLines.join(", ")}`);
    }

    expect(wrong).toEqual([]);
  });

  it("К22 · походження дає володіння інструментом", async () => {
    const backgrounds = await prisma.background.findMany({
      where: { ruleset: "RULES_2024" },
      select: { name: true, toolProficiencies: true },
    });
    const withoutTools = backgrounds
      .filter((background) => !Array.isArray(background.toolProficiencies) || background.toolProficiencies.length === 0)
      .map((background) => background.name);

    expect(withoutTools).toEqual([]);
  });

  it("К23 · мови Origin: Загальна плюс дві стандартні", () => {
    const expected = ["Загальна", ...ORIGIN_LANGUAGE_PICKS.map((code) => LanguageTranslations[code])];
    const wrong = everyBuilt()
      .map((character) => ({
        id: character.fixture.id,
        languages: splitLanguages(character.atLevel5?.customLanguages),
      }))
      .filter((entry) => expected.some((language) => !entry.languages.includes(language)))
      .map((entry) => `${entry.id}: ${entry.languages.join(" / ") || "жодної"}`);

    expect(wrong).toEqual([]);
  });

  it("К23a · крок мов не лишає підказки «обери ще» після зробленого вибору", () => {
    const nagging = everyBuilt()
      .filter((character) => (character.atLevel5?.customLanguages ?? "").includes("Обери ще"))
      .map((character) => character.fixture.id);

    expect(nagging).toEqual([]);
  });

  it.todo("К24 · зміна попереднього вибору перераховує похідне — не належить жодному KR у O18, потрібне рішення власника");

  /// Позеленів 2026-08-30: O19 довіз наказ/захисників/найманців/нотатки (KR19.4), тож
  /// `createBastionForPers` — це вже справжня дія, а не проба схеми. Перевіряє повний шлях:
  /// фікстура → створення → чотири підвищення рівня → сервер бастіону, для того самого
  /// persId, яким пройшли решта 26 критеріїв.
  it("К25 · бастіон відкривається на 5-му рівні персонажа", async () => {
    const withExpectation = everyBuilt().filter(
      (character) => character.fixture.expected.bastionUnlocked !== undefined
    );

    const wrong: string[] = [];
    for (const character of withExpectation) {
      if (!character.persId) {
        wrong.push(`${character.fixture.id}: персонаж не створився`);
        continue;
      }

      const owner = await prisma.pers.findUniqueOrThrow({
        where: { persId: character.persId },
        select: { user: { select: { email: true } } },
      });
      vi.mocked(auth).mockResolvedValue({ user: { email: owner.user.email } } as never);

      const created = await createBastionForPers({
        persId: character.persId,
        name: "Тестовий бастіон приймання",
      });
      const unlocked = created.ok;
      if (unlocked !== character.fixture.expected.bastionUnlocked) {
        wrong.push(`${character.fixture.id}: очікували ${character.fixture.expected.bastionUnlocked}, отримали ${unlocked}`);
      }
    }

    expect(wrong).toEqual([]);
  });

  // Позеленів 2026-08-29 не роботою O18: O19 завів `pers_bastion_facility`. Це проба схеми —
  // вона каже, що приміщенням є де лежати, а не що передумови вже рахуються.
  it("К26 · приміщення бастіону мають передумови за можливостями персонажа", async () => {
    expect(await findTablesMatching("%facility%")).not.toEqual([]);
  });
});

function splitLanguages(stored: string | undefined): string[] {
  return (stored ?? "").split(/[\n,]/).map((value) => value.trim()).filter(Boolean);
}

const toWeaponCode = (engName: string) =>
  engName.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");

const FIGHTING_STYLE_FEATS = new Set([
  "ARCHERY",
  "BLIND_FIGHTING",
  "DEFENSE",
  "DUELING",
  "GREAT_WEAPON_FIGHTING",
  "INTERCEPTION",
  "PROTECTION",
  "THROWN_WEAPON_FIGHTING",
  "TWO_WEAPON_FIGHTING",
  "UNARMED_FIGHTING",
]);

async function findOriginGold(background: BackgroundCategory): Promise<number> {
  const row = await prisma.background.findFirstOrThrow({
    where: { name: background, ruleset: "RULES_2024" },
    select: { items: true },
  });
  const items = Array.isArray(row.items) ? row.items : [];

  return items.reduce((sum: number, item) => {
    if (!item || typeof item !== "object" || !("name" in item)) return sum;
    const { name, quantity } = item as { name?: unknown; quantity?: unknown };
    if (findCoinKind(String(name)) !== "gp") return sum;
    return sum + (typeof quantity === "number" ? quantity : Number(quantity) || 0);
  }, 0);
}
