import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Feats, Races, Variants } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildCharacterCreationOptions } from "@/lib/content/creator-content";
import { findCreatorContent } from "@/server/db/creator-content-query";
import { buildReadyPresetDraft } from "@/lib/optimization/ready-preset";
import { buildFeatPresetFixture } from "@/lib/optimization/ready-preset-feat-fixture.test-helper";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { minimalForm } from "../helpers/build-form";
import { withCreationSpells } from "../helpers/creation-spells";
import { backgroundByName, classByName, raceByName, raceVariantByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";

vi.setConfig({ testTimeout: 120_000 });

let spellIdByName: Map<string, number>;

beforeAll(async () => {
  const rows = await prisma.spell.findMany({ where: { ruleset: "RULES_2014" }, select: { spellId: true, engName: true } });
  spellIdByName = new Map(rows.map((row) => [row.engName, row.spellId]));
});
beforeEach(async () => {
  await resetUserData();
  const owner = await prisma.user.create({ data: { email: "feat-spells-2014@actions.test" } });
  vi.mocked(auth).mockResolvedValue({ user: { email: owner.email } } as never);
});
afterAll(disconnectDatabase);

const spellId = (engName: string) => {
  const id = spellIdByName.get(engName);
  if (!id) throw new Error(`Unknown spell ${engName}`);
  return id;
};
const spellIds = (...engNames: string[]) => engNames.map(spellId);

async function findFeat2014(name: Feats) {
  return prisma.feat.findFirstOrThrow({ where: { name, ruleset: "RULES_2014" }, include: { featChoiceOptions: { include: { choiceOption: true } } } });
}

async function buildHumanVariantForm(className: Classes, featName: Feats, abilityOption?: string, overrides: Partial<PersFormData> = {}): Promise<PersFormData> {
  const [race, variant, characterClass, background, feat] = await Promise.all([
    raceByName(Races.HUMAN_2014), raceVariantByName(Variants.HUMAN_VARIANT), classByName(className), backgroundByName(BackgroundCategory.ACOLYTE), findFeat2014(featName),
  ]);
  const abilityChoice = abilityOption ? feat.featChoiceOptions.find((entry) => entry.choiceOption.optionNameEng === abilityOption) : undefined;
  return minimalForm({
    raceId: race.raceId, raceVariantId: variant.raceVariantId, classId: characterClass.classId, backgroundId: background.backgroundId, featId: feat.featId,
    racialBonusChoiceSchema: { basicChoices: [{ groupIndex: 0, choiceCount: 2, selectedAbilities: ["DEX", "WIS"] }], tashaChoices: [] },
    featChoiceSelections: abilityChoice ? { [abilityChoice.choiceOption.groupName]: abilityChoice.choiceOptionId } : {},
    ...overrides,
  });
}

async function listFeatRows(persId: number) {
  const rows = await prisma.persSpell.findMany({ where: { persId, origin: "FEAT" }, select: { sourceName: true, isPrepared: true, excludeFromPreparedCount: true, excludeFromKnownCount: true, learnedAtLevel: true, spell: { select: { engName: true } } } });
  return rows.map((row) => `${row.spell.engName}|${row.sourceName}|${row.isPrepared}|${row.excludeFromPreparedCount}|${row.excludeFromKnownCount}|${row.learnedAtLevel}`).sort();
}

async function createOrThrow(form: PersFormData) {
  const created = await createCharacter(form);
  if (!("persId" in created) || created.persId === undefined) throw new Error(`not created: ${"error" in created ? created.error : ""}`);
  return created.persId;
}

async function expectNothingCreated() {
  expect(await prisma.pers.count()).toBe(0);
  expect(await prisma.persSpell.count()).toBe(0);
  expect(await prisma.persFeat.count()).toBe(0);
}

const featRow = (engName: string, featName: string) => `${engName}|${featName}|true|true|true|1`;

describe("2014 creation without a feat spell selection (unchanged behaviour)", () => {
  it("keeps Magic Initiate on the sheet as a feat and writes no feat spells", async () => {
    const persId = await createOrThrow(await buildHumanVariantForm(Classes.FIGHTER_2014, Feats.MAGIC_INITIATE));
    expect(await prisma.persFeat.count({ where: { persId } })).toBe(1);
    expect(await listFeatRows(persId)).toEqual([]);
  });

  it("does not give Misty Step to Fey Touched when the draft names no feat spells", async () => {
    const persId = await createOrThrow(await buildHumanVariantForm(Classes.FIGHTER_2014, Feats.FEY_TOUCHED, "FEY_TOUCHED Ability (Wisdom)"));
    expect(await prisma.persFeat.count({ where: { persId } })).toBe(1);
    expect(await listFeatRows(persId)).toEqual([]);
  });
});

describe("2014 creation with feat spells chosen by the player", () => {
  it("writes Magic Initiate: two cantrips and one 1st-level spell from one class list", async () => {
    const form = await buildHumanVariantForm(Classes.FIGHTER_2014, Feats.MAGIC_INITIATE, undefined, { featSpellSelections: { CLASS_ASI: spellIds("Guidance", "Light", "Bless") } });
    const persId = await createOrThrow(form);
    expect(await listFeatRows(persId)).toEqual([featRow("Bless", "MAGIC_INITIATE"), featRow("Guidance", "MAGIC_INITIATE"), featRow("Light", "MAGIC_INITIATE")]);
  });

  it.each([
    ["spells from two class lists", ["Guidance", "Mage Hand", "Bless"]],
    ["a cantrip instead of the 1st-level spell", ["Guidance", "Light", "Thaumaturgy"]],
    ["too few spells", ["Guidance", "Bless"]],
    ["a 2nd-level spell", ["Guidance", "Light", "Spiritual Weapon"]],
    ["the same spell twice", ["Guidance", "Guidance", "Bless"]],
  ])("rejects Magic Initiate with %s and writes nothing", async (_label, names) => {
    const form = await buildHumanVariantForm(Classes.FIGHTER_2014, Feats.MAGIC_INITIATE, undefined, { featSpellSelections: { CLASS_ASI: spellIds(...names) } });
    expect(await createCharacter(form)).toMatchObject({ error: expect.any(String) });
    await expectNothingCreated();
  });

  it("writes Fey Touched: Misty Step and a 1st-level Divination or Enchantment spell", async () => {
    const form = await buildHumanVariantForm(Classes.FIGHTER_2014, Feats.FEY_TOUCHED, "FEY_TOUCHED Ability (Wisdom)", { featSpellSelections: { CLASS_ASI: spellIds("Charm Person") } });
    const persId = await createOrThrow(form);
    expect(await listFeatRows(persId)).toEqual([featRow("Charm Person", "FEY_TOUCHED"), featRow("Misty Step", "FEY_TOUCHED")]);
  });

  it("rejects a Fey Touched spell from another school", async () => {
    const form = await buildHumanVariantForm(Classes.FIGHTER_2014, Feats.FEY_TOUCHED, "FEY_TOUCHED Ability (Wisdom)", { featSpellSelections: { CLASS_ASI: spellIds("False Life") } });
    expect(await createCharacter(form)).toMatchObject({ error: expect.stringContaining("не підходить") });
    await expectNothingCreated();
  });

  it("writes Shadow Touched: Invisibility and a 1st-level Illusion or Necromancy spell", async () => {
    const form = await buildHumanVariantForm(Classes.FIGHTER_2014, Feats.SHADOW_TOUCHED, "SHADOW_TOUCHED Ability (Charisma)", { featSpellSelections: { CLASS_ASI: spellIds("False Life") } });
    const persId = await createOrThrow(form);
    expect(await listFeatRows(persId)).toEqual([featRow("False Life", "SHADOW_TOUCHED"), featRow("Invisibility", "SHADOW_TOUCHED")]);
  });

  it("writes only the named spell for Telekinetic and Telepathic", async () => {
    const telekinetic = await createOrThrow(await buildHumanVariantForm(Classes.FIGHTER_2014, Feats.TELEKINETIC, "TELEKINETIC Ability (Intelligence)", { featSpellSelections: { CLASS_ASI: [] } }));
    expect(await listFeatRows(telekinetic)).toEqual([featRow("Mage Hand", "TELEKINETIC")]);
    const telepathic = await createOrThrow(await buildHumanVariantForm(Classes.FIGHTER_2014, Feats.TELEPATHIC, "TELEPATHIC Ability (Wisdom)", { featSpellSelections: { CLASS_ASI: [] } }));
    expect(await listFeatRows(telepathic)).toEqual([featRow("Detect Thoughts", "TELEPATHIC")]);
  });

  it("writes Ritual Caster: two 1st-level ritual spells from one class list", async () => {
    const form = await buildHumanVariantForm(Classes.FIGHTER_2014, Feats.RITUAL_CASTER, undefined, { featSpellSelections: { CLASS_ASI: spellIds("Find Familiar", "Detect Magic") } });
    const persId = await createOrThrow(form);
    expect(await listFeatRows(persId)).toEqual([featRow("Detect Magic", "RITUAL_CASTER"), featRow("Find Familiar", "RITUAL_CASTER")]);
  });

  it("rejects a Ritual Caster spell without the ritual tag", async () => {
    const form = await buildHumanVariantForm(Classes.FIGHTER_2014, Feats.RITUAL_CASTER, undefined, { featSpellSelections: { CLASS_ASI: spellIds("Find Familiar", "Magic Missile") } });
    expect(await createCharacter(form)).toMatchObject({ error: expect.any(String) });
    await expectNothingCreated();
  });

  it("writes Artificer Initiate: a cantrip and a 1st-level spell from the Artificer list", async () => {
    const form = await buildHumanVariantForm(Classes.FIGHTER_2014, Feats.ARTIFICER_INITIATE, undefined, { featSpellSelections: { CLASS_ASI: spellIds("Mending", "Cure Wounds") } });
    const persId = await createOrThrow(form);
    expect(await listFeatRows(persId)).toEqual([featRow("Cure Wounds", "ARTIFICER_INITIATE"), featRow("Mending", "ARTIFICER_INITIATE")]);
  });

  it("rejects feat spells for a feat that gives none, or for a character without a feat", async () => {
    const tough = await buildHumanVariantForm(Classes.FIGHTER_2014, Feats.TOUGH, undefined, { featSpellSelections: { CLASS_ASI: spellIds("Guidance") } });
    expect(await createCharacter(tough)).toMatchObject({ error: expect.stringContaining("не підходить") });
    const noFeat = { ...(await buildHumanVariantForm(Classes.FIGHTER_2014, Feats.TOUGH)), featId: undefined, featSpellSelections: { CLASS_ASI: spellIds("Guidance") } };
    expect(await createCharacter(noFeat)).toMatchObject({ error: expect.any(String) });
    await expectNothingCreated();
  });

  it("does not take a spell the class already gave, and keeps the class cantrip when the feat names the same one", async () => {
    const wizardForm = await withCreationSpells(await buildHumanVariantForm(Classes.WIZARD_2014, Feats.TELEKINETIC, "TELEKINETIC Ability (Intelligence)"), { cantrips: ["Mage Hand", "Light", "Fire Bolt"] });
    const persId = await createOrThrow({ ...wizardForm, featSpellSelections: { CLASS_ASI: [] } });
    expect(await listFeatRows(persId)).toEqual([]);
    expect(await prisma.persSpell.count({ where: { persId, spellId: spellId("Mage Hand") } })).toBe(1);

    const duplicate = await withCreationSpells(await buildHumanVariantForm(Classes.WIZARD_2014, Feats.MAGIC_INITIATE), { cantrips: ["Mage Hand", "Light", "Fire Bolt"] });
    const rejected = await createCharacter({ ...duplicate, featSpellSelections: { CLASS_ASI: spellIds("Mage Hand", "Prestidigitation", "Charm Person") } });
    expect(rejected).toMatchObject({ error: expect.stringContaining("оберіть інше") });
  });
});

describe("ready presets with a 2014 spell feat, created by the real createCharacter", () => {
  async function buildPresetDraft(fixture: Parameters<typeof buildFeatPresetFixture>[0]): Promise<PersFormData> {
    const { recipe, preset } = buildFeatPresetFixture(fixture);
    const content = buildCharacterCreationOptions(await findCreatorContent(prisma, "RULES_2014"));
    return { ...buildReadyPresetDraft(recipe, preset, content), name: "Перевірка риси" };
  }

  it("creates a Magic Initiate preset with exactly the three chosen spells under the feat", async () => {
    const draft = await buildPresetDraft({ featKey: "MAGIC_INITIATE", featOptionName: null, featSpellKeys: ["guidance", "light", "bless"] });
    const persId = await createOrThrow(draft);
    expect(await listFeatRows(persId)).toEqual([featRow("Bless", "MAGIC_INITIATE"), featRow("Guidance", "MAGIC_INITIATE"), featRow("Light", "MAGIC_INITIATE")]);
    expect(await prisma.persFeat.count({ where: { persId } })).toBe(1);
  });

  it("creates a Fey Touched preset with Misty Step and the chosen Enchantment spell", async () => {
    const draft = await buildPresetDraft({ featKey: "FEY_TOUCHED", featOptionName: "FEY_TOUCHED Ability (Wisdom)", featSpellKeys: ["charm-person"] });
    const persId = await createOrThrow(draft);
    expect(await listFeatRows(persId)).toEqual([featRow("Charm Person", "FEY_TOUCHED"), featRow("Misty Step", "FEY_TOUCHED")]);
  });

  it("creates a Telekinetic preset with Mage Hand only", async () => {
    const draft = await buildPresetDraft({ featKey: "TELEKINETIC", featOptionName: "TELEKINETIC Ability (Charisma)", featSpellKeys: [] });
    expect(await listFeatRows(await createOrThrow(draft))).toEqual([featRow("Mage Hand", "TELEKINETIC")]);
  });

  it("rejects a saved preset draft whose feat spells were swapped for a spell outside the feat rule", async () => {
    const draft = await buildPresetDraft({ featKey: "FEY_TOUCHED", featOptionName: "FEY_TOUCHED Ability (Wisdom)", featSpellKeys: ["charm-person"] });
    expect(await createCharacter({ ...draft, featSpellSelections: { CLASS_ASI: spellIds("Fireball") } })).toMatchObject({ error: expect.stringContaining("не підходить") });
    await expectNothingCreated();
  });
});
