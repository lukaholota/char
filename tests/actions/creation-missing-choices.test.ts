import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Races } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { minimalForm } from "../helpers/build-form";
import { raceByName } from "../helpers/seed-lookup";
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
