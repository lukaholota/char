import { afterAll, describe, expect, it } from "vitest";
import { Classes } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { findClassSpellProblem, loadClassSpellOffer } from "@/server/db/class-spell-choices";
import { disconnectDatabase } from "../user-data";

afterAll(disconnectDatabase);

async function loadBardOffer(classLevel: number) {
  const bard = await prisma.class.findFirstOrThrow({ where: { name: Classes.BARD_2024 }, select: { classId: true } });
  const input = { classId: bard.classId, classLevel, subclassId: null, chosenClassOptionIds: [], persId: null };
  const offer = await loadClassSpellOffer(prisma, input);
  if (!offer) throw new Error(`бард ${classLevel}-го рівня нічого не обирає`);
  return { input, offer, names: (spells: { engName: string }[]) => spells.map((spell) => spell.engName) };
}

describe("KR31.5 — Магічні таємниці барда 2024 у списку кроку й на сервері (L05-class-choices-13)", () => {
  it("бард 10-го рівня бачить Вогняну кулю й Настанову, а 9-го — ні; замовляння лишаються бардівськими", async () => {
    const nine = await loadBardOffer(9);
    const ten = await loadBardOffer(10);

    expect(nine.names(nine.offer.spells)).not.toContain("Fireball");
    expect(ten.names(ten.offer.spells)).toEqual(expect.arrayContaining(["Fireball", "Guiding Bolt", "Healing Word", "Moonbeam"]));
    expect(ten.names(ten.offer.spells)).not.toContain("Hunter's Mark");
    expect(ten.names(ten.offer.cantrips)).not.toContain("Fire Bolt");

    const fireball = ten.offer.spells.find((spell) => spell.engName === "Fireball")!;
    const preparedIds = [fireball.spellId, ...ten.offer.spells.filter((spell) => spell.spellId !== fireball.spellId).slice(0, ten.offer.quota.prepared - 1).map((spell) => spell.spellId)];
    const cantripIds = ten.offer.cantrips.slice(0, ten.offer.quota.cantrips).map((spell) => spell.spellId);
    const selection = { cantripIds, preparedIds, spellbookIds: [] };

    expect((await findClassSpellProblem(prisma, { ...ten.input, selection, unavailableSpellIds: [] })).problem).toBeNull();
    expect((await findClassSpellProblem(prisma, { ...nine.input, selection: { ...selection, cantripIds: nine.offer.cantrips.slice(0, nine.offer.quota.cantrips).map((spell) => spell.spellId), preparedIds: preparedIds.slice(0, nine.offer.quota.prepared) }, unavailableSpellIds: [] })).problem).toBe(
      "Обране заклинання не з вашого списку класу або зависокого рівня",
    );
  });
});
