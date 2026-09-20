import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import {
  deleteMagicItem,
  toggleMagicItemForPers,
  updateMagicItem,
} from "@/lib/actions/magic-item-actions";
import { getUserPersesMagicItemIndex } from "@/lib/actions/pers";
import { minimalForm } from "../helpers/build-form";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

describe("magic item actions", () => {
  it("toggles all duplicate links off, creates one link, updates it, and deletes it", async () => {
    const user = await prisma.user.create({
      data: { email: "magic-item-actions@golden.test", name: "Magic Item Actions Test User" },
    });
    vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

    const [race, characterClass, background, magicItem] = await Promise.all([
      raceByName(Races.HUMAN_2014),
      classByName(Classes.FIGHTER_2014),
      backgroundByName(BackgroundCategory.SOLDIER),
      prisma.magicItem.findFirst({ where: { ruleset: "RULES_2014" }, select: { magicItemId: true } }),
    ]);
    if (!magicItem) throw new Error("Expected magic item content");
    const created = await createCharacter(
      minimalForm({ raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId }),
    );
    if ("error" in created) throw new Error(created.error);

    await prisma.persMagicItem.createMany({
      data: [
        { persId: created.persId, magicItemId: magicItem.magicItemId },
        { persId: created.persId, magicItemId: magicItem.magicItemId },
      ],
    });

    await expect(toggleMagicItemForPers({ persId: created.persId, magicItemId: magicItem.magicItemId }))
      .resolves.toEqual({ success: true, added: false });
    await expect(prisma.persMagicItem.count({ where: { persId: created.persId, magicItemId: magicItem.magicItemId } }))
      .resolves.toBe(0);

    await expect(toggleMagicItemForPers({ persId: created.persId, magicItemId: magicItem.magicItemId }))
      .resolves.toEqual({ success: true, added: true });
    const link = await prisma.persMagicItem.findFirstOrThrow({ where: { persId: created.persId, magicItemId: magicItem.magicItemId } });

    await expect(updateMagicItem(link.persMagicItemId, { isEquipped: true, isAttuned: true }))
      .resolves.toMatchObject({ success: true, item: { isEquipped: true, isAttuned: true } });
    await expect(deleteMagicItem(link.persMagicItemId)).resolves.toEqual({ success: true });
    await expect(prisma.persMagicItem.count({ where: { persMagicItemId: link.persMagicItemId } })).resolves.toBe(0);
  });

  it("KR31.8 — предмет чужої редакції не додається, а персонаж чужої редакції не пропонується", async () => {
    const user = await prisma.user.create({
      data: { email: "magic-item-ruleset@golden.test", name: "Magic Item Ruleset Test User" },
    });
    vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

    const [race, characterClass, background, item2024] = await Promise.all([
      raceByName(Races.HUMAN_2014),
      classByName(Classes.FIGHTER_2014),
      backgroundByName(BackgroundCategory.SOLDIER),
      prisma.magicItem.findFirstOrThrow({ where: { ruleset: "RULES_2024" }, select: { magicItemId: true } }),
    ]);
    const created = await createCharacter(
      minimalForm({ raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId }),
    );
    if ("error" in created) throw new Error(created.error);

    await expect(toggleMagicItemForPers({ persId: created.persId, magicItemId: item2024.magicItemId }))
      .resolves.toMatchObject({ success: false });
    await expect(prisma.persMagicItem.count({ where: { persId: created.persId } })).resolves.toBe(0);

    expect((await getUserPersesMagicItemIndex("RULES_2024")).map((pers) => pers.persId)).toEqual([]);
    expect((await getUserPersesMagicItemIndex("RULES_2014")).map((pers) => pers.persId)).toEqual([created.persId]);
  });
});
