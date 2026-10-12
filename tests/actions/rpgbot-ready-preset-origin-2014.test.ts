import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import { buildCharacterCreationOptions } from "@/lib/content/creator-content";
import { findCreatorContent } from "@/server/db/creator-content-query";
import { buildRecipeSchema } from "@/lib/optimization/schema";
import { buildReadyPresetDraft, readyPresetSchema } from "@/lib/optimization/ready-preset";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { auth } from "@/lib/auth";

type Content = ReturnType<typeof buildCharacterCreationOptions>;
let content: Content;

beforeAll(async () => {
  content = buildCharacterCreationOptions(await findCreatorContent(prisma, "RULES_2014"));
});
beforeEach(async () => {
  await resetUserData();
  const owner = await prisma.user.create({ data: { email: "rpgbot-origin@actions.test" } });
  vi.mocked(auth).mockResolvedValue({ user: { email: owner.email } } as never);
});
afterAll(disconnectDatabase);

const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));

function buildPresetDraft(slug: string, changePreset: Partial<ReturnType<typeof readyPresetSchema.parse>> = {}): PersFormData {
  const preset = { ...readyPresetSchema.parse(readJson(`data/rpgbot/ready-builds/${slug}.json`)), ...changePreset };
  const recipe = buildRecipeSchema.parse(readJson(`data/rpgbot/builds/${preset.buildId}.json`));
  return { ...buildReadyPresetDraft(recipe, preset, content), name: `Перевірка ${slug}` };
}

async function loadAbilityScores(persId: number) {
  const pers = await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { str: true, dex: true, con: true, int: true, wis: true, cha: true, maxHp: true } });
  return pers;
}

async function expectNothingCreated() {
  expect(await prisma.pers.count()).toBe(0);
  expect(await prisma.persSpell.count()).toBe(0);
  expect(await prisma.persFeat.count()).toBe(0);
}

describe("Tasha custom origin in ready presets, written by the real createCharacter", () => {
  it("creates the Hobgoblin Mastermind with +2 Dexterity and +1 Charisma and no fixed racial bonus", async () => {
    const draft = buildPresetDraft("rogue-mastermind-2014");
    expect(draft.isDefaultASI).toBe(false);
    const created = await createCharacter(draft);
    if (!("persId" in created)) throw new Error("error" in created ? created.error : "not created");
    expect(await loadAbilityScores(created.persId)).toEqual({ str: 8, dex: 17, con: 14, int: 8, wis: 12, cha: 15, maxHp: 10 });
    const stored = await prisma.pers.findUniqueOrThrow({ where: { persId: created.persId }, select: { race: { select: { name: true } }, subclass: true } });
    expect(stored.race.name).toBe("HOBGOBLIN_MPMM");
  });

  it("applies Tasha rules to a classic race: the chosen +2 and +1 replace the fixed ones", async () => {
    const draft = buildPresetDraft("rogue-phantom-2014", { racialAbilityRules: "tasha", racialAbilities: ["CON", "WIS"] });
    const created = await createCharacter(draft);
    if (!("persId" in created)) throw new Error("error" in created ? created.error : "not created");
    expect(await loadAbilityScores(created.persId)).toMatchObject({ str: 8, dex: 15, con: 17, int: 10, wis: 14, cha: 10 });
  });

  it.fails("rejects incomplete Tasha choices and writes nothing (BUG-O49-RACIAL-CHOICES-UNVALIDATED)", async () => {
    const draft = buildPresetDraft("rogue-mastermind-2014");
    const incomplete = structuredClone(draft);
    incomplete.racialBonusChoiceSchema!.tashaChoices[0].selectedAbilities = ["DEX"];
    expect(await createCharacter(incomplete)).toMatchObject({ error: expect.any(String) });
    await expectNothingCreated();
  });

  it.fails("rejects Tasha choices for a group the race does not have (BUG-O49-RACIAL-CHOICES-UNVALIDATED)", async () => {
    const draft = buildPresetDraft("rogue-mastermind-2014");
    const invented = structuredClone(draft);
    invented.racialBonusChoiceSchema!.tashaChoices.push({ groupIndex: 7, choiceCount: 6, selectedAbilities: ["STR", "DEX", "CON", "INT", "WIS", "CHA"] });
    expect(await createCharacter(invented)).toMatchObject({ error: expect.any(String) });
    await expectNothingCreated();
  });

  it("ignores Tasha choices when the draft says classic mode, as the creation rule does", async () => {
    const draft = buildPresetDraft("rogue-mastermind-2014");
    const mismatched: PersFormData = { ...draft, isDefaultASI: true, racialBonusChoiceSchema: { basicChoices: [], tashaChoices: draft.racialBonusChoiceSchema!.tashaChoices } };
    const created = await createCharacter(mismatched);
    expect(created).toMatchObject({ persId: expect.any(Number) });
    if (!("persId" in created)) throw new Error("not created");
    expect(await loadAbilityScores(created.persId)).toMatchObject({ dex: 15, cha: 14 });
  });
});
