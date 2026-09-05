import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ArmorType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase, resetUserData } from "../user-data";
import {
  multiclass2024Fixtures,
  findMulticlassFixture,
  type Multiclass2024Fixture,
} from "../fixtures/2024-multiclass";
import {
  build2024MulticlassCharacter,
  toWeaponCode,
  type Built2024MulticlassCharacter,
  type Multiclass2024Snapshot,
} from "../helpers/build-2024-multiclass-character";
import { minimalForm } from "../helpers/build-form";
import { minimalLevelUpForm } from "../helpers/levelup-form";
import { formatArmorProficiencies, formatWeaponProficiencies } from "@/lib/components/characterCreator/infoUtils";
import { findFacilityMatch } from "@/rules/bastions";
import { getBastionFacilityBySlug } from "@/lib/bastionsData";
import { findBastionCharacterProfile } from "@/server/db/bastions";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { getLevelUpInfo, levelUpCharacter } from "@/lib/actions/levelup";
import { addManualSpell, learnClassSpells } from "@/server/db/spell-actions";

// Пʼятнадцять персонажів — це ~123 виклики `levelUpCharacter`, кожен зі снапшотом і транзакцією;
// №24 сам по собі девʼятнадцять. Дефолтні 5 с vitest розраховані на чисті тести.
vi.setConfig({ testTimeout: 120_000, hookTimeout: 1_800_000 });

const BUILD_TIMEOUT_MS = 1_800_000;

const built = new Map<string, Built2024MulticlassCharacter>();

beforeAll(async () => {
  await resetUserData();
  for (const fixture of multiclass2024Fixtures) {
    await signInAsOwner(fixture.id);
    built.set(
      fixture.id,
      await build2024MulticlassCharacter(fixture, { createCharacter, levelUpCharacter, getLevelUpInfo }),
    );
  }
}, BUILD_TIMEOUT_MS);

afterAll(disconnectDatabase);

async function signInAsOwner(handle: string): Promise<void> {
  const user = await prisma.user.create({ data: { email: `${handle}@holota.family`, name: handle } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
}

async function signInAsOwnerOf(persId: number): Promise<void> {
  const owner = await prisma.pers.findUniqueOrThrow({
    where: { persId },
    select: { user: { select: { email: true } } },
  });
  vi.mocked(auth).mockResolvedValue({ user: { email: owner.user.email } } as never);
}

function readBuilt(id: string): Built2024MulticlassCharacter {
  const character = built.get(id);
  if (!character) throw new Error(`Персонаж "${id}" не збудований — дивись beforeAll`);
  return character;
}

function everyBuilt(): Built2024MulticlassCharacter[] {
  return multiclass2024Fixtures.map((fixture) => readBuilt(fixture.id));
}

function readFinal(id: string): Multiclass2024Snapshot {
  const character = readBuilt(id);
  if (!character.atFinalLevel) throw new Error(`Персонаж "${id}" не створився: ${character.creationError}`);
  return character.atFinalLevel;
}

function readPersId(id: string): number {
  const persId = readBuilt(id).persId;
  if (!persId) throw new Error(`Персонаж "${id}" не створився: ${readBuilt(id).creationError}`);
  return persId;
}

/** Порівняння «фікстура проти персонажа» для всіх, у кого поле заповнене. */
function compareWhereExpected<Value>(
  readExpected: (fixture: Multiclass2024Fixture) => Value | undefined,
  readActual: (snapshot: Multiclass2024Snapshot, fixture: Multiclass2024Fixture) => Value,
): { actual: Record<string, Value>; expected: Record<string, Value> } {
  const withExpectation = multiclass2024Fixtures.filter((fixture) => readExpected(fixture) !== undefined);

  return {
    actual: Object.fromEntries(
      withExpectation.map((fixture) => [fixture.id, readActual(readFinal(fixture.id), fixture)]),
    ),
    expected: Object.fromEntries(
      withExpectation.map((fixture) => [fixture.id, readExpected(fixture) as Value]),
    ),
  };
}

/**
 * Персонаж, якому книга мультиклас забороняє: сервер має відхилити вхід у клас, чию базову
 * характеристику (або характеристику вже наявного класу) персонаж не тягне.
 */
async function tryForbiddenMulticlassEntry(input: {
  handle: string;
  species: string;
  background: string;
  startingClass: string;
  newClass: string;
  scores: Record<string, number>;
  backgroundAsi: { mode: "+2/+1"; plusTwo: string; plusOne: string };
}): Promise<{ error?: string } | void> {
  await signInAsOwner(input.handle);
  const [race, startingClass, newClass, background] = await Promise.all([
    prisma.race.findFirstOrThrow({ where: { name: input.species as never, ruleset: "RULES_2024" } }),
    prisma.class.findFirstOrThrow({ where: { name: input.startingClass as never, ruleset: "RULES_2024" } }),
    prisma.class.findFirstOrThrow({ where: { name: input.newClass as never, ruleset: "RULES_2024" } }),
    prisma.background.findFirstOrThrow({ where: { name: input.background as never, ruleset: "RULES_2024" } }),
  ]);

  const created = await createCharacter(
    minimalForm({
      name: input.handle,
      raceId: race.raceId,
      classId: startingClass.classId,
      backgroundId: background.backgroundId,
      ruleset: "RULES_2024",
      asiSystem: "CUSTOM",
      asi: [],
      customAsi: Object.entries(input.scores).map(([ability, value]) => ({ ability, value: String(value) })),
      backgroundAsiChoice: input.backgroundAsi as never,
    }),
  );
  if (!created.persId) throw new Error(`Проба "${input.handle}" не створилася: ${created.error}`);

  return levelUpCharacter(
    created.persId,
    minimalLevelUpForm({ classId: newClass.classId, levelUpPath: "MULTICLASS" }),
  );
}

/** Те саме заклинання, яке персонажу дають і клас, і риса — два джерела, одне імʼя. */
async function addSameSpellFromTwoSources(persId: number): Promise<{ rows: number; secondSourceAccepted: boolean }> {
  const spell = await prisma.spell.findFirstOrThrow({
    where: { ruleset: "RULES_2024", engName: "Cure Wounds" },
    select: { spellId: true },
  });

  await learnClassSpells({ persId, spellIds: [spell.spellId], level: 5 });
  const fromFeat = await addManualSpell({ persId, spellId: spell.spellId, notes: "Magic Initiate (Cleric)" });

  return {
    rows: await prisma.persSpell.count({ where: { persId, spellId: spell.spellId } }),
    secondSourceAccepted: fromFeat.success,
  };
}

async function readFacilityStatuses(persId: number, facilityNames: string[]): Promise<Record<string, string>> {
  const profile = await findBastionCharacterProfile(persId);
  if (!profile) throw new Error(`Профіль бастіону для ${persId} не зібрався`);

  return Object.fromEntries(
    facilityNames.map((name) => {
      const facility = getBastionFacilityBySlug(name);
      if (!facility) throw new Error(`Приміщення "${name}" немає в каталозі`);
      return [name, findFacilityMatch(facility, profile).status];
    }),
  );
}

describe("KR27.1 — приймання мультикласу 2024 на пʼятнадцяти персонажах (reference-fifteen.md, матриця М1–М27)", () => {
  it("М27 · усі пʼятнадцять доростають до свого рівня без помилки серверної дії", () => {
    const broken = everyBuilt()
      .filter(
        (character) =>
          character.creationError ||
          character.levelUpErrors.length ||
          character.atFinalLevel?.characterLevel !== character.fixture.expected.characterLevel,
      )
      .map((character) => ({
        id: character.fixture.id,
        creationError: character.creationError,
        levelUpErrors: character.levelUpErrors,
        level: character.atFinalLevel?.characterLevel ?? null,
      }));

    expect(broken).toEqual([]);
  });

  it("М1 · Додаткова атака відкривається рівнем класу: персонаж 8-го рівня з Воїном 4 і Паладином 4 її не має", () => {
    const fighterPaladin = readFinal("22-blue-dragonborn-fighter4-paladin4");
    const absent = findMulticlassFixture("22-blue-dragonborn-fighter4-paladin4").expected.absentFeatures ?? [];

    expect(fighterPaladin.featureNames.filter((name) => absent.includes(name))).toEqual([]);
    expect(fighterPaladin.characterLevel).toBe(8);
  });

  it("М2 · бонус вправності рахується за сумарним рівнем персонажа, а не за найбільшим класом", () => {
    const { actual, expected } = compareWhereExpected(
      (fixture) => fixture.expected.proficiencyBonus,
      (snapshot) => snapshot.proficiencyBonus,
    );

    expect(actual).toEqual(expected);
  });

  it("М3 · кістки хітів різних типів тримаються окремо: 1к6 + 5к10 + 1к8", () => {
    const { actual, expected } = compareWhereExpected(
      (fixture) => fixture.expected.hitDiceByType,
      (snapshot) => snapshot.hitDiceByType,
    );

    expect(actual).toEqual(expected);
    expect(readFinal("25-orc-wizard1-fighter5-rogue1").hitDiceByType).toEqual({ d6: 1, d10: 5, d8: 1 });
  });

  it("М4 · сервер відхиляє вхід у клас без 13+ у базовій характеристиці нового й усіх наявних", async () => {
    const newClassUnmet = await tryForbiddenMulticlassEntry({
      handle: "multiclass-req-new-class",
      species: "ORC_2024",
      background: "SAILOR_2024",
      startingClass: "BARBARIAN_2024",
      newClass: "DRUID_2024",
      scores: { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 8, CHA: 10 },
      backgroundAsi: { mode: "+2/+1", plusTwo: "STR", plusOne: "DEX" },
    });
    const existingClassUnmet = await tryForbiddenMulticlassEntry({
      handle: "multiclass-req-existing-class",
      species: "DWARF_2024",
      background: "WAYFARER_2024",
      startingClass: "MONK_2024",
      newClass: "ROGUE_2024",
      scores: { STR: 14, DEX: 15, CON: 13, INT: 12, WIS: 8, CHA: 10 },
      backgroundAsi: { mode: "+2/+1", plusTwo: "DEX", plusOne: "CHA" },
    });

    // Друїд просить Мудрість 13 — у варвара її 8.
    expect(newClassUnmet).toMatchObject({ error: expect.any(String) });
    // Пройдисвіт просить лише Спритність, але монах у наборі вимагає ще й Мудрість 13.
    expect(existingClassUnmet).toMatchObject({ error: expect.any(String) });
  });

  it("М5 · початковий клас дає повний стартовий пакет володінь, узятий пізніше — лише скорочений", () => {
    const startedAsFighter = readFinal("17-dwarf-fighter3-wizard5");
    const tookFighterLater = readFinal("25-orc-wizard1-fighter5-rogue1");
    const heavyArmor = formatArmorProficiencies([ArmorType.HEAVY]);
    const martialWeapons = formatWeaponProficiencies({ type: ["MARTIAL_WEAPON"] });

    // Воїн як початковий клас — важкий обладунок у пакеті.
    expect(startedAsFighter.customProficiencies).toContain(heavyArmor);
    // Воїн, узятий другим, дає скорочений набір: марціальна зброя є…
    expect(tookFighterLater.customProficiencies).toContain(martialWeapons);
    // …а важкого обладунку в ньому немає.
    expect(tookFighterLater.customProficiencies).not.toContain(heavyArmor);
  });

  it("М6 · порядок узяття класів відновлюється з бази: pers.classId — перший", () => {
    const { actual, expected } = compareWhereExpected(
      (fixture) => fixture.expected.startingClass,
      (snapshot) => snapshot.startingClass,
    );

    expect(actual).toEqual(expected);
    expect(readFinal("25-orc-wizard1-fighter5-rogue1").classLevels).toEqual({
      WIZARD_2024: 1,
      FIGHTER_2024: 5,
      ROGUE_2024: 1,
    });
  });

  it("М7 · воїн отримує підвищення характеристик на 6-му рівні класу, пройдисвіт — на 10-му", () => {
    const fighterRogue = readBuilt("14-human-fighter6-rogue4");
    const offeredAt = fighterRogue.offers
      .filter((offer) => offer.isAbilityScoreLevel)
      .map((offer) => offer.classLevel);

    expect(offeredAt).toEqual(findMulticlassFixture("14-human-fighter6-rogue4").expected.asiClassLevelsOffered?.FIGHTER_2024);
  });

  it("М8 · повторювана риса береться двічі й обидва рази щось дає", () => {
    const withRepeat = multiclass2024Fixtures.filter((fixture) => fixture.expected.repeatedFeat);
    const actual = Object.fromEntries(
      withRepeat.map((fixture) => {
        const snapshot = readFinal(fixture.id);
        const repeated = fixture.expected.repeatedFeat!;
        return [
          fixture.id,
          {
            times: snapshot.featNames.filter((name) => name === repeated.name).length,
            grantedProficiencies: snapshot.featChoiceLabels.filter((label) => label.startsWith(`${toTitle(repeated.name)} `)).length,
          },
        ];
      }),
    );
    const expected = Object.fromEntries(
      withRepeat.map((fixture) => [
        fixture.id,
        { times: fixture.expected.repeatedFeat!.times, grantedProficiencies: fixture.expected.repeatedFeat!.grantedProficiencies },
      ]),
    );

    expect(actual).toEqual(expected);
  });

  it("М9 · «Посвячений у магію» двічі законний лише з іншим списком заклинань", () => {
    const { actual, expected } = compareWhereExpected(
      (fixture) => fixture.expected.magicInitiateLists,
      (snapshot) => snapshot.magicInitiateLists,
    );

    expect(actual).toEqual(expected);
  });

  it("М10 · Універсальність Людини дає другу рису походження понад ту, що дало походження", () => {
    const humans = multiclass2024Fixtures.filter((fixture) => fixture.input.species === "HUMAN_2024");
    const wrong = humans.flatMap((fixture) => {
      const snapshot = readFinal(fixture.id);
      const chosen = fixture.input.speciesChoices.find((pick) => pick.choice === "Риса походження");
      const recorded = snapshot.speciesChoiceLabels.includes(`Риса походження:${chosen?.option}`);
      return recorded ? [] : [`${fixture.id}: ${snapshot.speciesChoiceLabels.join(" / ") || "жодного вибору виду"}`];
    });

    expect(wrong).toEqual([]);
    expect(humans.map((fixture) => fixture.id)).toHaveLength(3);
  });

  it("М11 · половина рівнів паладина й слідопита округлюється вгору", () => {
    const halfCasters = ["12-drow-paladin5-sorcerer3", "15-wood-elf-ranger5-druid3"];
    const actual = Object.fromEntries(halfCasters.map((id) => [id, readFinal(id).casterLevel]));
    const expected = Object.fromEntries(
      halfCasters.map((id) => [id, findMulticlassFixture(id).expected.casterLevel]),
    );

    expect(actual).toEqual(expected);
  });

  it("М12 · третина рівнів воїна й пройдисвіта з підкласом-заклиначем округлюється вниз", () => {
    const thirdCasters = ["17-dwarf-fighter3-wizard5", "18-halfling-rogue4-bard4"];
    const actual = Object.fromEntries(thirdCasters.map((id) => [id, readFinal(id).casterLevel]));
    const expected = Object.fromEntries(
      thirdCasters.map((id) => [id, findMulticlassFixture(id).expected.casterLevel]),
    );

    expect(actual).toEqual(expected);
  });

  it("М13 · Pact Magic — окремий пул, який не зливається зі звичайними слотами", () => {
    const warlocks = ["16-infernal-tiefling-warlock5-bard3", "19-forest-gnome-sorcerer9-warlock4", "24-aasimar-sorcerer19-warlock1"];
    const actual = Object.fromEntries(
      warlocks.map((id) => {
        const snapshot = readFinal(id);
        return [id, { pactLevel: snapshot.pactLevel, pactSlots: snapshot.pactSlots, casterLevel: snapshot.casterLevel }];
      }),
    );
    const expected = Object.fromEntries(
      warlocks.map((id) => {
        const { expected: want } = findMulticlassFixture(id);
        return [id, { pactLevel: want.pactLevel, pactSlots: want.pactSlots, casterLevel: want.casterLevel }];
      }),
    );

    expect(actual).toEqual(expected);
  });

  it("М14 · слоти можуть бути вищого рівня, ніж будь-яке доступне заклинання", () => {
    const gapCharacters = ["18-halfling-rogue4-bard4", "21-human-wizard4-cleric4"];
    const actual = Object.fromEntries(
      gapCharacters.map((id) => {
        const snapshot = readFinal(id);
        return [id, { maxSpellSlotLevel: snapshot.maxSpellSlotLevel, maxPreparable: snapshot.maxPreparableSpellLevelByClass }];
      }),
    );
    const expected = Object.fromEntries(
      gapCharacters.map((id) => {
        const { expected: want } = findMulticlassFixture(id);
        return [id, { maxSpellSlotLevel: want.maxSpellSlotLevel, maxPreparable: want.maxPreparableSpellLevelByClass ?? null }];
      }),
    );

    expect(actual).toEqual(expected);
  });

  it("М15 · підготовлені заклинання рахуються окремо за кожним класом", () => {
    const withLines = multiclass2024Fixtures.filter((fixture) => fixture.expected.preparedSpellLineClasses);
    const actual = Object.fromEntries(
      withLines.map((fixture) => {
        const keys = readFinal(fixture.id).preparedSpellLineKeys;
        return [
          fixture.id,
          (fixture.expected.preparedSpellLineClasses ?? []).filter((className) =>
            keys.some((key) => key.includes(className)),
          ),
        ];
      }),
    );
    const expected = Object.fromEntries(
      withLines.map((fixture) => [fixture.id, fixture.expected.preparedSpellLineClasses ?? []]),
    );

    expect(actual).toEqual(expected);
  });

  it("М16 · те саме заклинання з двох джерел — один запис, і друге джерело не падає (Р38)", async () => {
    const persId = readPersId("21-human-wizard4-cleric4");
    await signInAsOwnerOf(persId);

    expect(await addSameSpellFromTwoSources(persId)).toEqual({ rows: 1, secondSourceAccepted: true });
  });

  it("М17 · характеристика заклинань береться з джерела, а не одна на персонажа", () => {
    const withSources = multiclass2024Fixtures.filter((fixture) => fixture.expected.classSpellSources);
    const actual = Object.fromEntries(
      withSources.map((fixture) => [
        fixture.id,
        readFinal(fixture.id)
          .spellSources.filter((source) => source.kind === "CLASS")
          .map((source) => ({ source: source.key, ability: source.ability }))
          .sort(bySourceName),
      ]),
    );
    const expected = Object.fromEntries(
      withSources.map((fixture) => [fixture.id, [...(fixture.expected.classSpellSources ?? [])].sort(bySourceName)]),
    );

    expect(actual).toEqual(expected);
  });

  it("М18 · книга заклинань чарівника — окремий шар над підготовленим набором", () => {
    const withSpellbook = multiclass2024Fixtures.filter((fixture) => fixture.expected.spellbookClass);
    const actual = Object.fromEntries(
      withSpellbook.map((fixture) => {
        const notes = readFinal(fixture.id).spellbookNoteKeys;
        return [fixture.id, notes.some((key) => key.includes(fixture.expected.spellbookClass as string))];
      }),
    );
    const expected = Object.fromEntries(withSpellbook.map((fixture) => [fixture.id, true]));

    expect(actual).toEqual(expected);
  });

  it("М19 · Додаткова атака з двох класів дає дві атаки, не три", () => {
    const barbarianFighter = readFinal("20-orc-barbarian5-fighter5");

    expect(barbarianFighter.featureNames).toEqual(
      expect.arrayContaining(findMulticlassFixture("20-orc-barbarian5-fighter5").expected.requiredFeatures ?? []),
    );
    expect(barbarianFighter.attacksPerAction).toBe(2);
  });

  it("М20 · дві альтернативні формули базового КЗ не складаються", () => {
    const monkSorcerer = readFinal("23-dwarf-monk4-sorcerer4");

    expect(monkSorcerer.featureNames).toEqual(
      expect.arrayContaining(findMulticlassFixture("23-dwarf-monk4-sorcerer4").expected.requiredFeatures ?? []),
    );
    expect(monkSorcerer.baseArmorClassFormulas).toEqual(
      findMulticlassFixture("23-dwarf-monk4-sorcerer4").expected.baseArmorClassFormulas,
    );
  });

  it("М21 · заклинання й риси виду відкриваються за рівнем персонажа", () => {
    const wrong = everyBuilt().flatMap((character) =>
      (character.fixture.expected.characterLevelGatedGrants ?? []).flatMap((grant) => {
        const namesAt = (snapshot: Multiclass2024Snapshot | null) =>
          grant.kind === "feature" ? snapshot?.featureNames : snapshot?.spellNames;
        const tooEarly = namesAt(character.atLevel1)?.includes(grant.name)
          ? [`${character.fixture.id}: ${grant.name} видано вже на 1-му, а має з ${grant.characterLevel}-го`]
          : [];
        const missing = namesAt(character.atFinalLevel)?.includes(grant.name)
          ? []
          : [`${character.fixture.id}: ${grant.name} відсутнє на фінальному рівні`];
        return [...tooEarly, ...missing];
      }),
    );

    expect(wrong).toEqual([]);
  });

  // Стеля 30 належить самому епічному дару, тому критерій міряє всі пʼятнадцять наборів
  // характеристик, а не самий №24: чотирнадцять інших мають лишитися на 20, і №19 — той, хто
  // ловить протилежне (половинна риса після 20 кладе бонус в іншу характеристику).
  it("М22 · епічний дар на 19-му рівні класу підіймає характеристику вище 20", () => {
    const { actual, expected } = compareWhereExpected(
      (fixture) => fixture.expected.finalAbilityScores,
      (snapshot) => snapshot.abilityScores,
    );

    expect(actual).toEqual(expected);
  });

  it("М23 · клас, узятий на 1-й рівень, підкласу не має — навіть у персонажа 20-го рівня", () => {
    const { actual, expected } = compareWhereExpected(
      (fixture) => fixture.expected.subclassByClass,
      (snapshot) => snapshot.subclassByClass,
    );

    expect(actual).toEqual(expected);
  });

  // Порядок комірок майстерності — це порядок каталогу зброї, а не порядок, у якому гравець
  // тицяв: `findPersWeaponMasteryOffer` сортує пул за `sortOrder`. Критерій про склад набору.
  it("М24 · майстерність зброї з двох бойових класів не губиться", () => {
    const withMastery = multiclass2024Fixtures.filter((fixture) => fixture.expected.weaponMastery);
    const actual = Object.fromEntries(
      withMastery.map((fixture) => {
        const mastery = readFinal(fixture.id).weaponMastery;
        return [fixture.id, { capacity: mastery.capacity, weapons: [...mastery.weapons].sort() }];
      }),
    );
    const expected = Object.fromEntries(
      withMastery.map((fixture) => [
        fixture.id,
        {
          capacity: fixture.expected.weaponMastery!.capacity,
          weapons: (fixture.expected.weaponMastery!.weapons ?? []).map(toWeaponCode).sort(),
        },
      ]),
    );

    expect(actual).toEqual(expected);
  });

  it("М25 · поріг бастіону читається за рівнем персонажа: 2 / 4 / 5 / 6", () => {
    const { actual, expected } = compareWhereExpected(
      (fixture) => fixture.expected.bastionFacilityLimit,
      (snapshot) => snapshot.bastionFacilityLimit,
    );

    expect(actual).toEqual(expected);
  });

  it("М26 · відповідність приміщення читається зі здатностей персонажа, а не з назви класу", async () => {
    const withMatches = multiclass2024Fixtures.filter((fixture) => fixture.expected.bastionFacilityMatches);
    const actual: Record<string, Record<string, string>> = {};
    for (const fixture of withMatches) {
      actual[fixture.id] = await readFacilityStatuses(
        readPersId(fixture.id),
        Object.keys(fixture.expected.bastionFacilityMatches!),
      );
    }
    const expected = Object.fromEntries(
      withMatches.map((fixture) => [fixture.id, fixture.expected.bastionFacilityMatches!]),
    );

    expect(actual).toEqual(expected);
  });
});

const bySourceName = (left: { source: string }, right: { source: string }) =>
  left.source.localeCompare(right.source);

/** `SKILL_EXPERT` → `Skill Expert`: `optionNameEng` риси в базі записаний саме так. */
const toTitle = (featName: string) =>
  featName
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
