import { afterAll, beforeAll, expect, vi } from "vitest";
import type { Ruleset } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createCharacter, createCharacterFromBuild, type CreateCharacterResult } from "@/lib/actions/character";
import { buildCharacterCreationOptions, findCharacterCreatorOptions } from "@/lib/content/creator-content";
import { findCreatorContent, type CreatorContent } from "@/server/db/creator-content-query";
import { buildAssemblyCatalog, type AssemblyCatalog } from "@/lib/optimization/assembly-catalog";
import { buildAssemblyPlan, type AssemblyStep } from "@/lib/optimization/assembly-plan";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { disconnectDatabase, resetUserData } from "../../user-data";
import { correctStaleWizardEquipmentSeed } from "../stale-wizard-seed";
import { buildAssemblyExpectation, type AssemblyExpectation } from "../assembly-expectation";
import { listPresetLevels, readStoredPreset, type PresetSweepCase } from "./cases";
import { startCustomizedSession } from "./customize";
import { buildCreationRequest, listCreationBlockers, openPresetPage, selectTargetLevel, startPresetSession, type AssemblyCreationRequest, type CreationRequest, type PresetPage, type PresetSession } from "./ui-flow";

export type EditionContent = { ruleset: Ruleset; fullContent: CreatorContent; creationContent: CreatorContent; catalog: AssemblyCatalog; spellLists: Map<number, string[]> };
export type SweepFixture = { ownerId: () => number; contentOf: (ruleset: Ruleset) => Promise<EditionContent> };
export type SweepRun = {
  sweepCase: PresetSweepCase; session: PresetSession; request: CreationRequest; start: PersFormData; persId: number;
  steps: AssemblyStep[]; expectation: AssemblyExpectation | null; content: EditionContent;
};

export function registerSweepFixture(label: string): SweepFixture {
  let ownerId = 0;
  const contents = new Map<Ruleset, Promise<EditionContent>>();
  correctStaleWizardEquipmentSeed();
  beforeAll(async () => {
    await resetUserData();
    const owner = await prisma.user.create({ data: { email: `preset-sweep-${label}@actions.test` } });
    ownerId = owner.id;
    vi.mocked(auth).mockResolvedValue({ user: { email: owner.email } } as never);
  });
  afterAll(disconnectDatabase);
  return {
    ownerId: () => ownerId,
    contentOf: (ruleset) => {
      if (!contents.has(ruleset)) contents.set(ruleset, loadEditionContent(ruleset));
      return contents.get(ruleset)!;
    },
  };
}

// The plan oracle reads the catalog the server plans from; saved-state checks read the database rows level-up reads.
async function loadEditionContent(ruleset: Ruleset): Promise<EditionContent> {
  const fullContent = await findCreatorContent(prisma, ruleset);
  const spells = await prisma.spell.findMany({ where: { ruleset }, select: { spellId: true, engName: true, spellClasses: { where: { ruleset }, select: { className: true } } } });
  return {
    ruleset, fullContent, creationContent: buildCharacterCreationOptions(fullContent), catalog: buildAssemblyCatalog(findCharacterCreatorOptions(ruleset), spells),
    spellLists: new Map(spells.map((spell) => [spell.spellId, spell.spellClasses.map((entry) => entry.className)])),
  };
}

export function openSweptSession(sweepCase: PresetSweepCase, content: EditionContent): PresetSession {
  const stored = readStoredPreset(sweepCase.slug);
  const page = openPresetPage(stored, content.creationContent);
  if (sweepCase.customizedTrial !== undefined) return startCustomizedSession(page, sweepCase.customizedTrial, listPresetLevels(stored)).session;
  return selectTargetLevel(startPresetSession(page, `Перевірка ${sweepCase.slug}`), sweepCase.targetLevel);
}

export async function createLikeThePage(sweepCase: PresetSweepCase, session: PresetSession, content: EditionContent): Promise<SweepRun> {
  expect(session.assembly.targetLevel, "рівень, який гравець обрав на сторінці").toBe(sweepCase.targetLevel);
  expect(listCreationBlockers(session), "сторінка не блокує кнопку створення").toEqual([]);
  const request = buildCreationRequest(session);
  const planned = request.kind === "assembly" ? planExpectation(session.page, request.body, content) : { steps: [], expectation: null };
  const result = await sendCreation(request);
  if ("error" in result) throw new Error(`${sweepCase.slug} → ${sweepCase.targetLevel}: ${result.error} ${JSON.stringify(result.details ?? null)}`);
  return { sweepCase, session, request, start: findRequestStart(request), persId: result.persId, content, ...planned };
}

export function sendCreation(request: CreationRequest): Promise<CreateCharacterResult> {
  return request.kind === "level-one" ? createCharacter(request.body) : createCharacterFromBuild(request.body);
}

export function findRequestStart(request: CreationRequest): PersFormData {
  return request.kind === "level-one" ? request.body : request.body.start;
}

function planExpectation(page: PresetPage, body: AssemblyCreationRequest, content: EditionContent): { steps: AssemblyStep[]; expectation: AssemblyExpectation } {
  const { recipe, preset } = page;
  const result = buildAssemblyPlan({
    recipe, targetLevel: body.targetLevel, catalog: content.catalog, openSelections: body.openSelections,
    openAdvancements: body.openAdvancements, openClassOptions: body.openClassOptions, preparedSpellKeys: body.preparedSpellKeys,
  });
  if (!result.plan) throw new Error(`План ${preset.buildId} → ${body.targetLevel} не збирається: ${JSON.stringify(result.issues)}`);
  const openSelections = body.openSelections.map((entry) => ({ characterLevel: entry.characterLevel, cantripKeys: entry.cantripKeys ?? [], knownSpellKeys: entry.knownSpellKeys ?? [], spellbookKeys: entry.spellbookKeys ?? [] }));
  const steps = result.plan.steps;
  return {
    steps,
    expectation: buildAssemblyExpectation({ recipe, preset, draft: body.start, fullContent: content.fullContent, creationContent: content.creationContent, steps, openSelections, targetLevel: body.targetLevel }),
  };
}

export async function expectReplayKeepsCharacter(run: SweepRun, ownerId: number): Promise<void> {
  const before = await prisma.pers.count({ where: { userId: ownerId } });
  expect(await sendCreation(run.request), "повтор того самого запиту").toEqual({ success: true, persId: run.persId });
  expect(await prisma.pers.count({ where: { userId: ownerId } }), "повтор не створює другого персонажа").toBe(before);
  expect(await prisma.pers_offline_operation.count({ where: { pers_id: run.persId } }), "одна операція створення на запит").toBe(1);
}
