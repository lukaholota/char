import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { createCharacterFromBuild } from "@/lib/actions/character";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { buildReadyPresetDraft, readyPresetSchema } from "@/lib/optimization/ready-preset";
import { buildAssemblyStartState } from "@/lib/optimization/ready-preset-level-context";
import {
  buildAssemblyCreationRequest, buildOpenPickId, findAssemblyChoiceProblem, listOpenPickCandidates, listOpenPickSlots, type AssemblyChoiceContext, type OpenPickChoices,
} from "@/lib/optimization/ready-preset-levels";
import type { AdvancementChoices } from "@/lib/optimization/ready-preset-advancements";
import type { ClassOptionChoices } from "@/lib/optimization/ready-preset-class-options";
import { fillDefaultOpenPicks } from "@/lib/optimization/ready-preset-default-spells";
import { buildReadyPresetLevels } from "@/lib/optimization/ready-preset-levels.server";
import { buildReadyPresetOptions } from "@/lib/optimization/ready-preset-options";
import { buildRecipeSchema } from "@/lib/optimization/schema";
import { disconnectDatabase, resetUserData } from "../user-data";
import { readSheetState } from "../helpers/assembly-manual-path";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
import { auth } from "@/lib/auth";

vi.setConfig({ testTimeout: 120_000 });

const ownerEmail = "preset-levels-owner@actions.test";

beforeEach(async () => {
  await resetUserData();
  await prisma.user.create({ data: { email: ownerEmail } });
  vi.mocked(auth).mockResolvedValue({ user: { email: ownerEmail } } as never);
});
afterAll(disconnectDatabase);

function buildClientRequest(slug: string, targetLevel: number, choices: OpenPickChoices = {}, preparedSpellKeys: string[] | null = null, isPageAccepted = true, advancements: AdvancementChoices = {}, classOptionChoices: ClassOptionChoices = {}) {
  const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
  const content = findCharacterCreationOptions("RULES_2014");
  const preset = readyPresetSchema.parse(read(`data/rpgbot/ready-builds/${slug}.json`));
  const recipe = buildRecipeSchema.parse(read(`data/rpgbot/builds/${preset.buildId}.json`));
  const draft = { ...buildReadyPresetDraft(recipe, preset, content), name: "Мирон", readyPresetRequestId: randomUUID() };
  const options = buildReadyPresetOptions(draft, content);
  const context = { levels: buildReadyPresetLevels(recipe, content)!, targetLevel, choices, advancements, classOptionChoices, preparedSpellKeys, start: buildAssemblyStartState(draft, options) };
  if (isPageAccepted) expect(findAssemblyChoiceProblem(context)).toBeNull();
  return buildAssemblyCreationRequest({ preset, requestId: randomUUID(), start: draft, context });
}

function buildPageContext(slug: string, targetLevel: number, choices: OpenPickChoices = {}): AssemblyChoiceContext {
  const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
  const content = findCharacterCreationOptions("RULES_2014");
  const preset = readyPresetSchema.parse(read(`data/rpgbot/ready-builds/${slug}.json`));
  const recipe = buildRecipeSchema.parse(read(`data/rpgbot/builds/${preset.buildId}.json`));
  const draft = buildReadyPresetDraft(recipe, preset, content);
  const options = buildReadyPresetOptions(draft, content);
  return { levels: buildReadyPresetLevels(recipe, content)!, targetLevel, choices, advancements: {}, classOptionChoices: {}, preparedSpellKeys: null, start: buildAssemblyStartState(draft, options) };
}

function pickLastOfferedSpells(slug: string, targetLevel: number): OpenPickChoices {
  const context = buildPageContext(slug, targetLevel);
  for (const slot of listOpenPickSlots(context.levels, targetLevel)) {
    context.choices[slot.id] = listOpenPickCandidates(context, slot, "").slice(-slot.count).map((spell) => spell.key);
  }
  return context.choices;
}

describe("request built by the preset page", () => {
  it.each([["cleric-light-2014", 20], ["cleric-trickery-rogue-2014", 20]])("creates %s at level %i with the default picks, which skip spells the subclass already grants", async (slug, level) => {
    const choices = fillDefaultOpenPicks(buildPageContext(slug, level));
    const created = await createCharacterFromBuild(buildClientRequest(slug, level, choices));
    if ("error" in created) throw new Error(created.error);
    expect((await readSheetState(created.persId)).level).toBe(level);
  });

  it("accepts the last spell the page offers in every open slot of the Eldritch Knight, including the any-school pick of level 20", async () => {
    const choices = pickLastOfferedSpells("fighter-eldritch-knight-2014", 20);
    expect(Object.keys(choices)).toEqual([buildOpenPickId(19, "knownSpells"), buildOpenPickId(20, "knownSpells")]);
    const created = await createCharacterFromBuild(buildClientRequest("fighter-eldritch-knight-2014", 20, choices));
    if ("error" in created) throw new Error(created.error);
    expect((await readSheetState(created.persId)).level).toBe(20);
  });

  it("is refused by the server for the Illusion pick at level 19 that the page no longer offers", async () => {
    const context = buildPageContext("fighter-eldritch-knight-2014", 19);
    const [slot] = listOpenPickSlots(context.levels, 19).filter((entry) => entry.characterLevel === 19);
    expect(listOpenPickCandidates(context, slot, "").map((spell) => spell.key)).not.toContain("fear");
    const request = buildClientRequest("fighter-eldritch-knight-2014", 19, { [buildOpenPickId(19, "knownSpells")]: ["fear"] }, null, false);
    const created = await createCharacterFromBuild(request);
    expect(created).toMatchObject({ error: expect.stringContaining("Рівень 19") });
  });

  it("creates the multiclass character at the chosen level from the page's own open pick", async () => {
    const request = buildClientRequest("sorcadin-clockwork-2014", 7, { "7:knownSpells": ["absorb-elements"] });
    const created = await createCharacterFromBuild(request);
    if ("error" in created) throw new Error(created.error);
    const state = await readSheetState(created.persId);
    expect(state).toMatchObject({ level: 7, class: "PALADIN_2014", multiclasses: [{ class: "SORCERER_2014", classLevel: 4 }] });
    expect(state.spells.find((row) => row.spell === "Absorb Elements")?.learnedAtLevel).toBe(7);
  });

  it("applies the Wizard preparation the player chose within the Intelligence limit", async () => {
    const preparedSpellKeys = ["fireball", "shield", "magic-missile", "fly", "mage-armor", "misty-step", "burning-hands", "scorching-ray", "detect-magic"];
    const request = buildClientRequest("wizard-evocation-2014", 5, {}, preparedSpellKeys);
    expect(request.preparedSpellKeys).toEqual(preparedSpellKeys);
    const created = await createCharacterFromBuild(request);
    if ("error" in created) throw new Error(created.error);
    const state = await readSheetState(created.persId);
    expect(state.spells.filter((row) => row.isPrepared && row.level > 0).map((row) => row.spell).sort()).toEqual(
      ["Burning Hands", "Detect Magic", "Fireball", "Fly", "Mage Armor", "Magic Missile", "Misty Step", "Scorching Ray", "Shield"],
    );
  });
});

describe("spells the page pre-fills from the RPGbot scores", () => {
  it.each([
    ["wizard-chronurgy-magic-2014", 20], ["bard-lore-2014", 20], ["ranger-hunter-2014", 20], ["fighter-eldritch-knight-2014", 20], ["sorcerer-draconic-2014", 20],
  ])("creates %s at level %i from the untouched defaults", async (slug, level) => {
    const choices = fillDefaultOpenPicks(buildPageContext(slug, level));
    const created = await createCharacterFromBuild(buildClientRequest(slug, level, choices));
    if ("error" in created) throw new Error(created.error);
    expect((await readSheetState(created.persId)).level).toBe(level);
  });
});

describe("skill gained on entering a class", () => {
  it("gives the Bugbear Warlock the Rogue skill the author's plan names at level 2", async () => {
    const created = await createCharacterFromBuild(buildClientRequest("bugbear-fiend-warlock-2014", 2));
    if ("error" in created) throw new Error(created.error);
    const skills = await prisma.persSkill.findMany({ where: { persId: created.persId }, select: { name: true } });
    expect(skills.map((row) => row.name)).toContain("INSIGHT");
  });
});

describe("advancement the player changed on the preset page", () => {
  it("creates the Cavalier with the feat and the increase the player chose instead of the platform's defaults", async () => {
    const request = buildClientRequest("fighter-cavalier-2014", 20, {}, null, true, {
      "16": { kind: "feat", featKey: "TOUGH", optionNameEng: null },
      "19": { kind: "asi", abilities: ["DEX", "WIS"] },
    });
    expect(request.openAdvancements).toEqual([
      { characterLevel: 16, featKey: "TOUGH" },
      { characterLevel: 19, abilityScoreIncrease: [{ ability: "DEX", amount: 1 }, { ability: "WIS", amount: 1 }] },
    ]);
    const created = await createCharacterFromBuild(request);
    if ("error" in created) throw new Error(created.error);
    const pers = await prisma.pers.findUniqueOrThrow({ where: { persId: created.persId }, select: { level: true, feats: { select: { feat: { select: { name: true } } } } } });
    const featNames = pers.feats.map((row) => row.feat.name);
    expect(pers.level).toBe(20);
    expect(featNames).toContain("TOUGH");
    expect(featNames).not.toContain("LUCKY");
  });

  it("creates the same Cavalier with the platform's defaults when the player changes nothing", async () => {
    const created = await createCharacterFromBuild(buildClientRequest("fighter-cavalier-2014", 20));
    if ("error" in created) throw new Error(created.error);
    const pers = await prisma.pers.findUniqueOrThrow({ where: { persId: created.persId }, select: { feats: { select: { feat: { select: { name: true } } } } } });
    expect(pers.feats.map((row) => row.feat.name)).toEqual(expect.arrayContaining(["LUCKY", "ALERT"]));
  });

  it("is refused by the server for a level where the author named the feat", async () => {
    const request = { ...buildClientRequest("fighter-cavalier-2014", 20), openAdvancements: [{ characterLevel: 4, featKey: "LUCKY" }] };
    expect(await createCharacterFromBuild(request)).toMatchObject({ error: expect.stringContaining("не можна змінювати") });
  });
});

describe("class options the player changed on the preset page", () => {
  const readMetamagic = async (persId: number) => {
    const pers = await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { choiceOptions: { select: { optionNameEng: true, groupName: true } } } });
    return pers.choiceOptions.filter((option) => option.groupName === "Метамагія").map((option) => option.optionNameEng).sort();
  };

  it("creates the Sorcerer with the metamagic the player chose at level 17 instead of the platform's default", async () => {
    const request = buildClientRequest("sorcerer-clockwork-soul-2014", 20, {}, null, true, {}, { "17": ["Seeking Spell"] });
    expect(request.openClassOptions).toEqual([{ characterLevel: 17, classOptions: [{ optionNameEng: "Seeking Spell", groupName: "Метамагія" }] }]);
    const created = await createCharacterFromBuild(request);
    if ("error" in created) throw new Error(created.error);
    const metamagic = await readMetamagic(created.persId);
    expect(metamagic).toContain("Seeking Spell");
    expect(metamagic).not.toContain("Careful Spell");
  });

  it("is refused by the server for a level where the author named the options", async () => {
    const request = { ...buildClientRequest("sorcerer-clockwork-soul-2014", 20), openClassOptions: [{ characterLevel: 3, classOptions: [{ optionNameEng: "Seeking Spell" }] }] };
    expect(await createCharacterFromBuild(request)).toMatchObject({ error: expect.stringContaining("не можна змінювати") });
  });
});
