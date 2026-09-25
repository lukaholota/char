/**
 * O43 / KR43.5 — розширений список легасі-покровителя для чорнокнижника 2024 (Р52: у межах ліміту)
 * і рід джина, обраний тим самим підвищенням, що й заклинання.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races, Subclasses } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { classTranslations } from "@/lib/refs/translation";
import { findCreatorContent, type CreatorContent } from "@/server/db/creator-content-query";
import type { ClassSpellOffer } from "@/rules/class-spell-choices-2024";
import { minimalForm } from "../helpers/build-form";
import { withCreationSpells, withLevelUpSpells } from "../helpers/creation-spells";
import { minimalLevelUpForm } from "../helpers/levelup-form";
import { backgroundByName, classByName, raceByName, subclassByName, subclassChoiceOptionIdsAtLevel } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
vi.mock("@/lib/content/creator-content", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/content/creator-content")>()),
  findCharacterCreatorOptions: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { findCharacterCreatorOptions } from "@/lib/content/creator-content";
import { getLevelUpSpellOffer, levelUpCharacter } from "@/lib/actions/levelup";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 180_000 });

const INVOCATION_GROUP = "Потойбічні виклики";
const GENIE_KIND_GROUP = "Рід джина";
const WARLOCK_LIST = classTranslations.WARLOCK_2024;

type Fixtures2024 = {
  warlockClassId: number;
  offers: Record<"genieDao" | "hexblade" | "fathomless" | "fiend", ClassSpellOffer | null>;
  rejectedThunderwave: unknown;
  acceptedSanctuary: unknown;
  sanctuaryRow: { badgeText: string | null; excludeFromPreparedCount: boolean; isPrepared: boolean } | null;
};

let fixtures: Fixtures2024;
let multiclassThunderwave2014: unknown;

beforeAll(async () => {
  await resetUserData();
  await useCreatorContentFromDatabase();
  await signIn("legacy-patron-spells");
  fixtures = await buildWarlock2024Fixtures();
  multiclassThunderwave2014 = await tryMulticlassGenieWithOtherKindSpell2014();
});
afterAll(disconnectDatabase);

describe("O43 — розширений список легасі-покровителя на 3-му рівні чорнокнижника 2024", () => {
  it("Джин, рід Дао того ж підвищення: спільні й свої заклинання є, чужого роду — немає", () => {
    const offer = fixtures.offers.genieDao;
    const names = offer?.spells.map((spell) => spell.engName) ?? [];

    expect(names).toEqual(expect.arrayContaining(["Sanctuary", "Spike Growth", "Phantasmal Force", "Detect Evil and Good"]));
    expect(names.filter((name) => ["Thunderwave", "Gust of Wind", "Burning Hands"].includes(name))).toEqual([]);
    expect(offer?.spells.some((spell) => spell.spellLists?.includes(WARLOCK_LIST))).toBe(true);
    expect(offer?.spellListNote).toBe("зі свого списку й розширеного списку покровителя «Джин»");
  });

  it("заклинання чужого роду сервер не приймає, свого — приймає", () => {
    expect(fixtures.rejectedThunderwave).toEqual({ error: "Обране заклинання не з вашого списку класу або зависокого рівня" });
    expect(fixtures.acceptedSanctuary).not.toHaveProperty("error");
  });

  it("заклинання розширеного списку підготовлене класом і рахується в ліміт (Р52)", () => {
    expect(fixtures.sanctuaryRow).toEqual({ badgeText: WARLOCK_LIST, excludeFromPreparedCount: false, isPrepared: true });
  });

  it("Відьмацький клинок бере Shining Smite 2024, і жодне заклинання не з 2014", () => {
    const offer = fixtures.offers.hexblade;

    expect(offer?.spells.map((spell) => spell.engName)).toEqual(expect.arrayContaining(["Shield", "Wrathful Smite", "Blur", "Shining Smite"]));
    expect(offer?.spells.every((spell) => spell.ruleset === "RULES_2024")).toBe(true);
  });

  it("Безодня додає свої заклинання 1-го й 2-го рівня", () => {
    expect(fixtures.offers.fathomless?.spells.map((spell) => spell.engName)).toEqual(
      expect.arrayContaining(["Create or Destroy Water", "Thunderwave", "Gust of Wind", "Silence"]),
    );
  });

  it("покровитель PHB 2024 списку легасі не отримує", () => {
    const offer = fixtures.offers.fiend;

    expect(offer?.spellListNote).toBeNull();
    expect(offer?.spells.every((spell) => spell.spellLists?.includes(WARLOCK_LIST))).toBe(true);
  });
});

describe("рід джина 2014, обраний тим самим підвищенням (мультиклас)", () => {
  it("заклинання чужого роду сервер не приймає", () => {
    expect(multiclassThunderwave2014).toEqual({ error: "Обране заклинання не з вашого списку класу або зависокого рівня" });
  });
});

async function useCreatorContentFromDatabase(): Promise<void> {
  const original = await vi.importActual<typeof import("@/lib/content/creator-content")>("@/lib/content/creator-content");
  const content2024: CreatorContent = await findCreatorContent(prisma, "RULES_2024");
  vi.mocked(findCharacterCreatorOptions).mockImplementation((ruleset) =>
    ruleset === "RULES_2024" ? content2024 : original.findCharacterCreatorOptions(ruleset),
  );
}

async function signIn(handle: string): Promise<void> {
  const user = await prisma.user.create({ data: { email: `${handle}-${Math.random()}@holota.family`, name: handle } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
}

async function buildWarlock2024Fixtures(): Promise<Fixtures2024> {
  const warlock = await classByName(Classes.WARLOCK_2024);
  const persId = await createWarlockAtLevelTwo2024(warlock.classId);
  const [genie, hexblade, fathomless, fiend] = await Promise.all(
    [Subclasses.THE_GENIE, Subclasses.HEXBLADE, Subclasses.FATHOMLESS, Subclasses.FIEND_PATRON].map((name) => subclassByName(warlock.classId, name)),
  );
  const [dao] = await subclassChoiceOptionIdsAtLevel(genie.subclassId, 3, (option) => option.optionNameEng === "Genie Kind: Dao");
  const offerFor = (subclassId: number, subclassOptionIds: number[] = []) => getLevelUpSpellOffer(persId, warlock.classId, subclassId, [], subclassOptionIds);

  const offers = {
    genieDao: await offerFor(genie.subclassId, [dao]),
    hexblade: await offerFor(hexblade.subclassId),
    fathomless: await offerFor(fathomless.subclassId),
    fiend: await offerFor(fiend.subclassId),
  };

  const [thunderwave, sanctuary] = await findSpellIds2024(["Thunderwave", "Sanctuary"]);
  const levelThree = (preparedId: number) =>
    minimalLevelUpForm({
      classId: warlock.classId,
      subclassId: genie.subclassId,
      subclassChoiceSelections: { [GENIE_KIND_GROUP]: dao },
      classSpells: { cantripIds: [], spellbookIds: [], preparedIds: [preparedId] },
    });
  const rejectedThunderwave = await levelUpCharacter(persId, levelThree(thunderwave));
  const acceptedSanctuary = await levelUpCharacter(persId, levelThree(sanctuary));
  const sanctuaryRow = await prisma.persSpell.findFirst({
    where: { persId, spellId: sanctuary },
    select: { badgeText: true, excludeFromPreparedCount: true, isPrepared: true },
  });

  return { warlockClassId: warlock.classId, offers, rejectedThunderwave, acceptedSanctuary, sanctuaryRow };
}

async function createWarlockAtLevelTwo2024(warlockClassId: number): Promise<number> {
  const [race, background, invocations] = await Promise.all([
    raceByName(Races.HUMAN_2024),
    backgroundByName(BackgroundCategory.SAGE_2024),
    findInvocationIds2024(warlockClassId, ["Eldritch Mind (2024)", "Armor of Shadows (2024)", "Devil's Sight (2024)"]),
  ]);
  const form = minimalForm({
    name: "Легасі-покровитель",
    raceId: race.raceId,
    classId: warlockClassId,
    backgroundId: background.backgroundId,
    ruleset: "RULES_2024",
    backgroundAsiChoice: { mode: "+2/+1", plusTwo: "CON", plusOne: "INT" },
    languagesSchema: { languages: ["DWARVISH", "GIANT"] },
    classChoiceSelections: { [INVOCATION_GROUP]: invocations[0] },
  });
  const created = await createCharacter(await withCreationSpells(form));
  if (!created.persId) throw new Error(`не створився: ${created.error}`);

  const levelTwo = await withLevelUpSpells(
    created.persId,
    minimalLevelUpForm({ classId: warlockClassId, classChoiceSelections: { [INVOCATION_GROUP]: invocations.slice(1) } }),
  );
  const result = await levelUpCharacter(created.persId, levelTwo);
  if ("error" in result) throw new Error(`2-й рівень: ${result.error}`);
  return created.persId;
}

async function tryMulticlassGenieWithOtherKindSpell2014(): Promise<unknown> {
  const [race, fighter, warlock, background] = await Promise.all([
    raceByName(Races.HUMAN_2014),
    classByName(Classes.FIGHTER_2014),
    classByName(Classes.WARLOCK_2014),
    backgroundByName(BackgroundCategory.SOLDIER),
  ]);
  const created = await createCharacter(minimalForm({ raceId: race.raceId, classId: fighter.classId, backgroundId: background.backgroundId }));
  if ("error" in created) throw new Error(`не створився: ${created.error}`);

  const genie = await subclassByName(warlock.classId, Subclasses.THE_GENIE);
  const [dao] = await subclassChoiceOptionIdsAtLevel(genie.subclassId, 1, (option) => option.optionNameEng === "Genie Kind: Dao");
  const offer = await getLevelUpSpellOffer(created.persId, warlock.classId, genie.subclassId, [], [dao]);
  const [thunderwave] = await prisma.spell.findMany({ where: { ruleset: "RULES_2014", engName: "Thunderwave" }, select: { spellId: true } });
  const ownKindSpell = offer?.spells.find((spell) => spell.engName !== "Thunderwave");
  if (!offer || !ownKindSpell) throw new Error("мультиклас у джина 2014 не отримав пропозиції заклинань");

  return levelUpCharacter(
    created.persId,
    minimalLevelUpForm({
      classId: warlock.classId,
      levelUpPath: "MULTICLASS",
      subclassId: genie.subclassId,
      subclassChoiceSelections: { [GENIE_KIND_GROUP]: dao },
      classSpells: {
        cantripIds: offer.cantrips.slice(0, offer.quota.cantrips).map((spell) => spell.spellId),
        spellbookIds: [],
        preparedIds: [thunderwave.spellId, ownKindSpell.spellId],
      },
    }),
  );
}

async function findInvocationIds2024(classId: number, optionNamesEng: string[]): Promise<number[]> {
  const rows = await prisma.classChoiceOption.findMany({
    where: { classId, choiceOption: { optionNameEng: { in: optionNamesEng } } },
    select: { choiceOptionId: true, choiceOption: { select: { optionNameEng: true } } },
  });
  return optionNamesEng.map((name) => rows.find((row) => row.choiceOption.optionNameEng === name)!.choiceOptionId);
}

async function findSpellIds2024(engNames: string[]): Promise<number[]> {
  const spells = await prisma.spell.findMany({ where: { ruleset: "RULES_2024", engName: { in: engNames } }, select: { spellId: true, engName: true } });
  return engNames.map((engName) => spells.find((spell) => spell.engName === engName)!.spellId);
}
