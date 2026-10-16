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

const capture = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/monitoring/posthog-server", () => ({ captureServerPostHogEvent: capture }));
import { auth } from "@/lib/auth";

const email = "character-created-analytics@actions.test";
const sessionId = "0192a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5c";
const creationAttemptId = "4f6c1d8e-2a3b-4c5d-9e8f-7a6b5c4d3e2f";

beforeEach(async () => {
  capture.mockReset();
  await resetUserData();
  await prisma.user.create({ data: { email } });
  vi.mocked(auth).mockResolvedValue({ user: { email } } as never);
});
afterAll(disconnectDatabase);

async function buildPresetInput(requestId: string) {
  const preset = readyPresetSchema.parse(JSON.parse(readFileSync("data/rpgbot/ready-builds/monk-shadow-2014.json", "utf8")));
  const recipe = buildRecipeSchema.parse(JSON.parse(readFileSync(`data/rpgbot/builds/${preset.buildId}.json`, "utf8")));
  const content = buildCharacterCreationOptions(await findCreatorContent(prisma, "RULES_2014"));
  return { ...buildReadyPresetDraft(recipe, preset, content), name: "Аналітика створення", readyPresetRequestId: requestId };
}

function findCreatedEvents() {
  return capture.mock.calls.filter(([event]) => event === "character_created");
}

describe("character_created", () => {
  it("is sent once per character even for concurrent and repeated submits", async () => {
    const input = await buildPresetInput(randomUUID());
    const results = await Promise.all(Array.from({ length: 3 }, () => createCharacter(input, { sessionId, creationAttemptId })));
    await createCharacter(input, { sessionId, creationAttemptId });

    expect(new Set(results.map((result) => result.persId)).size).toBe(1);
    expect(findCreatedEvents()).toHaveLength(1);
    const [, properties, user] = findCreatedEvents()[0];
    expect(properties).toMatchObject({ pers_id: results[0].persId, creation_type: "ready_preset", $session_id: sessionId, creation_attempt_id: creationAttemptId });
    expect(user).toMatchObject({ email });
  });

  it("drops analytics context that is not a short id", async () => {
    const input = await buildPresetInput(randomUUID());
    await createCharacter(input, { sessionId: email, creationAttemptId: "<script>" });

    const [, properties] = findCreatedEvents()[0];
    expect(properties).not.toHaveProperty("$session_id");
    expect(properties).not.toHaveProperty("creation_attempt_id");
    expect(JSON.stringify(properties)).not.toContain(email);
  });
});
