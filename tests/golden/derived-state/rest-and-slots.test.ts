import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races, Subclasses } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase, resetUserData } from "../../user-data";
import { minimalForm } from "../../helpers/build-form";
import { withCreationSpells } from "../../helpers/creation-spells";
import { backgroundByName, classByName, raceByName } from "../../helpers/seed-lookup";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { longRest, shortRest } from "@/lib/actions/rest-actions";
import { restorePactSlot, restoreSpellSlot } from "@/lib/actions/spell-slots";

const GOLDEN_PATH = path.join(__dirname, "rest-and-slots.json");
const UPDATE_GOLDEN = process.env.UPDATE_GOLDEN === "1";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

describe("KR2.4 — golden для слотів і відпочинку", () => {
  it("фіксує відновлення стандартних і пактових слотів, включно з short/long rest", async () => {
    const wizardId = await createOwnedCharacter("wizard-slots", Classes.WIZARD_2014, BackgroundCategory.SAGE);
    const warlockId = await createOwnedCharacter("warlock-pact", Classes.WARLOCK_2014, BackgroundCategory.SAGE);
    const fighterId = await createOwnedCharacter("fighter-long-rest-BUG", Classes.FIGHTER_2014, BackgroundCategory.SOLDIER);
    const paladinId = await createOwnedCharacter("paladin-long-rest-BUG", Classes.PALADIN_2014, BackgroundCategory.SOLDIER);
    const eldritchKnightId = await createOwnedCharacter("eldritch-knight-long-rest-BUG", Classes.FIGHTER_2014, BackgroundCategory.SOLDIER);
    const multiclassId = await createOwnedCharacter("multiclass-long-rest-BUG", Classes.PALADIN_2014, BackgroundCategory.SOLDIER);
    const [eldritchKnight, wizardClass, fighterClass] = await Promise.all([
      prisma.subclass.findFirstOrThrow({ where: { name: Subclasses.ELDRITCH_KNIGHT }, select: { subclassId: true } }),
      classByName(Classes.WIZARD_2014),
      classByName(Classes.FIGHTER_2014),
    ]);

    await prisma.pers.update({
      where: { persId: wizardId },
      data: { currentSpellSlots: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
    });
    await prisma.pers.update({
      where: { persId: warlockId },
      data: { currentPactSlots: 0 },
    });
    await prisma.pers.update({
      where: { persId: fighterId },
      data: { level: 2, currentSpellSlots: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
    });
    await prisma.pers.updateMany({
      where: { persId: { in: [paladinId, eldritchKnightId, multiclassId] } },
      data: { currentSpellSlots: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
    });
    await prisma.pers.update({ where: { persId: paladinId }, data: { level: 6 } });
    await prisma.pers.update({ where: { persId: eldritchKnightId }, data: { level: 6, subclassId: eldritchKnight.subclassId } });
    await prisma.pers.update({ where: { persId: multiclassId }, data: { level: 8 } });
    await prisma.persMulticlass.createMany({
      data: [
        { persId: multiclassId, classId: wizardClass.classId, classLevel: 3 },
        { persId: multiclassId, classId: fighterClass.classId, subclassId: eldritchKnight.subclassId, classLevel: 3 },
      ],
    });

    await restoreSpellSlot(wizardId, 1);
    const wizardAfterFirstRestore = await readSlotState(wizardId);
    await restoreSpellSlot(wizardId, 1);
    const wizardAfterSecondRestore = await readSlotState(wizardId);

    await restorePactSlot(warlockId);
    const warlockAfterPactRestore = await readSlotState(warlockId);
    await shortRest(warlockId, []);
    const warlockAfterShortRest = await readSlotState(warlockId);

    await longRest(fighterId);
    const fighterAfterLongRest = await readSlotState(fighterId);
    await longRest(paladinId);
    const paladinAfterLongRest = await readSlotState(paladinId);
    await longRest(eldritchKnightId);
    const eldritchKnightAfterLongRest = await readSlotState(eldritchKnightId);
    await longRest(multiclassId);
    const multiclassAfterLongRest = await readSlotState(multiclassId);

    const actual = {
      wizard: { afterFirstRestore: wizardAfterFirstRestore, afterSecondRestore: wizardAfterSecondRestore },
      warlock: { afterPactRestore: warlockAfterPactRestore, afterShortRest: warlockAfterShortRest },
      fighter: {
        afterLongRest: fighterAfterLongRest,
        KNOWN_BUG: "BUG-010",
      },
      halfCaster: {
        effectiveCasterLevel: 3,
        afterLongRest: paladinAfterLongRest,
        KNOWN_BUG: "BUG-010",
      },
      thirdCaster: {
        effectiveCasterLevel: 2,
        afterLongRest: eldritchKnightAfterLongRest,
        KNOWN_BUG: "BUG-010",
      },
      multiclass: {
        levels: "Paladin 2 / Wizard 3 / Eldritch Knight 3",
        effectiveCasterLevel: 5,
        afterLongRest: multiclassAfterLongRest,
        KNOWN_BUG: "BUG-010",
      },
    };

    if (UPDATE_GOLDEN) {
      fs.mkdirSync(path.dirname(GOLDEN_PATH), { recursive: true });
      fs.writeFileSync(GOLDEN_PATH, JSON.stringify(actual, null, 2) + "\n");
      return;
    }

    if (!fs.existsSync(GOLDEN_PATH)) {
      throw new Error("Golden відсутній. Згенеруйте його через UPDATE_GOLDEN=1.");
    }

    expect(actual).toEqual(JSON.parse(fs.readFileSync(GOLDEN_PATH, "utf-8")));
  }, 30_000);
});

async function createOwnedCharacter(id: string, className: Classes, backgroundName: BackgroundCategory): Promise<number> {
  const user = await prisma.user.upsert({
    where: { email: "derived-state@golden.test" },
    create: { email: "derived-state@golden.test", name: "Golden Test User" },
    update: {},
  });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

  const [race, characterClass, background] = await Promise.all([
    raceByName(Races.HUMAN_2014),
    classByName(className),
    backgroundByName(backgroundName),
  ]);
  const result = await createCharacter(await withCreationSpells(minimalForm({ raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId })));
  if ("error" in result) throw new Error(`${id}: createCharacter повернув ${result.error}`);
  return result.persId;
}

async function readSlotState(persId: number) {
  return prisma.pers.findUniqueOrThrow({
    where: { persId },
    select: {
      level: true,
      currentSpellSlots: true,
      currentPactSlots: true,
      currentHitDice: true,
      currentHp: true,
      tempHp: true,
      deathSaveSuccesses: true,
      deathSaveFailures: true,
      isDead: true,
    },
  });
}
