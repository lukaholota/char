import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createCharacterFromBuild } from "@/lib/actions/character";
import { buildCharacterCreationOptions } from "@/lib/content/creator-content";
import { findCreatorContent } from "@/server/db/creator-content-query";
import { buildAssemblyCatalog } from "@/lib/optimization/assembly-catalog";
import { buildAssemblyPlan } from "@/lib/optimization/assembly-plan";
import { findExecutableLevels } from "@/lib/optimization/build-executable-levels";
import { walkProgression, buildWalkEnvironment, listOpenSelectionsUpTo } from "@/lib/optimization/progression-walk";
import { buildReadyPresetDraft, readyPresetSchema, type ReadyPreset } from "@/lib/optimization/ready-preset";
import { buildRecipeSchema } from "@/lib/optimization/schema";
import type { BuildRecipe } from "@/lib/optimization/types";
import { buildSpellSlug } from "@/lib/spell-link";
import { normalizeSpellSlotArray } from "@/rules/spellcasting";
import { disconnectDatabase, resetUserData } from "../user-data";
import { correctStaleWizardEquipmentSeed } from "./stale-wizard-seed";
import { applyDatabaseSpellPool } from "./assembly-spell-pool";
import { buildAssemblyExpectation, type AssemblyExpectation } from "./assembly-expectation";

export const ASSEMBLY_SHARD_COUNT = 12;
export const MAX_RECIPES_PER_SHARD = 12;
const READY_BUILDS_DIRECTORY = "data/rpgbot/ready-builds";
const SHARD_FILE_PATTERN = /^rpgbot-assembly-all\.shard-\d+\.test\.ts$/;
const SENSITIVITY_SLUG = "hexadin-ancients-2014";

export type AssemblyCase = { slug: string; targetLevel: number };

export function listExecutableRecipeSlugs(): string[] {
  return readdirSync(READY_BUILDS_DIRECTORY)
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.slice(0, -5))
    .filter((slug) => findExecutableLevels(readStoredBuild(slug).recipe).length > 1)
    .sort();
}

export function listShardSlugs(slugs: readonly string[], shardIndex: number, shardCount: number): string[] {
  return slugs.filter((_slug, position) => position % shardCount === shardIndex);
}

export function pickTargetLevels(recipe: BuildRecipe): number[] {
  const levels = findExecutableLevels(recipe).filter((level) => level > 1);
  const last = levels[levels.length - 1];
  return levels.length > 2 ? [levels[Math.floor((levels.length - 1) / 2)], last] : [last];
}

export function listAssemblyCases(slugs: readonly string[]): AssemblyCase[] {
  return slugs.flatMap((slug) => pickTargetLevels(readStoredBuild(slug).recipe).map((targetLevel) => ({ slug, targetLevel })));
}

function readStoredBuild(slug: string): { recipe: BuildRecipe; preset: ReadyPreset } {
  const preset = readyPresetSchema.parse(JSON.parse(readFileSync(`${READY_BUILDS_DIRECTORY}/${slug}.json`, "utf8")));
  const recipe = buildRecipeSchema.parse(JSON.parse(readFileSync(`data/rpgbot/builds/${preset.buildId}.json`, "utf8")));
  return { recipe, preset };
}

export function registerAssemblyShardCoverageCheck(): void {
  describe("assembly shards", () => {
    it("has one test file per shard, so every executable recipe is created exactly once", () => {
      const shardFiles = readdirSync("tests/actions").filter((name) => SHARD_FILE_PATTERN.test(name)).sort();
      expect(shardFiles).toEqual(Array.from({ length: ASSEMBLY_SHARD_COUNT }, (_unused, index) => `rpgbot-assembly-all.shard-${index + 1}.test.ts`).sort());
    });

    it("keeps every shard small enough for the file duration limit", () => {
      const slugs = listExecutableRecipeSlugs();
      const largest = Math.max(...Array.from({ length: ASSEMBLY_SHARD_COUNT }, (_unused, index) => listShardSlugs(slugs, index, ASSEMBLY_SHARD_COUNT).length));
      expect(largest, `більше ${MAX_RECIPES_PER_SHARD} рецептів на шард: збільште ASSEMBLY_SHARD_COUNT і додайте файли шардів`).toBeLessThanOrEqual(MAX_RECIPES_PER_SHARD);
    });

    it("covers the three hand-written pilots and every compiled recipe that has levels", () => {
      expect(listExecutableRecipeSlugs()).toEqual(expect.arrayContaining(["barbarian-berserker-2014", "wizard-evocation-2014", "sorcadin-clockwork-2014"]));
    });
  });
}

let isOwnerRegistered = false;

function registerOwner(label: string): void {
  if (isOwnerRegistered) return;
  isOwnerRegistered = true;
  afterAll(disconnectDatabase);
  beforeEach(async () => {
    await resetUserData();
    const owner = await prisma.user.create({ data: { email: `rpgbot-assembly-${label}@actions.test` } });
    vi.mocked(auth).mockResolvedValue({ user: { email: owner.email } } as never);
  });
}

export function registerAssemblyShard(shardIndex: number, shardCount: number = ASSEMBLY_SHARD_COUNT): void {
  const cases = listAssemblyCases(listShardSlugs(listExecutableRecipeSlugs(), shardIndex, shardCount));
  correctStaleWizardEquipmentSeed();
  registerOwner(`shard-${shardIndex}`);
  describe(`2014 executable recipes in the database, shard ${shardIndex + 1}/${shardCount}`, () => {
    it("takes only its own remainder class of recipes and stays under the size limit", () => {
      const slugs = listShardSlugs(listExecutableRecipeSlugs(), shardIndex, shardCount);
      expect(slugs.length).toBeLessThanOrEqual(MAX_RECIPES_PER_SHARD);
      expect(slugs.every((slug) => listExecutableRecipeSlugs().indexOf(slug) % shardCount === shardIndex)).toBe(true);
    });

    it.each(cases.map((entry) => [entry.slug, entry.targetLevel] as const))("assembles %s to level %i exactly as the recipe describes", async (slug, targetLevel) => {
      const run = await assembleCharacter(slug, targetLevel);
      await expectAssembledCharacter(run.persId, run.expectation);
      await expectReplayReturnsSameCharacter(run);
    });
  });
}

type AssemblyRun = { persId: number; expectation: AssemblyExpectation; request: Record<string, unknown> };

async function assembleCharacter(slug: string, targetLevel: number): Promise<AssemblyRun> {
  const { recipe, preset } = readStoredBuild(slug);
  const fullContent = await findCreatorContent(prisma, "RULES_2014");
  const creationContent = buildCharacterCreationOptions(fullContent);
  const draft = { ...buildReadyPresetDraft(recipe, preset, creationContent), name: `Складання ${slug}` };
  const walk = walkProgression(await applyDatabaseSpellPool(buildWalkEnvironment({ recipe, preset, content: fullContent }), fullContent), draft);
  const openSelections = listOpenSelectionsUpTo(walk.openSelections, targetLevel);
  expect(walk.errors, `помилки прогресії ${slug}`).toEqual([]);

  const spells = await prisma.spell.findMany({ where: { ruleset: "RULES_2014" }, select: { spellId: true, engName: true } });
  const plan = buildAssemblyPlan({ recipe, targetLevel, catalog: buildAssemblyCatalog(fullContent, spells), openSelections });
  if (!plan.plan) throw new Error(`План ${slug} не збирається: ${JSON.stringify(plan.issues)}`);

  const request = { buildId: recipe.buildId, revisionId: recipe.revisionId, targetLevel, requestId: randomUUID(), start: draft, openSelections };
  const created = await createCharacterFromBuild(request);
  if ("error" in created) throw new Error(`${slug} → ${targetLevel}: ${created.error} ${JSON.stringify(created.details)}`);
  const expectation = buildAssemblyExpectation({ recipe, preset, draft, fullContent, creationContent, steps: plan.plan.steps, openSelections, targetLevel });
  return { persId: created.persId, expectation, request };
}

async function expectReplayReturnsSameCharacter(run: AssemblyRun): Promise<void> {
  const replay = await createCharacterFromBuild(run.request);
  expect(replay).toEqual({ success: true, persId: run.persId });
  expect(await countAssemblyRecords()).toEqual({ pers: 1, snapshots: 0, operations: 1 });
}

async function countAssemblyRecords() {
  return {
    pers: await prisma.pers.count(),
    snapshots: await prisma.pers.count({ where: { isSnapshot: true } }),
    operations: await prisma.pers_offline_operation.count({ where: { operation_kind: "build_assembly_create" } }),
  };
}

const loadAssembledCharacter = (persId: number) => prisma.pers.findUniqueOrThrow({
  where: { persId },
  include: {
    class: true, subclass: true, multiclasses: { include: { class: true, subclass: true }, orderBy: { persMulticlassId: "asc" } },
    skills: true, feats: { include: { feat: true } }, features: true, choiceOptions: true, persSpells: { include: { spell: true } },
  },
});
type AssembledCharacter = Awaited<ReturnType<typeof loadAssembledCharacter>>;

export async function expectAssembledCharacter(persId: number, expectation: AssemblyExpectation): Promise<void> {
  const character = await loadAssembledCharacter(persId);
  expectLevelsAndSubclasses(character, expectation);
  expectAbilityScores(character, expectation);
  expectHitPoints(character, expectation);
  expectSpellSlots(character, expectation);
  expectChosenSpells(character, expectation);
  expectChoicesAndFeats(character, expectation);
  expect(character.features.length).toBeGreaterThan(0);
  expect(character.isSnapshot).toBe(false);
}

function expectLevelsAndSubclasses(character: AssembledCharacter, expectation: AssemblyExpectation): void {
  const [main, ...others] = expectation.classes;
  expect(character.level).toBe(expectation.targetLevel);
  expect({ class: character.class.name, classLevel: character.level - character.multiclasses.reduce((sum, row) => sum + row.classLevel, 0), subclass: character.subclass?.name ?? null })
    .toEqual({ class: main.classKey, classLevel: main.classLevel, subclass: main.subclassKey });
  expect(character.multiclasses.map((row) => ({ class: row.class.name, classLevel: row.classLevel, subclass: row.subclass?.name ?? null })))
    .toEqual(others.map((entry) => ({ class: entry.classKey, classLevel: entry.classLevel, subclass: entry.subclassKey })));
  expect(expectation.classes.reduce((sum, entry) => sum + entry.classLevel, 0)).toBe(expectation.targetLevel);
}

function expectAbilityScores(character: AssembledCharacter, expectation: AssemblyExpectation): void {
  const { STR, DEX, CON, INT, WIS, CHA } = expectation.scores;
  expect({ str: character.str, dex: character.dex, con: character.con, int: character.int, wis: character.wis, cha: character.cha }).toEqual({ str: STR, dex: DEX, con: CON, int: INT, wis: WIS, cha: CHA });
}

function expectHitPoints(character: AssembledCharacter, expectation: AssemblyExpectation): void {
  expect(character.maxHp).toBeGreaterThan(0);
  expect(character.maxHp).toBeGreaterThanOrEqual(expectation.hitPoints.min);
  expect(character.maxHp).toBeLessThanOrEqual(expectation.hitPoints.max);
  expect(character.currentHp).toBe(character.maxHp);
}

function expectSpellSlots(character: AssembledCharacter, expectation: AssemblyExpectation): void {
  expect(normalizeSpellSlotArray(character.currentSpellSlots)).toEqual(expectation.spellSlots);
  expect(character.currentPactSlots).toBe(expectation.pactSlots);
}

function expectChosenSpells(character: AssembledCharacter, expectation: AssemblyExpectation): void {
  const bySlug = new Map(character.persSpells.map((row) => [buildSpellSlug(row.spell.engName), row]));
  for (const expected of expectation.chosenSpells) {
    const row = bySlug.get(expected.key);
    expect(row, `заклинання ${expected.key} має бути в персонажа`).toBeDefined();
    expect({ key: expected.key, origin: row!.origin, sourceName: row!.sourceName, learnedAtLevel: row!.learnedAtLevel })
      .toEqual({ key: expected.key, origin: expected.origin, sourceName: expected.sourceName, learnedAtLevel: expected.learnedAtLevel });
    if (expected.isTakenOver) expect({ prepared: row!.excludeFromPreparedCount, known: row!.excludeFromKnownCount }, `${expected.key}: забране правилом заклинання не рахується в ліміт`).toEqual({ prepared: true, known: true });
  }
  for (const expected of expectation.featureSpells) {
    const row = bySlug.get(expected.key);
    expect(row, `заклинання від уміння ${expected.key} має бути в персонажа`).toBeDefined();
    expect({ key: expected.key, origin: row!.origin, sourceName: row!.sourceName, learnedAtLevel: row!.learnedAtLevel })
      .toEqual({ key: expected.key, origin: "CLASS", sourceName: expected.sourceName, learnedAtLevel: expected.learnedAtLevel });
  }
  for (const key of expectation.droppedSpellKeys) expect(bySlug.has(key), `замінене заклинання ${key} не має лишитися`).toBe(false);
  expect(character.persSpells.every((row) => row.learnedAtLevel <= expectation.targetLevel), "жодне заклинання не вивчене пізніше за цільовий рівень").toBe(true);
}

function expectChoicesAndFeats(character: AssembledCharacter, expectation: AssemblyExpectation): void {
  const ownedOptionIds = character.choiceOptions.map((option) => option.choiceOptionId);
  expect(ownedOptionIds).toEqual(expect.arrayContaining(expectation.choiceOptionIds));
  expect(ownedOptionIds.filter((optionId) => expectation.droppedOptionIds.includes(optionId)), "замінені вибори не мають лишитися").toEqual([]);
  expect(character.feats.map((entry) => entry.feat.name)).toEqual(expect.arrayContaining(expectation.featKeys));
  const expertise = character.skills.filter((skill) => skill.proficiencyType === "EXPERTISE").map((skill) => skill.name);
  expect(expertise).toEqual(expect.arrayContaining(expectation.expertise));
}

type ExpectationChange = (expectation: AssemblyExpectation) => AssemblyExpectation;
const WRONG_EXPECTATIONS: readonly (readonly [string, ExpectationChange])[] = [
  ["another target level", (expectation) => ({ ...expectation, targetLevel: expectation.targetLevel - 1 })],
  ["another class split", (expectation) => ({ ...expectation, classes: expectation.classes.map((entry, index) => (index === 0 ? { ...entry, classLevel: entry.classLevel + 1 } : entry)) })],
  ["another subclass", (expectation) => ({ ...expectation, classes: expectation.classes.map((entry, index) => (index === 0 ? { ...entry, subclassKey: "OATH_OF_VENGEANCE" } : entry)) })],
  ["a missed ability increase", (expectation) => ({ ...expectation, scores: { ...expectation.scores, CHA: expectation.scores.CHA - 2 } })],
  ["a missing feat", (expectation) => ({ ...expectation, featKeys: [...expectation.featKeys, "ALERT"] })],
  ["spells learned at another level", (expectation) => ({ ...expectation, chosenSpells: expectation.chosenSpells.map((spell) => ({ ...spell, learnedAtLevel: spell.learnedAtLevel + 1 })) })],
  ["another spell slot table", (expectation) => ({ ...expectation, spellSlots: expectation.spellSlots.map((slots, index) => (index === 0 ? slots + 1 : slots)) })],
  ["more pact slots", (expectation) => ({ ...expectation, pactSlots: expectation.pactSlots + 1 })],
  ["a hit point window above the real maximum", (expectation) => ({ ...expectation, hitPoints: { min: expectation.hitPoints.max + 200, max: expectation.hitPoints.max + 400 } })],
];

export function registerAssemblySensitivityCheck(): void {
  registerOwner("sensitivity");
  describe("assembly invariants notice a wrong expectation", () => {
    it("fails for every deliberately wrong expectation of a real assembled character", async () => {
      const run = await assembleCharacter(SENSITIVITY_SLUG, 9);
      await expectAssembledCharacter(run.persId, run.expectation);
      for (const [label, change] of WRONG_EXPECTATIONS) {
        await expect(expectAssembledCharacter(run.persId, change(run.expectation)), label).rejects.toThrow();
      }
    });
  });
}
