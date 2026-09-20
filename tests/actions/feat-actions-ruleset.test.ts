import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Feats, Races } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import { addFeatToPers } from "@/lib/actions/feat-actions";
import { minimalForm } from "../helpers/build-form";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

describe("KR31.8 / L16-ruleset-isolation-08 — риса листа за редакцією персонажа", () => {
  it("«Пильний» 2024 персонажу 2014 — відмова, «Пильний» 2014 — записаний", async () => {
    const user = await prisma.user.create({ data: { email: "feat-actions-ruleset@golden.test", name: "Feat Ruleset Test User" } });
    vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
    const [race, characterClass, background, alert2014, alert2024] = await Promise.all([
      raceByName(Races.HUMAN_2014),
      classByName(Classes.FIGHTER_2014),
      backgroundByName(BackgroundCategory.SOLDIER),
      prisma.feat.findUniqueOrThrow({ where: { name_ruleset: { name: Feats.ALERT, ruleset: "RULES_2014" } } }),
      prisma.feat.findUniqueOrThrow({ where: { name_ruleset: { name: Feats.ALERT, ruleset: "RULES_2024" } } }),
    ]);
    const created = await createCharacter(
      minimalForm({ raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId }),
    );
    if ("error" in created) throw new Error(created.error);

    await expect(addFeatToPers({ persId: created.persId, featId: alert2024.featId })).resolves.toMatchObject({ success: false });
    await expect(addFeatToPers({ persId: created.persId, featId: alert2014.featId })).resolves.toEqual({ success: true });

    const owned = await prisma.persFeat.findMany({ where: { persId: created.persId }, select: { featId: true } });
    expect(owned.map((row) => row.featId)).toEqual([alert2014.featId]);
  });
});
