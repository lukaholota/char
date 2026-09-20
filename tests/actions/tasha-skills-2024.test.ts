import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { disconnectDatabase, resetUserData } from "../user-data";
import { build2024Character } from "../helpers/build-2024-character";
import { findFixture } from "../fixtures/2024-acceptance";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";

vi.setConfig({ testTimeout: 120_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

const STALE_TASHA_DRAFT: PersFormData["skillsSchema"] = {
  isTasha: true,
  tashaChoices: ["STEALTH"],
  basicChoices: { race: [], selectedClass: ["ANIMAL_HANDLING", "SURVIVAL"], background: [] },
  choiceOptions: {},
};

describe("KR31.14 — режим Таші не діє в редакції 2024 (P6-class-sweep-level1-11)", () => {
  it("стара чернетка з увімкненим Таші не дає персонажу 2024 навичок із tashaChoices", async () => {
    await prisma.user.create({ data: { email: "tasha-2024@test.local", name: "Таша" } });
    vi.mocked(auth).mockResolvedValue({ user: { email: "tasha-2024@test.local" } } as never);
    const barbarian = findFixture("05-stone-goliath-barbarian-guard");

    const built = await build2024Character(
      { ...barbarian, input: { ...barbarian.input, levelUps: [] } },
      {
        createCharacter: (form) => createCharacter({ ...form, skillsSchema: STALE_TASHA_DRAFT }),
        levelUpCharacter: async () => undefined,
      },
    );
    if (!built.persId) throw new Error(built.creationError ?? "персонажа не створено");

    const skills = await prisma.persSkill.findMany({
      where: { persId: built.persId, proficiencyType: { not: "NONE" } },
      select: { name: true },
    });
    const names = skills.map((skill) => String(skill.name));
    expect(names).not.toContain("STEALTH");
    expect(names).toEqual(expect.arrayContaining(["ANIMAL_HANDLING", "SURVIVAL"]));
  });
});
