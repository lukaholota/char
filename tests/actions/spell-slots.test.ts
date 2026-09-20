import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import {
  restorePactSlot,
  restoreSpellSlot,
  spendPactSlot,
  spendSpellSlot,
} from "@/lib/actions/spell-slots";
import { minimalForm } from "../helpers/build-form";
import { withCreationSpells } from "../helpers/creation-spells";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

describe("spell slot actions", () => {
  it("spends standard/Pact slots and restores only the current 2014 maxima", async () => {
    const user = await prisma.user.create({
      data: { email: "spell-slots@golden.test", name: "Spell Slots Test User" },
    });
    vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

    const [race, characterClass, background] = await Promise.all([
      raceByName(Races.HUMAN_2014),
      classByName(Classes.WARLOCK_2014),
      backgroundByName(BackgroundCategory.SAGE),
    ]);
    const created = await createCharacter(await withCreationSpells(minimalForm({ raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId })));
    if ("error" in created) throw new Error(created.error);

    await prisma.pers.update({
      where: { persId: created.persId },
      data: { currentSpellSlots: [1, 0, 0, 0, 0, 0, 0, 0, 0], currentPactSlots: 1 },
    });

    await expect(spendSpellSlot(created.persId, 1)).resolves.toEqual({
      success: true,
      currentSpellSlots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    });
    await expect(restoreSpellSlot(created.persId, 1)).resolves.toEqual({
      success: true,
      currentSpellSlots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    });
    await expect(spendPactSlot(created.persId)).resolves.toEqual({ success: true, currentPactSlots: 0 });
    await expect(restorePactSlot(created.persId)).resolves.toEqual({ success: true, currentPactSlots: 1 });
  });
});
