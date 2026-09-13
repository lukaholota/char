/**
 * KR31.6 — Темнозір і опори до шкоди видів: реєстр сіду проти корпусу фіч і наскрізно через
 * `getPersById`, яким лист завантажує персонажа.
 */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { DamageType, Races, Ruleset, Subraces } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { backgroundByName, classByName, raceByName, subraceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";
import {
  findSenseAndResistanceDrift,
  SPECIES_SENSE_AND_RESISTANCE_GRANTS,
} from "../../prisma/seed/speciesSensesAndResistances";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";
import { getPersById } from "@/lib/actions/pers";
import { calculateDamageResistances, calculateDarkvisionRange } from "@/lib/logic/bonus-calculator";

const EMAIL = "species-senses@test.local";

const DAMAGE_TYPE_STEMS: Record<DamageType, RegExp> = {
  ACID: /кислот/i,
  BLUDGEONING: /дробяч/i,
  COLD: /холод/i,
  FIRE: /вогн/i,
  FORCE: /сил/i,
  LIGHTNING: /блискав/i,
  NECROTIC: /некротич/i,
  PIERCING: /колюч/i,
  POISON: /отру/i,
  PSYCHIC: /психіч/i,
  RADIANT: /промен/i,
  SLASHING: /ріжуч/i,
  THUNDER: /гром/i,
};

const GRANT_WORDING = /опір до|стійкість до пошкоджень|темнозір|тьмяному світлі на відстані/i;

const KNOWN_NON_GRANTS = [
  "Blessing of the Raven Queen (Shadar-kai Race)",
  "Blessing of the Raven Queen (Shadar-kai Subrace)",
  "Chromatic Warding",
  "Custom Lineage: Variable Trait",
  "Draconic Resistance",
  "Dragonborn: Damage Resistance (2024)",
  "Dragonborn: Draconic Ancestry (2024)",
  "Tiefling: Fiendish Legacy (2024)",
];

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function loadSpeciesFeatures() {
  return prisma.feature.findMany({
    where: {
      OR: [
        { raceTraits: { some: {} } },
        { subraceTraits: { some: {} } },
        { raceVariantTraits: { some: {} } },
        { raceChoiceOptionTraits: { some: {} } },
      ],
    },
    select: { engName: true, ruleset: true, description: true },
  });
}

describe("реєстр Темнозору й опорів проти корпусу фіч видів", () => {
  it("кожен носій реєстру — фіча виду тієї самої редакції", async () => {
    const speciesFeatures = await loadSpeciesFeatures();
    const orphans = SPECIES_SENSE_AND_RESISTANCE_GRANTS.filter(
      (grant) => !speciesFeatures.some((feature) => feature.engName === grant.engName && feature.ruleset === grant.ruleset),
    ).map((grant) => grant.engName);

    expect(orphans).toEqual([]);
  });

  it("число й тип шкоди в реєстрі стоять у тексті самої фічі", async () => {
    const speciesFeatures = await loadSpeciesFeatures();
    const mismatches = SPECIES_SENSE_AND_RESISTANCE_GRANTS.flatMap((grant) => {
      const text = speciesFeatures.find((feature) => feature.engName === grant.engName)?.description ?? "";
      const wrongRange = grant.darkvisionRange !== undefined && !text.includes(`${grant.darkvisionRange} футів`);
      const wrongTypes = (grant.damageResistances ?? []).filter((type) => !DAMAGE_TYPE_STEMS[type].test(text));
      return wrongRange || wrongTypes.length > 0 ? [`${grant.engName}: ${wrongRange ? "дальність " : ""}${wrongTypes.join(",")}`] : [];
    });

    expect(mismatches).toEqual([]);
  });

  it("кожна фіча виду з опором чи Темнозором у тексті або в реєстрі, або відома поіменно", async () => {
    const registered = new Set(SPECIES_SENSE_AND_RESISTANCE_GRANTS.map((grant) => grant.engName));
    const unexplained = (await loadSpeciesFeatures())
      .filter((feature) => GRANT_WORDING.test(feature.description ?? ""))
      .map((feature) => feature.engName)
      .filter((engName) => !registered.has(engName) && !KNOWN_NON_GRANTS.includes(engName));

    expect(unexplained).toEqual([]);
  });

  it("база збігається із сідом — інакше bun run seed:species-senses:test -- --apply", async () => {
    const drift = await findSenseAndResistanceDrift(prisma);

    expect(drift.missingFeatures.map((grant) => grant.engName)).toEqual([]);
    expect(drift.staleFeatures.map((feature) => feature.engName)).toEqual([]);
  });
});

describe("Темнозір і опори на завантаженому листі", () => {
  async function createPers(input: { ruleset: Ruleset; race: Races; subrace?: Subraces; raceChoiceOptionEngName?: string }) {
    const [cls, race, background, subrace] = await Promise.all([
      classByName(input.ruleset === "RULES_2024" ? "FIGHTER_2024" : "FIGHTER_2014"),
      raceByName(input.race),
      backgroundByName("ACOLYTE"),
      input.subrace ? subraceByName(input.subrace) : Promise.resolve(null),
    ]);
    const option = input.raceChoiceOptionEngName
      ? await prisma.raceChoiceOption.findFirstOrThrow({
          where: { raceId: race.raceId, optionNameEng: input.raceChoiceOptionEngName },
        })
      : null;

    const user = await prisma.user.create({ data: { email: EMAIL, name: "Тестовий гравець" } });
    const pers = await prisma.pers.create({
      data: {
        userId: user.id,
        name: `Персонаж — ${input.race}`,
        ruleset: input.ruleset,
        classId: cls.classId,
        raceId: race.raceId,
        subraceId: subrace?.subraceId,
        backgroundId: background.backgroundId,
        level: 1,
        currentHp: 12,
        maxHp: 12,
        str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 10,
        raceChoiceOptions: option ? { connect: [{ optionId: option.optionId }] } : undefined,
      },
    });

    vi.mocked(auth).mockResolvedValue({ user: { email: EMAIL } } as never);
    const loaded = await getPersById(pers.persId);
    if (!loaded) throw new Error("getPersById не повернув персонажа");
    return loaded;
  }

  it("дроу 2014 бачить на 120 футів, а не на 60 від раси ельфа", async () => {
    const drow = await createPers({ ruleset: "RULES_2014", race: "ELF_2014", subrace: "ELF_DARK_DROW_2014" });

    expect(calculateDarkvisionRange(drow)).toBe(120);
    expect(calculateDamageResistances(drow)).toEqual([]);
  });

  it("тифлінг 2024 зі спадщиною Безодні: Темнозір 60 і опір отруті", async () => {
    const tiefling = await createPers({ ruleset: "RULES_2024", race: "TIEFLING_2024", raceChoiceOptionEngName: "Abyssal" });

    expect(calculateDarkvisionRange(tiefling)).toBe(60);
    expect(calculateDamageResistances(tiefling)).toEqual(["POISON"]);
  });

  it("людина 2024 не має ні Темнозору, ні опорів", async () => {
    const human = await createPers({ ruleset: "RULES_2024", race: "HUMAN_2024" });

    expect(calculateDarkvisionRange(human)).toBeNull();
    expect(calculateDamageResistances(human)).toEqual([]);
  });
});
