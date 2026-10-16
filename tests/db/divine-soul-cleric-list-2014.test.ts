/**
 * XGtE, Divine Magic: Божественна душа бере замовляння й заклинання чародія також зі списку клірика —
 * при створенні, на підвищенні й заміною відомого. Обране лягає заклинанням чародія. Драконячий родовід
 * лишається зі списком чародія.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Classes, Subclasses } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { buildPresetStart } from "../helpers/assembly-scenarios";
import { minimalLevelUpForm } from "../helpers/levelup-form";
import { classByName, subclassByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { getCreationSpellOffer } from "@/lib/actions/class-actions";
import { getLevelUpSpellOffer, levelUpCharacter } from "@/lib/actions/levelup";

vi.setConfig({ testTimeout: 120_000 });

const CANTRIP_NOT_ON_LIST = "Обране замовляння не з вашого списку класу";
const SPELL_NOT_ON_LIST = "Обране заклинання не з вашого списку класу або зависокого рівня";

let spellIdByName: Map<string, number>;
let sorcererClassId: number;
let divineSoulId: number;

beforeAll(async () => {
  const rows = await prisma.spell.findMany({ where: { ruleset: "RULES_2014" }, select: { spellId: true, engName: true } });
  spellIdByName = new Map(rows.map((row) => [row.engName, row.spellId]));
  sorcererClassId = (await classByName(Classes.SORCERER_2014)).classId;
  divineSoulId = (await subclassByName(sorcererClassId, Subclasses.DIVINE_SOUL)).subclassId;
});
beforeEach(async () => {
  await resetUserData();
  const user = await prisma.user.create({ data: { email: `divine-soul-${Math.random()}@holota.family`, name: "Божественна душа" } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
});
afterAll(disconnectDatabase);

const spellId = (engName: string) => {
  const id = spellIdByName.get(engName);
  if (!id) throw new Error(`немає заклинання 2014 «${engName}»`);
  return id;
};

async function buildDraconicStart(): Promise<PersFormData> {
  return buildPresetStart("sorcerer-draconic-2014", "Драконячий родовід");
}

async function buildDivineSoulStart(): Promise<PersFormData> {
  return { ...(await buildDraconicStart()), name: "Божественна душа", subclassId: divineSoulId, subclassChoiceSelections: {}, classOptionSpellIds: [spellId("Bless")] };
}

function withClericPicks(form: PersFormData): PersFormData {
  const classSpells = form.classSpells!;
  return {
    ...form,
    classSpells: {
      ...classSpells,
      cantripIds: [spellId("Guidance"), ...classSpells.cantripIds.slice(1)],
      preparedIds: [spellId("Cure Wounds"), ...classSpells.preparedIds.slice(1)],
    },
  };
}

async function createOrThrow(form: PersFormData): Promise<number> {
  const created = await createCharacter(form);
  if ("error" in created) throw new Error(`не створився: ${created.error}`);
  return created.persId;
}

async function readSorcererRows(persId: number, engNames: string[]) {
  const rows = await prisma.persSpell.findMany({
    where: { persId, spell: { engName: { in: engNames } } },
    select: { origin: true, sourceName: true, badgeText: true, isPrepared: true, excludeFromPreparedCount: true, learnedAtLevel: true, spell: { select: { engName: true } } },
  });
  return rows
    .map((row) => [row.spell.engName, row.origin, row.sourceName, row.badgeText, row.isPrepared, row.excludeFromPreparedCount, row.learnedAtLevel])
    .sort((left, right) => String(left[0]).localeCompare(String(right[0])));
}

function learnHealingWord(swap?: { dropId: number; addId: number }) {
  return minimalLevelUpForm({
    classId: sorcererClassId,
    classSpells: { cantripIds: [], spellbookIds: [], preparedIds: [spellId("Healing Word")], ...(swap ? { preparedSwap: swap } : {}) },
  });
}

describe("Божественна душа 2014 бере заклинання й зі списку клірика", () => {
  it("конструктор пропонує замовляння й заклинання клірика з підписом списку, а Драконячому родоводу — ні", async () => {
    const divineSoulOffer = await getCreationSpellOffer(sorcererClassId, [], divineSoulId);
    const draconicOffer = await getCreationSpellOffer(sorcererClassId, [], (await buildDraconicStart()).subclassId ?? null);

    expect(divineSoulOffer?.spellListNote).toBe("зі свого списку й списку клірика (Божественна душа)");
    expect(divineSoulOffer?.cantrips.map((spell) => spell.engName)).toEqual(expect.arrayContaining(["Guidance", "Fire Bolt"]));
    expect(divineSoulOffer?.spells.map((spell) => spell.engName)).toEqual(expect.arrayContaining(["Cure Wounds", "Magic Missile"]));
    expect(draconicOffer?.spellListNote).toBe("зі свого списку");
    expect(draconicOffer?.cantrips.map((spell) => spell.engName)).not.toContain("Guidance");
    expect(draconicOffer?.spells.map((spell) => spell.engName)).not.toContain("Cure Wounds");
  });

  it("створення приймає Guidance і Cure Wounds як заклинання чародія", async () => {
    const persId = await createOrThrow(withClericPicks(await buildDivineSoulStart()));

    expect(await readSorcererRows(persId, ["Guidance", "Cure Wounds"])).toEqual([
      ["Cure Wounds", "CLASS", "SORCERER_2014", "Чародій", true, false, 1],
      ["Guidance", "CLASS", "SORCERER_2014", "Чародій", true, false, 1],
    ]);
  });

  it("Драконячий родовід замовляння й заклинання клірика при створенні не отримує", async () => {
    const draconic = await buildDraconicStart();
    const withClericCantrip = { ...draconic, classSpells: { ...draconic.classSpells!, cantripIds: withClericPicks(draconic).classSpells!.cantripIds } };
    const withClericSpell = { ...draconic, classSpells: { ...draconic.classSpells!, preparedIds: withClericPicks(draconic).classSpells!.preparedIds } };

    expect(await createCharacter(withClericCantrip)).toEqual({ error: CANTRIP_NOT_ON_LIST });
    expect(await createCharacter(withClericSpell)).toEqual({ error: SPELL_NOT_ON_LIST });
  });

  it("підвищення пропонує й приймає заклинання клірика, а заміна відомого бере заклинання клірика", async () => {
    const persId = await createOrThrow(withClericPicks(await buildDivineSoulStart()));
    const offer = await getLevelUpSpellOffer(persId, sorcererClassId, divineSoulId, [], []);
    expect(offer?.spells.map((spell) => spell.engName)).toEqual(expect.arrayContaining(["Healing Word", "Sanctuary"]));
    expect(offer?.swap?.droppableSpells.map((spell) => spell.engName)).toContain("Cure Wounds");

    expect(await levelUpCharacter(persId, learnHealingWord({ dropId: spellId("Cure Wounds"), addId: spellId("Sanctuary") }))).not.toHaveProperty("error");
    expect(await readSorcererRows(persId, ["Cure Wounds", "Healing Word", "Sanctuary"])).toEqual([
      ["Healing Word", "CLASS", "SORCERER_2014", "Чародій", true, false, 2],
      ["Sanctuary", "CLASS", "SORCERER_2014", "Чародій", true, false, 2],
    ]);
  });

  it("Драконячому родоводу підвищення заклинання клірика не приймає", async () => {
    const persId = await createOrThrow(await buildDraconicStart());

    expect(await levelUpCharacter(persId, learnHealingWord())).toEqual({ error: SPELL_NOT_ON_LIST });
  });
});
