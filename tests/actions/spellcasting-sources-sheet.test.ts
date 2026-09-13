import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races, Subclasses } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase, resetUserData } from "../user-data";
import { minimalForm } from "../helpers/build-form";
import { minimalLevelUpForm } from "../helpers/levelup-form";
import { backgroundByName, classByName, raceByName, subclassByName } from "../helpers/seed-lookup";
import { build2024MulticlassCharacter } from "../helpers/build-2024-multiclass-character";
import type { Multiclass2024Fixture } from "../fixtures/2024-multiclass";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { getLevelUpInfo, levelUpCharacter } from "@/lib/actions/levelup";
import { loadPersSpellSources, loadPersSpellcastingSources } from "@/server/db/spell-sources";

vi.setConfig({ testTimeout: 180_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function signInAsNewUser(label: string) {
  const user = await prisma.user.create({ data: { email: `${label}-${Math.random()}@holota.family`, name: label } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
}

/**
 * KR31.5 / L07-spellcasting-07 — третинний заклинач має свою характеристику на листі.
 * У базі `class.primary_casting_stat` воїна порожній в обох редакціях, а INT лежить на підкласі.
 */
async function buildEldritchKnight2014(topLevel: 2 | 3): Promise<number> {
  await signInAsNewUser("eldritch-knight-2014");
  const [race, fighter, background] = await Promise.all([
    raceByName(Races.HUMAN_2014),
    classByName(Classes.FIGHTER_2014),
    backgroundByName(BackgroundCategory.SOLDIER),
  ]);
  const created = await createCharacter(
    minimalForm({ raceId: race.raceId, classId: fighter.classId, backgroundId: background.backgroundId }),
  );
  if ("error" in created) throw new Error(created.error);

  await levelUpOrThrow(created.persId, minimalLevelUpForm({ classId: fighter.classId }));
  if (topLevel === 3) {
    const eldritchKnight = await subclassByName(fighter.classId, Subclasses.ELDRITCH_KNIGHT);
    await levelUpOrThrow(created.persId, minimalLevelUpForm({ classId: fighter.classId, subclassId: eldritchKnight.subclassId }));
  }

  return created.persId;
}

async function levelUpOrThrow(persId: number, data: ReturnType<typeof minimalLevelUpForm>) {
  const result = await levelUpCharacter(persId, data);
  if (result && "error" in result) throw new Error(result.error);
}

async function buildEldritchKnight2024(): Promise<number> {
  await signInAsNewUser("eldritch-knight-2024");
  const fixture = {
    id: "eldritch-knight-spellcasting-source",
    title: "Дворф, Воїн 2024 — Лицар-Чаклун на 3-му",
    reference: "KR31.5",
    why: "характеристика замовляння третинного заклинача",
    input: {
      species: "DWARF_2024",
      startingClass: "FIGHTER_2024",
      background: "ARTISAN_2024",
      baseAbilityScores: { STR: 13, DEX: 12, CON: 14, INT: 15, WIS: 10, CHA: 8 },
      backgroundAsi: { mode: "+2/+1" as const, plusTwo: "INT" as const, plusOne: "STR" as const },
      originFeat: "CRAFTER",
      classChoices: [{ choice: "Бойовий стиль", option: "Defense" }],
      speciesChoices: [],
      weaponMastery: ["Longsword", "Greatsword", "Handaxe"],
      levelUps: [
        { characterLevel: 2, class: "FIGHTER_2024", isNewClass: false },
        { characterLevel: 3, class: "FIGHTER_2024", isNewClass: false, subclass: "ELDRITCH_KNIGHT" },
      ],
    },
    expected: {} as Multiclass2024Fixture["expected"],
  } as Multiclass2024Fixture;

  const built = await build2024MulticlassCharacter(fixture, { createCharacter, levelUpCharacter, getLevelUpInfo });
  if (built.creationError || built.levelUpErrors.length || !built.persId) {
    throw new Error(`${built.creationError ?? ""} ${built.levelUpErrors.join("; ")}`);
  }

  return built.persId;
}

describe("KR31.5 — третинний заклинач чаклує характеристикою підкласу (L07-spellcasting-07)", () => {
  it("воїн 2014 до підкласу джерел не має, а Лицар-Чаклун 3-го рівня — Інтелект", async () => {
    const beforeSubclass = await buildEldritchKnight2014(2);
    expect(await loadPersSpellcastingSources(beforeSubclass)).toEqual([]);

    const eldritchKnight = await buildEldritchKnight2014(3);
    expect(await loadPersSpellcastingSources(eldritchKnight)).toEqual([
      { key: "FIGHTER_2014", name: "ELDRITCH_KNIGHT", ability: "INT", kind: "CLASS" },
    ]);
  });

  it("Лицар-Чаклун 2024 — джерело класу з Інтелектом і на листі, і серед джерел заклинань", async () => {
    const persId = await buildEldritchKnight2024();
    const expected = [{ key: "FIGHTER_2024", name: "ELDRITCH_KNIGHT", ability: "INT", kind: "CLASS" }];

    expect(await loadPersSpellcastingSources(persId)).toEqual(expected);
    expect(await loadPersSpellSources(persId)).toEqual(expected);
  });
});
