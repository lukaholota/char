/**
 * KR31.6 / L01-species-11 — навичка «Гострих чуттів» доїжджає серверною дією створення, навіть
 * коли крок «Навички» її не надіслав: фікстура 03 не передає `skillsSchema` взагалі.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase, resetUserData } from "../user-data";
import { findFixture } from "../fixtures/2024-acceptance";
import { build2024Character, type Built2024Character } from "../helpers/build-2024-character";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { levelUpCharacter } from "@/lib/actions/levelup";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 600_000 });

let built: Built2024Character;

beforeAll(async () => {
  await resetUserData();
  const user = await prisma.user.create({ data: { email: "keen-senses@holota.family", name: "Ельф" } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

  const base = findFixture("03-high-elf-wizard-sage");
  const withKeenSenses = {
    ...base,
    input: {
      ...base.input,
      speciesChoices: [...(base.input.speciesChoices ?? []), { choice: "Keen Senses", option: "Perception" }],
    },
  };
  built = await build2024Character(withKeenSenses, { createCharacter, levelUpCharacter });
}, 600_000);

afterAll(disconnectDatabase);

describe("«Гострі чуття» 2024 на створенні", () => {
  it("персонаж створився", () => {
    expect(built.creationError).toBeNull();
  });

  it("обране Сприйняття стоїть у навичках персонажа 1-го рівня", () => {
    const perception = built.atLevel1?.skills.find((skill) => skill.name === "PERCEPTION");
    expect(perception?.proficiencyType).toBe("PROFICIENT");
  });
});
