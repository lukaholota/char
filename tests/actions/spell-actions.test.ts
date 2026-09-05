import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races, SpellOrigin } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import { setSpellPresenceForPers, setSpellPresenceForPersByLink } from "@/lib/actions/spell-actions";
import { getUserPersesSpellIndex } from "@/lib/actions/pers";
import { minimalForm } from "../helpers/build-form";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

describe("spell actions", () => {
  it("adds and removes a manual unprepared spell link", async () => {
    const user = await prisma.user.create({ data: { email: "spell-actions@golden.test", name: "Spell Actions Test User" } });
    vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
    const [race, characterClass, background, spell] = await Promise.all([
      raceByName(Races.HUMAN_2014), classByName(Classes.FIGHTER_2014), backgroundByName(BackgroundCategory.SOLDIER),
      prisma.spell.findFirstOrThrow({ select: { spellId: true } }),
    ]);
    const created = await createCharacter(minimalForm({ raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId }));
    if ("error" in created) throw new Error(created.error);

    await expect(setSpellPresenceForPers({ persId: created.persId, spellId: spell.spellId, present: true })).resolves.toEqual({ success: true, present: true });
    await expect(prisma.persSpell.findUniqueOrThrow({ where: { persId_spellId: { persId: created.persId, spellId: spell.spellId } } }))
      .resolves.toMatchObject({ origin: SpellOrigin.MANUAL, isPrepared: false });
    await expect(setSpellPresenceForPers({ persId: created.persId, spellId: spell.spellId, present: false })).resolves.toEqual({ success: true, present: false });
  });

  // KR25.2: заклинання 2024 у каталозі має слаг, у базі — свій номер; звʼязок — `engName + ruleset`.
  it("adds a 2024 spell by slug link and reports it back as a slug key", async () => {
    const user = await prisma.user.create({ data: { email: "spell-actions-2024@golden.test", name: "Spell Actions 2024 Test User" } });
    vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
    const [race, characterClass, background, produceFlame2024] = await Promise.all([
      raceByName(Races.HUMAN_2014), classByName(Classes.FIGHTER_2014), backgroundByName(BackgroundCategory.SOLDIER),
      prisma.spell.findUniqueOrThrow({ where: { engName_ruleset: { engName: "Produce Flame", ruleset: "RULES_2024" } }, select: { spellId: true } }),
    ]);
    const created = await createCharacter(minimalForm({ raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId }));
    if ("error" in created) throw new Error(created.error);
    const link = { spellKey: "produce-flame", ruleset: "RULES_2024" as const };

    await expect(setSpellPresenceForPersByLink({ persId: created.persId, link, present: true }))
      .resolves.toEqual({ success: true, present: true, spellId: produceFlame2024.spellId });
    await expect(prisma.persSpell.findUniqueOrThrow({ where: { persId_spellId: { persId: created.persId, spellId: produceFlame2024.spellId } } }))
      .resolves.toMatchObject({ origin: SpellOrigin.MANUAL });
    const index = await getUserPersesSpellIndex();
    expect(index.find((p) => p.persId === created.persId)?.spellKeys).toEqual(["produce-flame"]);

    await expect(setSpellPresenceForPersByLink({ persId: created.persId, link: { spellKey: "no-such-spell", ruleset: "RULES_2024" }, present: true }))
      .resolves.toMatchObject({ success: false });
  });

  // D-003 (docs/o21-user-signals/defects.md): a stale client-side spell list can pass a spellId
  // that no longer exists, which used to throw an unhandled Prisma FK error instead of failing gracefully.
  it("reports failure instead of throwing when the spell does not exist", async () => {
    const user = await prisma.user.create({ data: { email: "spell-actions-missing@golden.test", name: "Spell Actions Missing Spell Test User" } });
    vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
    const [race, characterClass, background] = await Promise.all([
      raceByName(Races.HUMAN_2014), classByName(Classes.FIGHTER_2014), backgroundByName(BackgroundCategory.SOLDIER),
    ]);
    const created = await createCharacter(minimalForm({ raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId }));
    if ("error" in created) throw new Error(created.error);

    await expect(setSpellPresenceForPers({ persId: created.persId, spellId: -1, present: true }))
      .resolves.toMatchObject({ success: false });
  });
});
