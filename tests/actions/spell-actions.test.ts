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
      prisma.spell.findFirstOrThrow({ where: { ruleset: "RULES_2014" }, select: { spellId: true } }),
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
      raceByName(Races.HUMAN_2024), classByName(Classes.FIGHTER_2024), backgroundByName(BackgroundCategory.SOLDIER),
      prisma.spell.findUniqueOrThrow({ where: { engName_ruleset: { engName: "Produce Flame", ruleset: "RULES_2024" } }, select: { spellId: true } }),
    ]);
    const created = await prisma.pers.create({
      data: {
        userId: user.id, name: "Воїн", ruleset: "RULES_2024", classId: characterClass.classId, raceId: race.raceId,
        backgroundId: background.backgroundId, level: 1, currentHp: 12, maxHp: 12, str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 10,
      },
    });
    const link = { spellKey: "produce-flame", ruleset: "RULES_2024" as const };

    await expect(setSpellPresenceForPersByLink({ persId: created.persId, link, present: true }))
      .resolves.toEqual({ success: true, present: true, spellId: produceFlame2024.spellId });
    await expect(prisma.persSpell.findUniqueOrThrow({ where: { persId_spellId: { persId: created.persId, spellId: produceFlame2024.spellId } } }))
      .resolves.toMatchObject({ origin: SpellOrigin.MANUAL });
    const index = await getUserPersesSpellIndex("RULES_2024");
    expect(index.find((p) => p.persId === created.persId)?.spellKeys).toEqual(["produce-flame"]);

    await expect(setSpellPresenceForPersByLink({ persId: created.persId, link: { spellKey: "no-such-spell", ruleset: "RULES_2024" }, present: true }))
      .resolves.toMatchObject({ success: false });
  });

  it("KR31.8 — заклинання чужої редакції не додається, а персонаж чужої редакції не пропонується", async () => {
    const user = await prisma.user.create({ data: { email: "spell-actions-ruleset@golden.test", name: "Spell Actions Ruleset Test User" } });
    vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
    const [race, characterClass, background] = await Promise.all([
      raceByName(Races.HUMAN_2014), classByName(Classes.FIGHTER_2014), backgroundByName(BackgroundCategory.SOLDIER),
    ]);
    const created = await createCharacter(minimalForm({ raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId }));
    if ("error" in created) throw new Error(created.error);

    await expect(setSpellPresenceForPersByLink({ persId: created.persId, link: { spellKey: "produce-flame", ruleset: "RULES_2024" }, present: true }))
      .resolves.toMatchObject({ success: false });
    await expect(prisma.persSpell.count({ where: { persId: created.persId } })).resolves.toBe(0);

    expect((await getUserPersesSpellIndex("RULES_2024")).map((pers) => pers.persId)).toEqual([]);
    expect((await getUserPersesSpellIndex("RULES_2014")).map((pers) => pers.persId)).toEqual([created.persId]);
  });

  it("KR31.5 — заклинання чужої редакції не додається й за номером (P2-elf-wizard-05)", async () => {
    const user = await prisma.user.create({ data: { email: "spell-actions-id-ruleset@golden.test", name: "Spell Actions Id Ruleset Test User" } });
    vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
    const [race, wizard, background, controlFlames, fireBolt2024] = await Promise.all([
      raceByName(Races.ELF_2024), classByName(Classes.WIZARD_2024), backgroundByName(BackgroundCategory.SAGE_2024),
      prisma.spell.findUniqueOrThrow({ where: { engName_ruleset: { engName: "Control Flames", ruleset: "RULES_2014" } }, select: { spellId: true } }),
      prisma.spell.findUniqueOrThrow({ where: { engName_ruleset: { engName: "Fire Bolt", ruleset: "RULES_2024" } }, select: { spellId: true } }),
    ]);
    const wizard2024 = await prisma.pers.create({
      data: {
        userId: user.id, name: "Чарівниця", ruleset: "RULES_2024", classId: wizard.classId, raceId: race.raceId,
        backgroundId: background.backgroundId, level: 1, currentHp: 6, maxHp: 6, str: 8, dex: 14, con: 13, int: 16, wis: 12, cha: 10,
      },
    });

    await expect(setSpellPresenceForPers({ persId: wizard2024.persId, spellId: controlFlames.spellId, present: true }))
      .resolves.toEqual({ success: false, error: "Це заклинання належить іншій редакції правил" });
    await expect(prisma.persSpell.count({ where: { persId: wizard2024.persId } })).resolves.toBe(0);

    await expect(setSpellPresenceForPers({ persId: wizard2024.persId, spellId: fireBolt2024.spellId, present: true }))
      .resolves.toEqual({ success: true, present: true });
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
