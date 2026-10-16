import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { createCharacter, createCharacterFromBuild } from "@/lib/actions/character";
import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { readyPresetSchema } from "@/lib/optimization/ready-preset";
import { buildRecipeSchema } from "@/lib/optimization/schema";
import { buildAssemblyStartState } from "@/lib/optimization/ready-preset-level-context";
import { buildAssemblyCreationRequest, findAssemblyChoiceProblem, type AssemblyChoiceContext } from "@/lib/optimization/ready-preset-levels";
import { fillDefaultOpenPicks } from "@/lib/optimization/ready-preset-default-spells";
import { buildReadyPresetLevels } from "@/lib/optimization/ready-preset-levels.server";
import type { ReadyPresetOptions } from "@/lib/optimization/ready-preset-options";
import { listSavedPresetIssues } from "@/lib/optimization/ready-preset-validation";
import { content, presetSlugs, readPreset } from "../helpers/preset-step-changes";
import { applyRandomChanges, fixDownstreamSteps, hashText, pickOne, seedRandom } from "../helpers/preset-sweep/customize";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
import { auth } from "@/lib/auth";

/// Гравець, як Адам: кілька змін на різних кроках поспіль, потім будь-який рівень і «Створити».
/// Якщо кроки не показують проблеми, сервер мусить створити персонажа з тими самими виборами.

vi.setConfig({ testTimeout: 600_000 });
// Хвилини роботи на кожен прогін, тож запускається на вимогу: PRESET_FUZZ_TRIALS=2 bunx vitest run --config vitest.integration.config.mts tests/actions/ready-preset-fuzz.test.ts
const TRIALS = Number(process.env.PRESET_FUZZ_TRIALS ?? 0);
const ownerEmail = "preset-fuzz@actions.test";

beforeAll(async () => {
  await resetUserData();
  await prisma.user.create({ data: { email: ownerEmail } });
  vi.mocked(auth).mockResolvedValue({ user: { email: ownerEmail } } as never);
});
afterAll(disconnectDatabase);

function buildLevelContext(slug: string, draft: PersFormData, options: ReadyPresetOptions, targetLevel: number): AssemblyChoiceContext {
  const preset = readyPresetSchema.parse(JSON.parse(readFileSync(`data/rpgbot/ready-builds/${slug}.json`, "utf8")));
  const recipe = buildRecipeSchema.parse(JSON.parse(readFileSync(`data/rpgbot/builds/${preset.buildId}.json`, "utf8")));
  const player: AssemblyChoiceContext = { levels: buildReadyPresetLevels(recipe, content, preset.subraceKey)!, targetLevel, choices: {}, advancements: {}, classOptionChoices: {}, preparedSpellKeys: null, start: buildAssemblyStartState(draft, options) };
  return { ...player, choices: fillDefaultOpenPicks(player) };
}

function listTargetLevels(slug: string): number[] {
  const preset = readyPresetSchema.parse(JSON.parse(readFileSync(`data/rpgbot/ready-builds/${slug}.json`, "utf8")));
  const recipe = buildRecipeSchema.parse(JSON.parse(readFileSync(`data/rpgbot/builds/${preset.buildId}.json`, "utf8")));
  const levels = buildReadyPresetLevels(recipe, content);
  return levels ? [1, 1, ...levels.targetLevels] : [1];
}

async function createLikeThePage(slug: string, draft: PersFormData, options: ReadyPresetOptions, targetLevel: number) {
  const start = { ...draft, name: "Фазер", ruleset: "RULES_2014" as const, readyPresetRequestId: randomUUID() };
  if (targetLevel === 1) return createCharacter(start);
  const context = buildLevelContext(slug, start, options, targetLevel);
  const problem = findAssemblyChoiceProblem(context);
  if (problem) return { error: `сторінка рівнів: ${problem}` };
  const preset = readyPresetSchema.parse(JSON.parse(readFileSync(`data/rpgbot/ready-builds/${slug}.json`, "utf8")));
  return createCharacterFromBuild(buildAssemblyCreationRequest({ preset, requestId: randomUUID(), start, context }));
}

async function findLostChoices(persId: number, draft: PersFormData): Promise<string[]> {
  const pers = await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { customLanguagesKnown: true } });
  return (draft.languagesSchema?.languages ?? []).filter((language) => !pers.customLanguagesKnown.includes(translateValue(language))).map((language) => `мова ${language} не збережена`);
}

describe.skipIf(TRIALS === 0)("random customization of every ready preset creates the character", () => {
  it.each(presetSlugs)("%s", async (slug) => {
    const { draft, options } = readPreset(slug);
    const failures: string[] = [];
    for (let trial = 0; trial < TRIALS; trial++) {
      const random = seedRandom(hashText(slug) + trial);
      const labels: string[] = [];
      const targetLevel = pickOne(random, listTargetLevels(slug));
      const changed = fixDownstreamSteps(applyRandomChanges(draft, options, random, labels), options, targetLevel);
      const trace = `рівень ${targetLevel}: ${labels.join(" → ") || "без змін"}`;
      const issues = listSavedPresetIssues(changed, draft, options);
      if (issues.length) { failures.push(`${trace} ⇒ кроки: ${issues.map((issue) => issue.message).join("; ")}`); continue; }
      const created = await createLikeThePage(slug, changed, options, targetLevel);
      if ("error" in created && created.error) { failures.push(`${trace} ⇒ сервер: ${created.error} ${JSON.stringify((created as { details?: unknown }).details ?? "").slice(0, 400)}`); continue; }
      if ("persId" in created && created.persId) failures.push(...(await findLostChoices(created.persId, changed)).map((lost) => `${trace} ⇒ ${lost}`));
    }
    expect(failures).toEqual([]);
  });
});

describe.skipIf(TRIALS === 0)("untouched preset at its highest level, which replays every level step on the server", () => {
  it.each(presetSlugs)("%s", async (slug) => {
    const { draft, options } = readPreset(slug);
    const failures: string[] = [];
    for (const targetLevel of [Math.max(...listTargetLevels(slug))]) {
      const created = await createLikeThePage(slug, draft, options, targetLevel);
      if ("error" in created && created.error) failures.push(`рівень ${targetLevel} ⇒ ${created.error}`);
    }
    expect(failures).toEqual([]);
  });
});
