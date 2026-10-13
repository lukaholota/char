import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { createCharacter, createCharacterFromBuild } from "@/lib/actions/character";
import { disconnectDatabase, resetUserData } from "../user-data";
import { countSnapshots, readSheetState, runManualLevelUpPath } from "../helpers/assembly-manual-path";
import { barbarianScenario, druidScenario, readRecipeFile, sorcadinScenario, wizardScenario, type AssemblyScenario } from "../helpers/assembly-scenarios";
import { failAfterCommitOnce, failBeforeCommitOnce } from "../helpers/transaction-faults";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
import { auth } from "@/lib/auth";

vi.setConfig({ testTimeout: 120_000 });

const ownerEmail = "assembly-owner@actions.test";
const strangerEmail = "assembly-stranger@actions.test";
const sorcadinOpenSelection = { characterLevel: 7, knownSpellKeys: ["absorb-elements"] };

beforeEach(async () => {
  await resetUserData();
  await prisma.user.create({ data: { email: ownerEmail } });
  await prisma.user.create({ data: { email: strangerEmail } });
  signInAs(ownerEmail);
});
afterAll(disconnectDatabase);

function signInAs(email: string | null) {
  vi.mocked(auth).mockResolvedValue((email ? { user: { email } } : null) as never);
}

async function buildRequest(scenario: AssemblyScenario, overrides: Record<string, unknown> = {}) {
  const recipe = readRecipeFile(scenario.buildId);
  return {
    buildId: recipe.buildId, revisionId: recipe.revisionId, targetLevel: scenario.targetLevel, requestId: randomUUID(),
    start: await scenario.buildStart(), openSelections: [], ...overrides,
  };
}

async function countAssemblyState() {
  return {
    pers: await prisma.pers.count(),
    multiclasses: await prisma.persMulticlass.count(),
    spells: await prisma.persSpell.count(),
    features: await prisma.persFeature.count(),
    feats: await prisma.persFeat.count(),
    operations: await prisma.pers_offline_operation.count({ where: { operation_kind: "build_assembly_create" } }),
  };
}

const EMPTY_STATE = { pers: 0, multiclasses: 0, spells: 0, features: 0, feats: 0, operations: 0 };

async function createAssembled(scenario: AssemblyScenario, overrides: Record<string, unknown> = {}) {
  const created = await createCharacterFromBuild(await buildRequest(scenario, overrides));
  if ("error" in created) throw new Error(`${created.error} ${JSON.stringify(created.details)}`);
  return created.persId;
}

async function createManually(scenario: AssemblyScenario) {
  const created = await createCharacter(await scenario.buildStart());
  if ("error" in created) throw new Error(created.error);
  await runManualLevelUpPath(created.persId, scenario.manualSteps);
  return created.persId;
}

describe("справжнє створення персонажа на вищому рівні з рецепта", () => {
  it("Варвар Шляху берсерка на 5-му: той самий стан, що й ручні create + 4 підвищення, без знімків", async () => {
    const manualState = await readSheetState(await createManually(barbarianScenario));
    const persId = await createAssembled(barbarianScenario);
    const state = await readSheetState(persId);

    expect(state).toEqual(manualState);
    expect(state).toMatchObject({ level: 5, class: "BARBARIAN_2014", subclass: "PATH_OF_THE_BERSERKER", scores: { str: 18, dex: 14, con: 16, int: 8, wis: 10, cha: 10 }, hp: { current: 55, max: 55 }, multiclasses: [] });
    expect(state.features).toEqual(expect.arrayContaining(["Barbarian Extra Attack", "Fast Movement", "Frenzy", "Primal Path", "Reckless Attack", "Danger Sense"]));
    expect(await countSnapshots(persId)).toBe(0);
    expect(await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { userId: true, ruleset: true, isSnapshot: true } })).toMatchObject({ ruleset: "RULES_2014", isSnapshot: false });
  });

  it("Чарівник школи втілення на 5-му: книга, замовлення, слоти й learnedAtLevel за рівнем, на якому їх дає таблиця", async () => {
    const manualState = await readSheetState(await createManually(wizardScenario));
    const persId = await createAssembled(wizardScenario);
    const state = await readSheetState(persId);

    expect(state).toEqual(manualState);
    expect(state).toMatchObject({ level: 5, subclass: "SCHOOL_OF_EVOCATION", scores: { int: 18 }, hp: { max: 32 }, spellSlots: { current: [4, 3, 2, 0, 0, 0, 0, 0, 0] } });
    const learnedAt = Object.fromEntries(state.spells.map((row) => [row.spell, row.learnedAtLevel]));
    expect(learnedAt).toMatchObject({ "Magic Missile": 1, Identify: 2, Shield: 2, "Scorching Ray": 3, Shatter: 3, "Fire Bolt": 4, "Flaming Sphere": 4, "Misty Step": 4, Fireball: 5, Fly: 5 });
    expect(state.spells.filter((row) => row.spell === "Fireball")).toEqual([expect.objectContaining({ origin: "CLASS", sourceName: "WIZARD_2014", isPrepared: false })]);
  });

  it("Чарівник: підготовлені заклинання вибирає гравець з книги в межах Інтелекту й рівня, решта книги стає непідготовленою", async () => {
    const preparedSpellKeys = ["fireball", "shield", "magic-missile", "fly", "mage-armor", "misty-step", "burning-hands", "scorching-ray", "detect-magic"];
    const persId = await createAssembled(wizardScenario, { preparedSpellKeys });
    const state = await readSheetState(persId);
    const prepared = state.spells.filter((row) => row.isPrepared && row.level > 0).map((row) => row.spell).sort();
    expect(prepared).toEqual(["Burning Hands", "Detect Magic", "Fireball", "Fly", "Mage Armor", "Magic Missile", "Misty Step", "Scorching Ray", "Shield"]);
    expect(state.spells.find((row) => row.spell === "Acid Splash")?.isPrepared).toBe(true);
  });

  it("Чарівник: забагато або чужих підготовлених заклинань відхиляється разом з усім створенням", async () => {
    const tooMany = ["fireball", "shield", "magic-missile", "fly", "mage-armor", "misty-step", "burning-hands", "scorching-ray", "detect-magic", "shatter"];
    expect(await createCharacterFromBuild(await buildRequest(wizardScenario, { preparedSpellKeys: tooMany }))).toMatchObject({ error: expect.stringContaining("Забагато") });
    expect(await createCharacterFromBuild(await buildRequest(wizardScenario, { preparedSpellKeys: ["no-such-spell"] }))).toMatchObject({ error: expect.stringContaining("План білда не виконується") });
    expect(await createCharacterFromBuild(await buildRequest(wizardScenario, { preparedSpellKeys: ["wish"] }))).toMatchObject({ error: expect.stringContaining("лише заклинання з книги") });
    expect(await countAssemblyState()).toEqual(EMPTY_STATE);
  });

  it("Друїд: підготовку на вищому рівні вибирає гравець зі списку класу до найвищого кола, вона замінює стартову, а персонаж памʼятає свій білд", async () => {
    const druidOpenSelections = [{ characterLevel: 4, cantripKeys: ["shillelagh"] }];
    const preparedSpellKeys = ["healing-word", "moonbeam", "conjure-animals", "polymorph"];
    const persId = await createAssembled(druidScenario, { openSelections: druidOpenSelections, preparedSpellKeys });
    const prepared = await prisma.persSpell.findMany({
      where: { persId, origin: "CLASS", sourceName: "DRUID_2014", excludeFromPreparedCount: false, spell: { level: { gt: 0 } } },
      select: { isPrepared: true, spell: { select: { engName: true } } },
    });
    expect(prepared.map((row) => row.spell.engName).sort()).toEqual(["Conjure Animals", "Healing Word", "Moonbeam", "Polymorph"]);
    expect(prepared.every((row) => row.isPrepared)).toBe(true);
    const recipe = readRecipeFile(druidScenario.buildId);
    expect(await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { sourceBuildId: true, sourceBuildRevisionId: true } }))
      .toEqual({ sourceBuildId: recipe.buildId, sourceBuildRevisionId: recipe.revisionId });
  });

  it("Друїд: заклинання вище доступного кола або більше за Мудрість і рівень відхиляються разом з усім створенням", async () => {
    const openSelections = [{ characterLevel: 4, cantripKeys: ["shillelagh"] }];
    const tooMany = ["healing-word", "moonbeam", "conjure-animals", "polymorph", "entangle", "goodberry", "thunderwave", "barkskin", "pass-without-trace", "call-lightning", "plant-growth", "stoneskin"];
    expect(await createCharacterFromBuild(await buildRequest(druidScenario, { openSelections, preparedSpellKeys: tooMany }))).toMatchObject({ error: expect.stringContaining("Забагато") });
    expect(await createCharacterFromBuild(await buildRequest(druidScenario, { openSelections, preparedSpellKeys: ["mass-cure-wounds"] }))).toMatchObject({ error: expect.stringContaining("доступних рівнів") });
    expect(await prisma.pers.count()).toBe(0);
  });

  it("готовий персонаж 1-го рівня памʼятає білд лише разом із ключем пресета й лише відомий білд", async () => {
    const start = await wizardScenario.buildStart();
    const recipe = readRecipeFile(wizardScenario.buildId);
    const sourceOf = async (input: Record<string, unknown>) => {
      const created = await createCharacter({ ...start, ...input });
      if ("error" in created) throw new Error(created.error);
      return prisma.pers.findUniqueOrThrow({ where: { persId: created.persId }, select: { sourceBuildId: true, sourceBuildRevisionId: true } });
    };
    expect(await sourceOf({ readyPresetRequestId: randomUUID(), readyPresetBuildId: recipe.buildId })).toEqual({ sourceBuildId: recipe.buildId, sourceBuildRevisionId: recipe.revisionId });
    expect(await sourceOf({ readyPresetRequestId: randomUUID(), readyPresetBuildId: "build-no-such-2014" })).toEqual({ sourceBuildId: null, sourceBuildRevisionId: null });
    expect(await sourceOf({ readyPresetBuildId: recipe.buildId })).toEqual({ sourceBuildId: null, sourceBuildRevisionId: null });
  });

  it("соркадін Паладин 3 / Чародій 4: порядок мультикласу, підкласи, Метамагія, риса на 4-му рівні Чародія", async () => {
    const manualState = await readSheetState(await createManually(sorcadinScenario));
    const persId = await createAssembled(sorcadinScenario, { openSelections: [sorcadinOpenSelection] });
    const state = await readSheetState(persId);

    expect(state).toEqual(manualState);
    expect(state).toMatchObject({
      level: 7, class: "PALADIN_2014", subclass: "OATH_OF_REDEMPTION", hp: { max: 52 }, spellSlots: { current: [4, 3, 2, 0, 0, 0, 0, 0, 0] },
      multiclasses: [{ class: "SORCERER_2014", subclass: "CLOCKWORK_SOUL", classLevel: 4 }],
      choiceOptions: ["Dueling", "Heightened Spell", "Quickened Spell"],
      feats: [{ name: "POLEARM_MASTER", choices: [] }, { name: "WAR_CASTER", choices: [] }],
    });
    const learnedAt = Object.fromEntries(state.spells.map((row) => [row.spell, row.learnedAtLevel]));
    expect(learnedAt).toMatchObject({ Sanctuary: 3, Sleep: 3, "Booming Blade": 4, "Silvery Barbs": 4, Shield: 5, "Misty Step": 6, "Sword Burst": 7, "Absorb Elements": 7 });
  });

  it("цільовий перший рівень створює лише старт і теж записує ключ повтору", async () => {
    const persId = await createAssembled(barbarianScenario, { targetLevel: 1 });
    expect(await readSheetState(persId)).toMatchObject({ level: 1, subclass: null, multiclasses: [] });
    expect(await countAssemblyState()).toMatchObject({ pers: 1, operations: 1 });
  });

  it("проміжний цільовий рівень зупиняється рівно на ньому, а майбутні гранти не видаються", async () => {
    const persId = await createAssembled(wizardScenario, { targetLevel: 3 });
    const state = await readSheetState(persId);
    expect(state).toMatchObject({ level: 3, subclass: "SCHOOL_OF_EVOCATION", scores: { int: 16 } });
    expect(state.spells.map((row) => row.spell)).not.toEqual(expect.arrayContaining(["Fireball"]));
    expect(state.spells.find((row) => row.spell === "Shatter")?.learnedAtLevel).toBe(3);
    expect(state.spells.some((row) => row.spell === "Fire Bolt")).toBe(false);
  });
});

describe("сервер не довіряє клієнтському плану", () => {
  it.each([
    ["невідомий білд", { buildId: "build-nothing-2014" }, "не знайдено"],
    ["чужа ревізія рецепта", { revisionId: "build-barbarian-berserker-2014-v1" }, "не знайдено"],
    ["рівень поза підтриманими", { targetLevel: 6 }, "План білда не виконується"],
    ["нульовий рівень", { targetLevel: 0 }, "Validation failed"],
    ["ключ повтору не UUID", { requestId: "not-a-uuid" }, "Validation failed"],
    ["клієнтський перелік кроків", { steps: [{ characterLevel: 2, classKey: "WIZARD_2014" }] }, "Validation failed"],
    ["клієнтські level-up входи", { levelUps: [{ classId: 1 }] }, "Validation failed"],
  ])("відхиляє %s і нічого не пише", async (_name, overrides, message) => {
    const result = await createCharacterFromBuild(await buildRequest(barbarianScenario, overrides));
    expect(result).toMatchObject({ error: expect.stringContaining(message) });
    expect(await countAssemblyState()).toEqual(EMPTY_STATE);
  });

  it("відхиляє старт іншого класу, іншої редакції та старт із власним ключем створення пресета", async () => {
    const wizardStart = await wizardScenario.buildStart();
    expect(await createCharacterFromBuild(await buildRequest(barbarianScenario, { start: wizardStart }))).toMatchObject({ error: "Стартовий клас не збігається з білдом" });
    expect(await createCharacterFromBuild(await buildRequest(barbarianScenario, { start: { ...(await barbarianScenario.buildStart()), ruleset: "RULES_2024" } }))).toMatchObject({ error: expect.stringContaining("Редакція") });
    expect(await createCharacterFromBuild(await buildRequest(barbarianScenario, { start: { ...(await barbarianScenario.buildStart()), readyPresetRequestId: randomUUID() } }))).toMatchObject({ error: expect.stringContaining("власний ключ") });
    expect(await countAssemblyState()).toEqual(EMPTY_STATE);
  });

  it("відхиляє некоректний старт тією самою валідацією, що й ручне створення", async () => {
    const start = await barbarianScenario.buildStart();
    const result = await createCharacterFromBuild(await buildRequest(barbarianScenario, { start: { ...start, raceId: -1 } }));
    expect(result).toHaveProperty("error");
    expect(await countAssemblyState()).toEqual(EMPTY_STATE);
  });

  it("не пускає невиконаний вибір, чужу заміну рішення рецепта й невідоме заклинання", async () => {
    expect(await createCharacterFromBuild(await buildRequest(sorcadinScenario))).toMatchObject({ error: expect.stringContaining("потрібно обрати 1, отримано 0") });
    expect(await createCharacterFromBuild(await buildRequest(sorcadinScenario, { openSelections: [{ characterLevel: 5, knownSpellKeys: ["shield"] }, sorcadinOpenSelection] }))).toMatchObject({ error: expect.stringContaining("отримано 1") });
    expect(await createCharacterFromBuild(await buildRequest(sorcadinScenario, { openSelections: [{ characterLevel: 7, knownSpellKeys: ["no-such-spell"] }] }))).toMatchObject({ error: expect.stringContaining("Немає заклинання") });
    expect(await countAssemblyState()).toEqual(EMPTY_STATE);
  });

  it("потребує входу в обліковий запис", async () => {
    signInAs(null);
    expect(await createCharacterFromBuild(await buildRequest(barbarianScenario))).toEqual({ error: "Unauthorized" });
    expect(await countAssemblyState()).toEqual(EMPTY_STATE);
  });
});

describe("одна транзакція, відкат і повтор", () => {
  it("помилка середнього кроку прогресії відкочує увесь персонаж, а виправлений повтор з тим самим ключем створює одного", async () => {
    const requestId = randomUUID();
    const wrongSpell = { characterLevel: 7, knownSpellKeys: ["fireball"] };
    const failed = await createCharacterFromBuild(await buildRequest(sorcadinScenario, { requestId, openSelections: [wrongSpell] }));
    expect(failed).toMatchObject({ error: expect.stringContaining("Рівень 7"), details: { characterLevel: 7 } });
    expect(await countAssemblyState()).toEqual(EMPTY_STATE);

    const retried = await createCharacterFromBuild(await buildRequest(sorcadinScenario, { requestId, openSelections: [sorcadinOpenSelection] }));
    expect(retried).toMatchObject({ success: true });
    expect(await countAssemblyState()).toMatchObject({ pers: 1, multiclasses: 1, operations: 1 });
    expect(await readSheetState((retried as { persId: number }).persId)).toMatchObject({ level: 7 });
  });

  it("збій перед фіксацією відкочує все, а повтор створює рівно одного персонажа", async () => {
    const request = await buildRequest(wizardScenario);
    const transaction = failBeforeCommitOnce();
    const logging = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      expect(await createCharacterFromBuild(request)).toEqual({ error: "Database error" });
      expect(await countAssemblyState()).toEqual(EMPTY_STATE);
    } finally { transaction.mockRestore(); logging.mockRestore(); }
    const retried = await createCharacterFromBuild(request);
    expect(retried).toMatchObject({ success: true });
    expect(await createCharacterFromBuild(request)).toEqual(retried);
    expect(await countAssemblyState()).toMatchObject({ pers: 1, operations: 1 });
  });

  it("транзакція, що спливла за часом, повертає зрозуміле повідомлення, нічого не лишає, а повтор створює одного", async () => {
    const request = await buildRequest(wizardScenario);
    const expired = new Prisma.PrismaClientKnownRequestError("Transaction already closed", { code: "P2028", clientVersion: "7.3.0" });
    const transaction = vi.spyOn(prisma, "$transaction").mockRejectedValueOnce(expired);
    const logging = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      expect(await createCharacterFromBuild(request)).toEqual({ error: expect.stringContaining("Нічого не збережено") });
      expect(await countAssemblyState()).toEqual(EMPTY_STATE);
    } finally { transaction.mockRestore(); logging.mockRestore(); }
    expect(await createCharacterFromBuild(request)).toMatchObject({ success: true });
  });

  it("втрата відповіді після фіксації: повтор повертає вже створеного персонажа без другого запису", async () => {
    const request = await buildRequest(barbarianScenario);
    const transaction = failAfterCommitOnce();
    const logging = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      expect(await createCharacterFromBuild(request)).toEqual({ error: "Database error" });
    } finally { transaction.mockRestore(); logging.mockRestore(); }
    const committed = await countAssemblyState();
    expect(committed).toMatchObject({ pers: 1, operations: 1 });
    const retried = await createCharacterFromBuild(request);
    expect(retried).toMatchObject({ success: true });
    expect(await countAssemblyState()).toEqual(committed);
    const [stored] = await prisma.pers.findMany();
    expect((retried as { persId: number }).persId).toBe(stored.persId);
    expect(stored.level).toBe(5);
  });

  it("повтор з тим самим ключем нічого не пише і повертає того самого персонажа, інший ключ дає другого", async () => {
    const request = await buildRequest(barbarianScenario);
    const first = await createCharacterFromBuild(request);
    const afterFirst = await countAssemblyState();
    expect(await createCharacterFromBuild(request)).toEqual(first);
    expect(await createCharacterFromBuild({ ...request, targetLevel: 3 })).toEqual(first);
    expect(await countAssemblyState()).toEqual(afterFirst);
    const second = await createCharacterFromBuild({ ...request, requestId: randomUUID() });
    expect(second).toMatchObject({ success: true });
    expect((second as { persId: number }).persId).not.toBe((first as { persId: number }).persId);
  });

  it("паралельні запити з одним ключем створюють одного персонажа", async () => {
    const request = await buildRequest(barbarianScenario);
    const results = await Promise.all(Array.from({ length: 4 }, () => createCharacterFromBuild(request)));
    expect(results.every((result) => "success" in result && result.success === true)).toBe(true);
    expect(new Set(results.map((result) => (result as { persId: number }).persId)).size).toBe(1);
    expect(await countAssemblyState()).toMatchObject({ pers: 1, operations: 1 });
  });

  it("інший користувач не може повторити чужий ключ і не отримує чужого персонажа", async () => {
    const request = await buildRequest(barbarianScenario);
    const owned = await createCharacterFromBuild(request);
    signInAs(strangerEmail);
    expect(await createCharacterFromBuild(request)).toEqual({ error: "Не вдалося повторити створення персонажа." });
    const stranger = await prisma.user.findUniqueOrThrow({ where: { email: strangerEmail } });
    expect(await prisma.pers.count({ where: { userId: stranger.id } })).toBe(0);
    expect(await prisma.pers_offline_operation.count({ where: { user_id: stranger.id } })).toBe(0);
    signInAs(ownerEmail);
    expect(await createCharacterFromBuild(request)).toEqual(owned);
    const owner = await prisma.user.findUniqueOrThrow({ where: { email: ownerEmail } });
    expect(await prisma.pers.count({ where: { userId: owner.id } })).toBe(1);
  });
});
