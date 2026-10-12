import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import { buildCharacterCreationOptions } from "@/lib/content/creator-content";
import { findCreatorContent } from "@/server/db/creator-content-query";
import { buildRecipeSchema } from "@/lib/optimization/schema";
import { buildReadyPresetDraft, readyPresetSchema } from "@/lib/optimization/ready-preset";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { auth } from "@/lib/auth";

const ownerEmail = "rpgbot-create-retry@actions.test";
const strangerEmail = "rpgbot-create-stranger@actions.test";

beforeEach(async () => {
  await resetUserData();
  await prisma.user.create({ data: { email: ownerEmail } });
  await prisma.user.create({ data: { email: strangerEmail } });
  signInAs(ownerEmail);
});
afterAll(disconnectDatabase);

function signInAs(email: string) {
  vi.mocked(auth).mockResolvedValue({ user: { email } } as never);
}

async function buildPresetInput(requestId?: string) {
  const preset = readyPresetSchema.parse(JSON.parse(readFileSync("data/rpgbot/ready-builds/monk-shadow-2014.json", "utf8")));
  const recipe = buildRecipeSchema.parse(JSON.parse(readFileSync(`data/rpgbot/builds/${preset.buildId}.json`, "utf8")));
  const content = buildCharacterCreationOptions(await findCreatorContent(prisma, "RULES_2014"));
  return { ...buildReadyPresetDraft(recipe, preset, content), name: "Атомарна перевірка пресета", ...(requestId ? { readyPresetRequestId: requestId } : {}) };
}

async function countCreationState() {
  return {
    pers: await prisma.pers.count(),
    skills: await prisma.persSkill.count(),
    weapons: await prisma.persWeapon.count(),
    operations: await prisma.pers_offline_operation.count({ where: { operation_kind: "ready_preset_create" } }),
  };
}

function failAfterCommitOnce() {
  const runTransaction = prisma.$transaction.bind(prisma);
  return vi.spyOn(prisma, "$transaction").mockImplementationOnce((async (callback: unknown, options?: unknown) => {
    await runTransaction(callback as never, options as never);
    throw new Error("Injected connection loss after commit");
  }) as never);
}

function failBeforeCommitOnce() {
  const runTransaction = prisma.$transaction.bind(prisma);
  return vi.spyOn(prisma, "$transaction").mockImplementationOnce(async (callback) => runTransaction(async (tx) => {
    if (typeof callback !== "function") throw new TypeError("Expected interactive transaction");
    await callback(tx);
    throw new Error("Injected failure immediately before commit");
  }));
}

describe("ready preset creation transaction", () => {
  it("rolls back all character writes after a failure immediately before commit and permits retry", async () => {
    const input = await buildPresetInput();
    const transaction = failBeforeCommitOnce();
    const logging = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      expect(await createCharacter(input)).toEqual({ error: "Database error" });
      expect(await countCreationState()).toEqual({ pers: 0, skills: 0, weapons: 0, operations: 0 });
    } finally { transaction.mockRestore(); logging.mockRestore(); }
    expect(await createCharacter(input)).toHaveProperty("persId");
    expect(await prisma.pers.count()).toBe(1);
  });
});

describe("ready preset creation replay", () => {
  it("returns the same character for the same request id without writing anything twice", async () => {
    const input = await buildPresetInput(randomUUID());
    const first = await createCharacter(input);
    const afterFirst = await countCreationState();
    const second = await createCharacter(input);
    const third = await createCharacter({ ...input, name: "Інше імʼя при повторі" });
    expect(first).toHaveProperty("persId");
    expect(second).toEqual(first);
    expect(third).toEqual(first);
    expect(afterFirst.operations).toBe(1);
    expect(await countCreationState()).toEqual(afterFirst);
    const stored = await prisma.pers.findUniqueOrThrow({ where: { persId: first.persId! } });
    expect(stored.name).toBe("Атомарна перевірка пресета");
  });

  it("creates separate characters for different request ids and for requests without an id", async () => {
    const withFirstId = await createCharacter(await buildPresetInput(randomUUID()));
    const withSecondId = await createCharacter(await buildPresetInput(randomUUID()));
    const withoutId = await createCharacter(await buildPresetInput());
    const persIds = [withFirstId, withSecondId, withoutId].map((result) => result.persId);
    expect(new Set(persIds).size).toBe(3);
    expect(await countCreationState()).toMatchObject({ pers: 3, operations: 2 });
  });

  it("creates one character when the same request is submitted concurrently", async () => {
    const input = await buildPresetInput(randomUUID());
    const results = await Promise.all(Array.from({ length: 5 }, () => createCharacter(input)));
    const persIds = new Set(results.map((result) => result.persId));
    expect(results.every((result) => result.success === true)).toBe(true);
    expect(persIds.size).toBe(1);
    expect(await countCreationState()).toMatchObject({ pers: 1, operations: 1 });
  });

  it("returns the committed character when the response is lost after commit", async () => {
    const input = await buildPresetInput(randomUUID());
    const transaction = failAfterCommitOnce();
    const logging = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      expect(await createCharacter(input)).toEqual({ error: "Database error" });
    } finally { transaction.mockRestore(); logging.mockRestore(); }
    const committed = await countCreationState();
    expect(committed).toMatchObject({ pers: 1, operations: 1 });
    const retried = await createCharacter(input);
    expect(retried).toMatchObject({ success: true });
    expect(await countCreationState()).toEqual(committed);
    const [stored] = await prisma.pers.findMany();
    expect(retried.persId).toBe(stored.persId);
  });

  it("keeps the request id reusable after a rollback and creates exactly one character on retry", async () => {
    const input = await buildPresetInput(randomUUID());
    const transaction = failBeforeCommitOnce();
    const logging = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      expect(await createCharacter(input)).toEqual({ error: "Database error" });
      expect(await countCreationState()).toEqual({ pers: 0, skills: 0, weapons: 0, operations: 0 });
    } finally { transaction.mockRestore(); logging.mockRestore(); }
    const retried = await createCharacter(input);
    expect(retried).toMatchObject({ success: true });
    expect(await createCharacter(input)).toEqual(retried);
    expect(await countCreationState()).toMatchObject({ pers: 1, operations: 1 });
  });

  it("does not let another user replay or read the character of a request id", async () => {
    const requestId = randomUUID();
    const input = await buildPresetInput(requestId);
    const owned = await createCharacter(input);
    signInAs(strangerEmail);
    const stolen = await createCharacter(input);
    expect(stolen).toEqual({ error: "Не вдалося повторити створення персонажа." });
    const stranger = await prisma.user.findUniqueOrThrow({ where: { email: strangerEmail } });
    expect(await prisma.pers.count({ where: { userId: stranger.id } })).toBe(0);
    expect(await prisma.pers_offline_operation.count({ where: { user_id: stranger.id } })).toBe(0);
    signInAs(ownerEmail);
    expect(await createCharacter(input)).toEqual(owned);
    expect(await countCreationState()).toMatchObject({ pers: 1, operations: 1 });
  });

  it("rejects a request id that is not a UUID before writing", async () => {
    const input = await buildPresetInput("not-a-uuid");
    const result = await createCharacter(input);
    expect(result).toMatchObject({ error: "Validation failed" });
    expect(await countCreationState()).toEqual({ pers: 0, skills: 0, weapons: 0, operations: 0 });
  });
});
