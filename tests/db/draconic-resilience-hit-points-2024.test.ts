/**
 * KR31.6 — хіти від фіч за рівень мають область. Дворфська витривалість — за кожен рівень
 * персонажа; Драконяча живучість 2024 — «+3, і ще +1 за кожен наступний рівень Чародія», тобто
 * лише за рівні Чародія, заднім числом на рівні, де фіча відкрилася.
 *
 * Фікстура 23: дворф, Монах 4 / Чародій-дракон 4, СТА 12, хіти середнім кубиком.
 *   Монах:   (8 + 1) + 3 × (5 + 1) = 27
 *   Чародій: 4 × (4 + 1)            = 20
 *   Дворфська витривалість: 8 × 1   =  8
 *   Драконяча живучість: 3 + 1      =  4
 */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase, resetUserData } from "../user-data";
import { findMulticlassFixture } from "../fixtures/2024-multiclass";
import {
  build2024MulticlassCharacter,
  type Built2024MulticlassCharacter,
} from "../helpers/build-2024-multiclass-character";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
vi.mock("@/lib/content/creator-content", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/content/creator-content")>()),
  findCharacterCreatorOptions: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { findCharacterCreatorOptions } from "@/lib/content/creator-content";
import { createCharacter } from "@/lib/actions/character";
import { getLevelUpInfo, levelUpCharacter } from "@/lib/actions/levelup";
import { findCreatorContent } from "@/server/db/creator-content-query";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 600_000 });

let built: Built2024MulticlassCharacter;

beforeAll(async () => {
  const content = await findCreatorContent(prisma, "RULES_2024");
  vi.mocked(findCharacterCreatorOptions).mockReturnValue(content);
  await resetUserData();

  const user = await prisma.user.create({ data: { email: "draconic-resilience@holota.family", name: "Чародій" } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

  built = await build2024MulticlassCharacter(findMulticlassFixture("23-dwarf-monk4-sorcerer4"), {
    createCharacter,
    levelUpCharacter,
    getLevelUpInfo,
  });
}, 600_000);

afterAll(disconnectDatabase);

describe("Драконяча живучість 2024 у мультикласі", () => {
  it("персонаж зібрався без помилок", () => {
    expect(built.creationError).toBeNull();
    expect(built.levelUpErrors).toEqual([]);
  });

  it("Монах 4 / Чародій-дракон 4 з дворфською витривалістю має 59 хітів", async () => {
    const pers = await prisma.pers.findUniqueOrThrow({ where: { persId: built.persId ?? -1 }, select: { maxHp: true } });

    expect(pers.maxHp).toBe(59);
  });
});
