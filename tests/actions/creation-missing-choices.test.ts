import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { ALL_SIMPLE_ASI, minimalForm } from "../helpers/build-form";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";

vi.setConfig({ testTimeout: 60_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

describe("чернетка без класу й передісторії (стрибок на крок імені)", () => {
  it("повертає на перший незаповнений крок українською і нічого не пише", async () => {
    const user = await prisma.user.create({ data: { email: `missing-choices-${Math.random()}@holota.family`, name: "missing" } });
    vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
    const race = await raceByName(Races.HUMAN_2014);

    const draft = minimalForm({ raceId: race.raceId, classId: 0, backgroundId: 0 });
    Reflect.deleteProperty(draft, "classId");
    Reflect.deleteProperty(draft, "backgroundId");

    const result = await createCharacter(draft);

    expect(result).toMatchObject({ error: "Оберіть клас і передісторію.", fixAtSteps: ["class", "background"] });
    expect(await prisma.pers.count({ where: { userId: user.id } })).toBe(0);
  });
});

describe("залишок очок із вкладки «За очками» після переходу на іншу систему", () => {
  async function buildDraft(overrides: Partial<PersFormData>) {
    const user = await prisma.user.create({ data: { email: `leftover-points-${Math.random()}@holota.family`, name: "points" } });
    vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
    const [race, characterClass, background] = await Promise.all([
      raceByName(Races.HUMAN_2014),
      classByName(Classes.BARBARIAN_2014),
      backgroundByName(BackgroundCategory.SOLDIER),
    ]);

    return minimalForm({ raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId, ...overrides });
  }

  it("«Просто» з відʼємним залишком очок створює персонажа", async () => {
    const draft = await buildDraft({ asiSystem: "SIMPLE", points: -3, simpleAsi: ALL_SIMPLE_ASI });

    const result = await createCharacter(draft);

    expect(result).toMatchObject({ success: true });
  });

  it("«За очками» з перевитратою повертає на крок характеристик українською", async () => {
    const draft = await buildDraft({ asiSystem: "POINT_BUY", points: -1 });

    const result = await createCharacter(draft);

    expect(result.fixAtSteps).toEqual(["asi"]);
    expect(result.error).toMatch(/[а-яіїє]/i);
    expect(result.error).not.toContain("Validation failed");
  });
});
