import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import { levelUpCharacter } from "@/lib/actions/levelup";
import { loadGuidedLevelUp } from "@/server/db/guided-level-up";
import { disconnectDatabase, resetUserData } from "../user-data";
import { countSnapshots, readSheetState, runManualLevelUpPath } from "../helpers/assembly-manual-path";
import type { BuildRecipe } from "@/lib/optimization/types";
import { barbarianScenario, readRecipeFile, sorcadinScenario, wizardScenario, type AssemblyScenario } from "../helpers/assembly-scenarios";

const syntheticArchives = vi.hoisted(() => new Map<string, BuildRecipe>());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
vi.mock("@/lib/optimization/slice-reader", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/optimization/slice-reader")>();
  return { ...actual, readArchivedRecipe: async (revisionId: string) => syntheticArchives.get(revisionId) ?? actual.readArchivedRecipe(revisionId) };
});
import { auth } from "@/lib/auth";

vi.setConfig({ testTimeout: 180_000 });

/// KR49.11: підвищення «За гайдом» — це той самий `levelUpCharacter` із рішеннями наступного рівня
/// рецепта. Персонаж, піднятий так, має збігатися з ручним проходженням тих самих рішень.
/// Відкритий вибір гайд заповнює сам (як створення з пресета); тест міняє його на ручний вибір сценарію.

const EMAIL = "guided-level-up@actions.test";

beforeEach(async () => {
  syntheticArchives.clear();
  await resetUserData();
  await prisma.user.create({ data: { email: EMAIL } });
  vi.mocked(auth).mockResolvedValue({ user: { email: EMAIL } } as never);
});
afterAll(disconnectDatabase);

async function createAtFirstLevel(scenario: AssemblyScenario): Promise<number> {
  const created = await createCharacter(await scenario.buildStart());
  if ("error" in created) throw new Error(created.error);
  const recipe = readRecipeFile(scenario.buildId);
  await prisma.pers.update({ where: { persId: created.persId }, data: { sourceBuildId: recipe.buildId, sourceBuildRevisionId: recipe.revisionId } });
  return created.persId;
}

async function findSpellId(engName: string): Promise<number> {
  return (await prisma.spell.findFirstOrThrow({ where: { engName, ruleset: "RULES_2014" }, select: { spellId: true } })).spellId;
}

type OpenKnownSpells = Record<number, string[]>;

async function runGuidedLevelUps(persId: number, targetLevel: number, openKnownSpells: OpenKnownSpells = {}) {
  for (let level = 1; level < targetLevel; level++) {
    const guide = await loadGuidedLevelUp(persId);
    if (guide?.status !== "ready") throw new Error(`Рівень ${level + 1}: ${JSON.stringify(guide)}`);
    expect(guide.skipped).toEqual([]);
    const chosenIds = await Promise.all((openKnownSpells[level + 1] ?? []).map(findSpellId));
    if (chosenIds.length) expect(guide.open.join(" ")).toContain("Заклинання, яких автор не називає");
    const planned = guide.input.classSpells;
    const classSpells = planned && chosenIds.length ? { ...planned, preparedIds: [...planned.preparedIds.slice(0, -chosenIds.length), ...chosenIds] } : planned;
    const result = await levelUpCharacter(persId, { ...guide.input, classSpells, expectedLevel: level });
    if ("error" in result) throw new Error(`Рівень ${level + 1}: ${result.error}`);
  }
}

async function createManually(scenario: AssemblyScenario): Promise<number> {
  const persId = await createAtFirstLevel(scenario);
  await runManualLevelUpPath(persId, scenario.manualSteps);
  return persId;
}

describe("підвищення за гайдом дає той самий лист, що й ручне", () => {
  it.each([
    ["Варвар: підклас і ASI", barbarianScenario, {}],
    ["Чарівник: книга заклинань", wizardScenario, {}],
    ["Соркадін: вхід у мультиклас, опції, риса й відкритий вибір", sorcadinScenario, { 7: ["Absorb Elements"] }],
  ] as const)("%s", async (_label, scenario, openKnownSpells) => {
    const manualId = await createManually(scenario);
    const guidedId = await createAtFirstLevel(scenario);

    await runGuidedLevelUps(guidedId, scenario.targetLevel, openKnownSpells);

    expect(await readSheetState(guidedId)).toEqual(await readSheetState(manualId));
    expect(await countSnapshots(guidedId)).toBe(scenario.targetLevel - 1);
    expect(await prisma.pers.findUniqueOrThrow({ where: { persId: guidedId }, select: { sourceBuildId: true } })).toEqual({ sourceBuildId: scenario.buildId });
  });
});

describe("коли гайд не пропонується або недоступний", () => {
  it("персонаж без пресета не отримує гайда", async () => {
    const created = await createCharacter(await barbarianScenario.buildStart());
    if ("error" in created) throw new Error(created.error);

    expect(await loadGuidedLevelUp(created.persId)).toBeNull();
  });

  it("стара ревізія пресета пояснює недоступність і не підставляє нову", async () => {
    const persId = await createAtFirstLevel(barbarianScenario);
    await prisma.pers.update({ where: { persId }, data: { sourceBuildRevisionId: "build-barbarian-berserker-2014-v0" } });

    expect(await loadGuidedLevelUp(persId)).toMatchObject({ status: "unavailable", build: { title: expect.any(String) }, reason: expect.stringContaining("оновив") });
  });

  it("стара ревізія, яку нова лише продовжує, лишає гайд", async () => {
    const persId = await createAtFirstLevel(barbarianScenario);
    await prisma.pers.update({ where: { persId }, data: { sourceBuildRevisionId: "build-barbarian-berserker-2014-v2" } });

    expect(await loadGuidedLevelUp(persId)).toMatchObject({ status: "ready", nextLevel: 2 });
  });

  function archiveRevisionChangedAtFour(): BuildRecipe {
    const current = readRecipeFile(barbarianScenario.buildId);
    const changedAtFour = structuredClone(current);
    changedAtFour.revisionId = `${current.revisionId}-con-at-4`;
    changedAtFour.progression[3].decisions = { abilityScoreIncrease: [{ ability: "CON", amount: 2 }] };
    syntheticArchives.set(changedAtFour.revisionId, changedAtFour);
    return changedAtFour;
  }

  const readRevision = async (persId: number) =>
    (await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { sourceBuildRevisionId: true } })).sourceBuildRevisionId;

  it("стара ревізія з іншим планом 4-го рівня веде за новим планом і переносить персонажа на нову ревізію", async () => {
    const changedAtFour = archiveRevisionChangedAtFour();
    const persId = await createAtFirstLevel(barbarianScenario);
    await prisma.pers.update({ where: { persId }, data: { sourceBuildRevisionId: changedAtFour.revisionId } });
    await runManualLevelUpPath(persId, barbarianScenario.manualSteps.slice(0, 2));
    await prisma.pers.update({ where: { persId }, data: { sourceBuildRevisionId: changedAtFour.revisionId } });

    expect(await loadGuidedLevelUp(persId)).toMatchObject({ status: "ready", nextLevel: 4 });

    await runManualLevelUpPath(persId, barbarianScenario.manualSteps.slice(2, 3));
    expect(await readRevision(persId)).toBe(readRecipeFile(barbarianScenario.buildId).revisionId);
    expect(await loadGuidedLevelUp(persId)).toMatchObject({ status: "ready", nextLevel: 5 });
  });

  it("персонаж, що вже пройшов змінений рівень старої ревізії, лишається на ній і підвищується вручну", async () => {
    const changedAtFour = archiveRevisionChangedAtFour();
    const persId = await createAtFirstLevel(barbarianScenario);
    await runManualLevelUpPath(persId, barbarianScenario.manualSteps.slice(0, 3));
    await prisma.pers.update({ where: { persId }, data: { sourceBuildRevisionId: changedAtFour.revisionId } });

    expect(await loadGuidedLevelUp(persId)).toMatchObject({ status: "unavailable", reason: expect.stringContaining("з 4-го рівня") });

    await runManualLevelUpPath(persId, barbarianScenario.manualSteps.slice(3, 4));
    expect(await readRevision(persId)).toBe(changedAtFour.revisionId);
    expect(await loadGuidedLevelUp(persId)).toMatchObject({ status: "unavailable", reason: expect.stringContaining("з 4-го рівня") });
  });

  it("ручне підвищення в інший підклас робить гайд недоступним, але зберігає пресет", async () => {
    const persId = await createAtFirstLevel(barbarianScenario);
    await runManualLevelUpPath(persId, [barbarianScenario.manualSteps[0], { className: barbarianScenario.manualSteps[1].className, subclass: "PATH_OF_THE_ZEALOT" }]);

    expect(await loadGuidedLevelUp(persId)).toMatchObject({ status: "unavailable", reason: "Підклас персонажа відрізняється від плану пресета." });
    expect(await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { sourceBuildId: true } })).toEqual({ sourceBuildId: barbarianScenario.buildId });
  });

  it("уже відоме заклинання з плану пропускається з поясненням", async () => {
    const persId = await createAtFirstLevel(wizardScenario);
    const shield = await findSpellId("Shield");
    await prisma.persSpell.create({ data: { persId, spellId: shield, learnedAtLevel: 1 } });

    const guide = await loadGuidedLevelUp(persId);

    expect(guide?.status === "ready" && guide.input.classSpells?.spellbookIds).not.toContain(shield);
    expect(guide?.status === "ready" && guide.skipped.join(" ")).toContain("Щит");
  });
});
