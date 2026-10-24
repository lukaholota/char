import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Feats, Races, type FeatChoiceOption } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import { levelUpCharacter } from "@/lib/actions/levelup";
import { findCharacterCreatorOptions } from "@/lib/content/creator-content";
import { FEAT_CREATOR_INCLUDE } from "@/server/db/creator-content-query";
import { flexibleGroupsFromAsi, pickAbilitiesForGroups } from "../helpers/asi-shapes";
import { minimalForm } from "../helpers/build-form";
import { withCreationSpells } from "../helpers/creation-spells";
import { minimalLevelUpForm } from "../helpers/levelup-form";
import { backgroundByName, classByName, firstRaceVariantForRace, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";

vi.setConfig({ testTimeout: 120_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

const METAMAGIC_GROUP = "Метамагія";

async function signIn(handle: string) {
  const user = await prisma.user.create({ data: { email: `${handle}-${Math.random()}@holota.family`, name: handle } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
  return user;
}

async function findMetamagicAdept() {
  return prisma.feat.findFirstOrThrow({ where: { name: Feats.METAMAGIC_ADEPT, ruleset: "RULES_2014" }, select: { featId: true } });
}

async function buildVariantHumanWizardForm(featChoiceSelections: Record<string, number[]>) {
  const [race, wizard, background, feat] = await Promise.all([raceByName(Races.HUMAN_2014), classByName(Classes.WIZARD_2014), backgroundByName(BackgroundCategory.SAGE), findMetamagicAdept()]);
  const variant = await firstRaceVariantForRace(race.raceId);
  const groups = flexibleGroupsFromAsi(variant.overridesRaceASI, "basic");
  return withCreationSpells(minimalForm({
    raceId: race.raceId, raceVariantId: variant.raceVariantId, classId: wizard.classId, backgroundId: background.backgroundId,
    featId: feat.featId, featChoiceSelections,
    racialBonusChoiceSchema: { basicChoices: pickAbilitiesForGroups(groups), tashaChoices: [] },
  }));
}

type CatalogFeat = ReturnType<typeof findCharacterCreatorOptions>["feats"][number];

function findCatalogMetamagicAdept(): CatalogFeat {
  return findCharacterCreatorOptions("RULES_2014").feats.find((entry) => entry.name === Feats.METAMAGIC_ADEPT) as CatalogFeat;
}

/** Вимикає опції риси в базі й у зібраному каталозі, поки йде блок, і повертає ті самі рядки після нього. */
function withoutMetamagicAdeptOptions(): void {
  let removedRows: FeatChoiceOption[] = [];
  let catalogOptions: CatalogFeat["featChoiceOptions"] = [];

  beforeAll(async () => {
    const feat = await findMetamagicAdept();
    removedRows = await prisma.featChoiceOption.findMany({ where: { featId: feat.featId } });
    await prisma.featChoiceOption.deleteMany({ where: { featId: feat.featId } });
    const catalogFeat = findCatalogMetamagicAdept();
    catalogOptions = catalogFeat.featChoiceOptions;
    catalogFeat.featChoiceOptions = [];
  });

  afterAll(async () => {
    if (removedRows.length > 0) await prisma.featChoiceOption.createMany({ data: removedRows });
    findCatalogMetamagicAdept().featChoiceOptions = catalogOptions;
  });
}

/** Сіди не створюють цих рядків — їх додає SQL власника; база, зібрана лише із сідів, їх не має. */
async function insertMissingMetamagicAdeptOptions(featId: number): Promise<number[]> {
  const options = await prisma.choiceOption.findMany({ where: { groupName: METAMAGIC_GROUP, ruleset: "RULES_2014" }, select: { choiceOptionId: true } });
  const inserted = await prisma.featChoiceOption.createManyAndReturn({
    data: options.map((option) => ({ featId, choiceOptionId: option.choiceOptionId, ruleset: "RULES_2014" as const })),
    skipDuplicates: true,
    select: { optionId: true },
  });
  return inserted.map((row) => row.optionId);
}

function readMetamagicAdeptOptions(featId: number) {
  return prisma.featChoiceOption.findMany({ where: { featId, choiceOption: { groupName: METAMAGIC_GROUP } }, include: FEAT_CREATOR_INCLUDE.featChoiceOptions.include });
}

async function createFighterAtLevelThree(userId: number) {
  const [fighter, race, background] = await Promise.all([classByName(Classes.FIGHTER_2014), raceByName(Races.HUMAN_2014), backgroundByName(BackgroundCategory.SOLDIER)]);
  const subclass = await prisma.subclass.findFirstOrThrow({ where: { classId: fighter.classId, name: "CHAMPION" } });
  const pers = await prisma.pers.create({
    data: {
      userId, name: "Воїн", ruleset: "RULES_2014", classId: fighter.classId, subclassId: subclass.subclassId, raceId: race.raceId, backgroundId: background.backgroundId,
      level: 3, currentHp: 28, maxHp: 28, str: 15, dex: 13, con: 14, int: 12, wis: 10, cha: 8, customProficiencies: "Усі обладунки", customLanguagesKnown: "Загальна",
    },
  });
  return { persId: pers.persId, classId: fighter.classId };
}

async function readChosenMetamagicNames(persId: number) {
  const feats = await prisma.persFeat.findMany({ where: { persId }, select: { feat: { select: { name: true } }, choices: { select: { choiceOption: { select: { optionNameEng: true } } } } } });
  const adept = feats.find((entry) => entry.feat.name === Feats.METAMAGIC_ADEPT);
  return adept ? adept.choices.map((choice) => choice.choiceOption.optionNameEng).sort() : null;
}

describe("Адепт метамагії 2014 у каталозі без опцій (стан до SQL власника)", () => {
  withoutMetamagicAdeptOptions();

  it("риса береться без вибору, бо обирати нічого, і нічого не записує", async () => {
    await signIn("metamagic-adept-no-options");
    const created = await createCharacter(await buildVariantHumanWizardForm({}));
    expect(created).not.toHaveProperty("error");
    expect(await readChosenMetamagicNames((created as { persId: number }).persId)).toEqual([]);
  });
});

describe("Адепт метамагії 2014 з десятьма опціями групи «Метамагія» (SQL власника)", () => {
  let optionIdByName: Map<string, number>;
  let catalogNamesBeforeBlock: string[];
  let catalogOptions: CatalogFeat["featChoiceOptions"] = [];
  let insertedOptionIds: number[] = [];

  beforeAll(async () => {
    const feat = await findMetamagicAdept();
    const catalogFeat = findCatalogMetamagicAdept();
    catalogOptions = catalogFeat.featChoiceOptions;
    catalogNamesBeforeBlock = catalogOptions.map((option) => option.choiceOption.optionNameEng).sort();
    insertedOptionIds = await insertMissingMetamagicAdeptOptions(feat.featId);
    const rows = await readMetamagicAdeptOptions(feat.featId);
    optionIdByName = new Map(rows.map(({ choiceOption }) => [choiceOption.optionNameEng, choiceOption.choiceOptionId]));
    catalogFeat.featChoiceOptions = rows;
  });

  afterAll(async () => {
    if (insertedOptionIds.length > 0) await prisma.featChoiceOption.deleteMany({ where: { optionId: { in: insertedOptionIds } } });
    findCatalogMetamagicAdept().featChoiceOptions = catalogOptions;
  });

  it("у базі рівно десять метамагій Чародія, і зібраний каталог має ті самі", async () => {
    expect(optionIdByName.size).toBe(10);
    expect(catalogNamesBeforeBlock).toEqual([...optionIdByName.keys()].sort());
  });

  const pick = (...names: string[]) => ({ [METAMAGIC_GROUP]: names.map((name) => optionIdByName.get(name)!) });

  it("створення: дві різні метамагії записуються як вибір риси", async () => {
    await signIn("metamagic-adept-create");
    const created = await createCharacter(await buildVariantHumanWizardForm(pick("Transmuted Spell", "Twinned Spell")));
    expect(created).not.toHaveProperty("error");
    expect(await readChosenMetamagicNames((created as { persId: number }).persId)).toEqual(["Transmuted Spell", "Twinned Spell"]);
  });

  it("створення: одна, три чи повтор відхилено, персонажа немає", async () => {
    await signIn("metamagic-adept-create-refuse");
    const refusal = "Оберіть дві різні метамагії для риси «Адепт метамагії».";
    expect(await createCharacter(await buildVariantHumanWizardForm(pick("Twinned Spell")))).toMatchObject({ error: refusal });
    expect(await createCharacter(await buildVariantHumanWizardForm(pick("Twinned Spell", "Careful Spell", "Quickened Spell")))).toMatchObject({ error: refusal });
    expect(await createCharacter(await buildVariantHumanWizardForm(pick("Twinned Spell", "Twinned Spell")))).toMatchObject({ error: refusal });
    expect(await createCharacter(await buildVariantHumanWizardForm({}))).toMatchObject({ error: refusal });
    expect(await prisma.pers.count()).toBe(0);
  });

  it("підвищення рівня: риса замість ASI бере рівно дві різні метамагії", async () => {
    const user = await signIn("metamagic-adept-levelup");
    const { persId, classId } = await createFighterAtLevelThree(user.id);
    const feat = await findMetamagicAdept();
    const form = (names: string[]) => minimalLevelUpForm({ classId, featId: feat.featId, featChoiceSelections: pick(...names) });

    expect(await levelUpCharacter(persId, form(["Subtle Spell"]))).toEqual({ error: "Оберіть дві різні метамагії для риси «Адепт метамагії»." });
    expect((await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { level: true } })).level).toBe(3);

    expect(await levelUpCharacter(persId, form(["Subtle Spell", "Heightened Spell"]))).not.toHaveProperty("error");
    expect(await readChosenMetamagicNames(persId)).toEqual(["Heightened Spell", "Subtle Spell"]);
  });
});
