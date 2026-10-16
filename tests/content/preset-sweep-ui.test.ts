import { describe, expect, it } from "vitest";
import type { Ruleset } from "@prisma/client";
import { findCharacterCreationOptions, findCharacterCreatorOptions } from "@/lib/content/creator-content";
import { buildAssemblyCatalog, type AssemblyCatalog } from "@/lib/optimization/assembly-catalog";
import { buildAssemblyPlan } from "@/lib/optimization/assembly-plan";
import { getAllSpells } from "@/lib/spellsData";
import { listLevelsOutsideExecutable, listPresetLevels, listPresetSweepCases, listStoredPresets, listSupportedLevelsNotOffered, readStoredPreset, type PresetSweepCase, type StoredPreset } from "../helpers/preset-sweep/cases";
import { startCustomizedSession } from "../helpers/preset-sweep/customize";
import { SWEEP_EDITIONS } from "../helpers/preset-sweep/editions";
import { describeSweepCase, estimateSweepCost, listAllSweepCases, listSweepShardFiles, MAX_SWEEP_COST_PER_SHARD, PRESET_SWEEP_SHARD_COUNT, splitIntoShards } from "../helpers/preset-sweep/shards";
import { buildCreationRequest, listCreationBlockers, openPresetPage, selectTargetLevel, startPresetSession, type PresetPage, type PresetSession } from "../helpers/preset-sweep/ui-flow";

const CUSTOMIZED_TRIALS_PER_PRESET = 3;
// BUG-O49-FUZZ-20261013: removing a start spell that a later level swaps out blocks the page with a clear message; the server is never reached.
const KNOWN_PLAN_SWAP_BLOCKER = "план замінює";
const catalogs = new Map<Ruleset, AssemblyCatalog>();

function findCatalog(ruleset: Ruleset): AssemblyCatalog {
  if (!catalogs.has(ruleset)) {
    catalogs.set(ruleset, buildAssemblyCatalog(findCharacterCreatorOptions(ruleset), getAllSpells(ruleset).map((spell) => ({ spellId: spell.spellId, engName: spell.engName }))));
  }
  return catalogs.get(ruleset)!;
}

function openPage(stored: StoredPreset): PresetPage {
  return openPresetPage(stored, findCharacterCreationOptions(stored.recipe.ruleset));
}

function listServerProblems(session: PresetSession): string[] {
  const request = buildCreationRequest(session);
  if (request.kind === "level-one") {
    return [
      ...(session.assembly.targetLevel === 1 ? [] : [`запит 1-го рівня, хоча обрано ${session.assembly.targetLevel}-й`]),
      ...(request.body.readyPresetBuildId === session.page.preset.buildId ? [] : ["запит без readyPresetBuildId"]),
    ];
  }
  const { body } = request;
  const result = buildAssemblyPlan({
    recipe: session.page.recipe, targetLevel: body.targetLevel, catalog: findCatalog(session.page.recipe.ruleset), openSelections: body.openSelections,
    openAdvancements: body.openAdvancements, openClassOptions: body.openClassOptions, preparedSpellKeys: body.preparedSpellKeys,
  });
  return [
    ...result.issues.map((issue) => `план: ${issue.message}`),
    ...(result.plan?.steps.at(-1)?.characterLevel === body.targetLevel ? [] : [`план не доходить до ${body.targetLevel}-го рівня`]),
  ];
}

function sweepUntouched(sweepCase: PresetSweepCase): void {
  const session = selectTargetLevel(startPresetSession(openPage(readStoredPreset(sweepCase.slug)), `Перевірка ${sweepCase.slug}`), sweepCase.targetLevel);
  expect(session.assembly.targetLevel, "рівень, який гравець обрав на сторінці").toBe(sweepCase.targetLevel);
  expect(listCreationBlockers(session), "сторінка не блокує кнопку створення").toEqual([]);
  expect(listServerProblems(session), "сервер прийме те, що дозволила сторінка").toEqual([]);
}

function sweepCustomized(stored: StoredPreset, trial: number): string[] {
  const { session, trace } = startCustomizedSession(openPage(stored), trial, listPresetLevels(stored));
  const blockers = listCreationBlockers(session);
  if (blockers.length && blockers.every((blocker) => blocker.includes(KNOWN_PLAN_SWAP_BLOCKER))) return [];
  if (blockers.length) return [`${trace} ⇒ кроки: ${blockers.join("; ")}`];
  return listServerProblems(session).map((problem) => `${trace} ⇒ ${problem}`);
}

describe.each(SWEEP_EDITIONS.map((ruleset) => [ruleset, listPresetSweepCases(ruleset)] as const))("untouched preset at every level, without a database, %s", (ruleset, cases) => {
  if (!cases.length) {
    it.skip(`${ruleset}: пресетів цієї редакції ще немає`, () => {});
    return;
  }
  it.each(cases.map((sweepCase) => [describeSweepCase(sweepCase), sweepCase] as const))("%s", (_name, sweepCase) => sweepUntouched(sweepCase));
});

describe("customized presets at a seeded level, without a database", () => {
  it.each(SWEEP_EDITIONS.flatMap((ruleset) => listStoredPresets(ruleset)).map((stored) => [stored.slug, stored] as const))("%s", (_slug, stored) => {
    const failures = Array.from({ length: CUSTOMIZED_TRIALS_PER_PRESET }, (_unused, trial) => sweepCustomized(stored, trial)).flat();
    expect(failures).toEqual([]);
  });
});

describe("preset sweep levels", () => {
  it.each(SWEEP_EDITIONS.flatMap((ruleset) => listStoredPresets(ruleset)).map((stored) => [stored.slug, stored] as const))("%s offers exactly the executable supported levels", (_slug, stored) => {
    expect(listLevelsOutsideExecutable(stored), "сторінка пропонує рівень, якого план не виконує").toEqual([]);
    expect(listSupportedLevelsNotOffered(stored), "рецепт підтримує рівень, якого сторінка не пропонує").toEqual([]);
  });
});

describe("preset sweep shards", () => {
  it("has one database shard file per shard and keeps every shard light", () => {
    expect(listSweepShardFiles()).toEqual(Array.from({ length: PRESET_SWEEP_SHARD_COUNT }, (_unused, index) => `preset-sweep.shard-${index + 1}.test.ts`).sort());
    const shards = splitIntoShards(listAllSweepCases(), PRESET_SWEEP_SHARD_COUNT);
    expect(shards.flat()).toHaveLength(listAllSweepCases().length);
    for (const shard of shards) expect(shard.reduce((cost, sweepCase) => cost + estimateSweepCost(sweepCase), 0)).toBeLessThanOrEqual(MAX_SWEEP_COST_PER_SHARD);
  });
});
