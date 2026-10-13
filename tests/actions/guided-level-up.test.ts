import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import { levelUpCharacter } from "@/lib/actions/levelup";
import { loadGuidedLevelUp } from "@/server/db/guided-level-up";
import { disconnectDatabase, resetUserData } from "../user-data";
import { countSnapshots, readSheetState, runManualLevelUpPath } from "../helpers/assembly-manual-path";
import { barbarianScenario, readRecipeFile, sorcadinScenario, wizardScenario, type AssemblyScenario } from "../helpers/assembly-scenarios";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
import { auth } from "@/lib/auth";

vi.setConfig({ testTimeout: 180_000 });

/// KR49.11: підвищення «За гайдом» — це той самий `levelUpCharacter` із рішеннями наступного рівня
/// рецепта. Персонаж, піднятий так, має збігатися з ручним проходженням тих самих рішень.

const EMAIL = "guided-level-up@actions.test";

beforeEach(async () => {
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
    const classSpells = guide.input.classSpells && { ...guide.input.classSpells, preparedIds: [...guide.input.classSpells.preparedIds, ...chosenIds] };
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
