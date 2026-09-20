/**
 * KR31.6 — Темнозір і опори до шкоди як дані фіч виду, а не текст.
 *
 * Колонки додав `db/changes/2026-09-11-kr31.6-derived-senses-resistances.sql`. Реєстр виміряно на
 * корпусі фіч, привʼязаних до рас, підрас, варіантів і виборів виду: кожен рядок — фіча, текст
 * якої дає опір чи Темнозір без умов. Поза реєстром навмисно:
 * - перевага на ряткидки без опору (Duergar Resilience, Magic Resistance, Gnomish Magic Resistance);
 * - опір лише на мить або реакцією (Blessing of the Raven Queen, Chromatic Warding, Hadozee Resilience);
 * - загальна фіча, тип якої несе обраний родовід (Draconic Resistance, Dragonborn: Damage Resistance);
 * - вибір «Темнозір або навичка» Своєї раси — окремої фічі для варіанта Темнозору немає.
 */

import { DamageType, Prisma, PrismaClient, Ruleset } from "@prisma/client";

export type SpeciesSenseAndResistanceGrant = {
  engName: string;
  ruleset: Ruleset;
  damageResistances?: DamageType[];
  darkvisionRange?: number;
};

const grant2014 = (engName: string, values: Omit<SpeciesSenseAndResistanceGrant, "engName" | "ruleset">) =>
  ({ engName, ruleset: "RULES_2014", ...values }) satisfies SpeciesSenseAndResistanceGrant;

const grant2024 = (engName: string, values: Omit<SpeciesSenseAndResistanceGrant, "engName" | "ruleset">) =>
  ({ engName, ruleset: "RULES_2024", ...values }) satisfies SpeciesSenseAndResistanceGrant;

export const SPECIES_SENSE_AND_RESISTANCE_GRANTS: readonly SpeciesSenseAndResistanceGrant[] = [
  grant2014("Darkvision", { darkvisionRange: 60 }),
  grant2014("Superior Darkvision", { darkvisionRange: 120 }),
  grant2014("Superior Darkvision (Deep Gnome)", { darkvisionRange: 120 }),
  grant2014("Superior Darkvision (Drow)", { darkvisionRange: 120 }),
  grant2014("Superior Darkvision (Duergar)", { darkvisionRange: 120 }),

  grant2014("Acid Resistance", { damageResistances: ["ACID"] }),
  grant2014("Celestial Resistance", { damageResistances: ["NECROTIC", "RADIANT"] }),
  grant2014("Child of the Sea (Sea Elf Race)", { damageResistances: ["COLD"] }),
  grant2014("Constructed Resilience", { damageResistances: ["POISON"] }),
  grant2014("Deathless Nature", { damageResistances: ["POISON"] }),
  grant2014("Dwarven Resilience", { damageResistances: ["POISON"] }),
  grant2014("Guardian of the Depths", { damageResistances: ["COLD"] }),
  grant2014("Hellish Resistance", { damageResistances: ["FIRE"] }),
  grant2014("Kalashtar Mental Discipline", { damageResistances: ["PSYCHIC"] }),
  grant2014("Lightning Resistance", { damageResistances: ["LIGHTNING"] }),
  grant2014("Mechanical Nature", { damageResistances: ["POISON"] }),
  grant2014("Mountain Born", { damageResistances: ["COLD"] }),
  grant2014("Natural Resilience", { damageResistances: ["ACID", "POISON"] }),
  grant2014("Necrotic Resistance (Shadar-kai Race)", { damageResistances: ["NECROTIC"] }),
  grant2014("Necrotic Resistance (Shadar-kai Subrace)", { damageResistances: ["NECROTIC"] }),
  grant2014("Poison Resilience", { damageResistances: ["POISON"] }),
  grant2014("Psychic Resilience", { damageResistances: ["PSYCHIC"] }),
  grant2014("Storm's Boon", { damageResistances: ["LIGHTNING"] }),
  grant2014("Stout Resilience", { damageResistances: ["POISON"] }),

  grant2014("Draconic Ancestry (Amethyst)", { damageResistances: ["FORCE"] }),
  grant2014("Draconic Ancestry (Black)", { damageResistances: ["ACID"] }),
  grant2014("Draconic Ancestry (Blue)", { damageResistances: ["LIGHTNING"] }),
  grant2014("Draconic Ancestry (Brass)", { damageResistances: ["FIRE"] }),
  grant2014("Draconic Ancestry (Bronze)", { damageResistances: ["LIGHTNING"] }),
  grant2014("Draconic Ancestry (Copper)", { damageResistances: ["ACID"] }),
  grant2014("Draconic Ancestry (Crystal)", { damageResistances: ["RADIANT"] }),
  grant2014("Draconic Ancestry (Emerald)", { damageResistances: ["PSYCHIC"] }),
  grant2014("Draconic Ancestry (Gold)", { damageResistances: ["FIRE"] }),
  grant2014("Draconic Ancestry (Green)", { damageResistances: ["POISON"] }),
  grant2014("Draconic Ancestry (Red)", { damageResistances: ["FIRE"] }),
  grant2014("Draconic Ancestry (Sapphire)", { damageResistances: ["THUNDER"] }),
  grant2014("Draconic Ancestry (Silver)", { damageResistances: ["COLD"] }),
  grant2014("Draconic Ancestry (Topaz)", { damageResistances: ["NECROTIC"] }),
  grant2014("Draconic Ancestry (White)", { damageResistances: ["COLD"] }),

  grant2024("Aasimar: Darkvision (2024)", { darkvisionRange: 60 }),
  grant2024("Dragonborn: Darkvision (2024)", { darkvisionRange: 60 }),
  grant2024("Dwarf: Darkvision (2024)", { darkvisionRange: 120 }),
  grant2024("Elf: Darkvision (2024)", { darkvisionRange: 60 }),
  grant2024("Elven Lineage: Drow (2024)", { darkvisionRange: 120 }),
  grant2024("Gnome: Darkvision (2024)", { darkvisionRange: 60 }),
  grant2024("Orc: Darkvision (2024)", { darkvisionRange: 120 }),
  grant2024("Tiefling: Darkvision (2024)", { darkvisionRange: 60 }),

  grant2024("Aasimar: Celestial Resistance (2024)", { damageResistances: ["NECROTIC", "RADIANT"] }),
  grant2024("Dwarf: Dwarven Resilience (2024)", { damageResistances: ["POISON"] }),
  grant2024("Fiendish Legacy: Abyssal (2024)", { damageResistances: ["POISON"] }),
  grant2024("Fiendish Legacy: Chthonic (2024)", { damageResistances: ["NECROTIC"] }),
  grant2024("Fiendish Legacy: Infernal (2024)", { damageResistances: ["FIRE"] }),

  grant2024("Draconic Ancestry: Black (2024)", { damageResistances: ["ACID"] }),
  grant2024("Draconic Ancestry: Blue (2024)", { damageResistances: ["LIGHTNING"] }),
  grant2024("Draconic Ancestry: Brass (2024)", { damageResistances: ["FIRE"] }),
  grant2024("Draconic Ancestry: Bronze (2024)", { damageResistances: ["LIGHTNING"] }),
  grant2024("Draconic Ancestry: Copper (2024)", { damageResistances: ["ACID"] }),
  grant2024("Draconic Ancestry: Gold (2024)", { damageResistances: ["FIRE"] }),
  grant2024("Draconic Ancestry: Green (2024)", { damageResistances: ["POISON"] }),
  grant2024("Draconic Ancestry: Red (2024)", { damageResistances: ["FIRE"] }),
  grant2024("Draconic Ancestry: Silver (2024)", { damageResistances: ["COLD"] }),
  grant2024("Draconic Ancestry: White (2024)", { damageResistances: ["COLD"] }),
];

const GRANTS_BY_ENG_NAME = new Map(SPECIES_SENSE_AND_RESISTANCE_GRANTS.map((grant) => [grant.engName, grant]));

export type SenseAndResistanceDrift = {
  missingFeatures: SpeciesSenseAndResistanceGrant[];
  staleFeatures: { engName: string; damageResistances: DamageType[]; darkvisionRange: number | null }[];
};

export async function findSenseAndResistanceDrift(prisma: PrismaClient): Promise<SenseAndResistanceDrift> {
  const stored = await loadStoredValues(prisma);

  const missingFeatures = SPECIES_SENSE_AND_RESISTANCE_GRANTS.filter(
    (grant) => !stored.some((row) => row.engName === grant.engName && row.ruleset === grant.ruleset),
  );
  const staleFeatures = stored.filter((row) => !matchesGrant(row, GRANTS_BY_ENG_NAME.get(row.engName)));

  return { missingFeatures, staleFeatures };
}

export async function syncSensesAndResistancesFromSeed(prisma: PrismaClient): Promise<SenseAndResistanceDrift> {
  const drift = await findSenseAndResistanceDrift(prisma);
  if (drift.missingFeatures.length > 0) {
    const names = drift.missingFeatures.map((grant) => grant.engName).join(", ");
    throw new Error(`У базі немає фіч реєстру: ${names}. Спершу сіди видів.`);
  }

  await prisma.$transaction(
    drift.staleFeatures.map((row) => {
      const grant = GRANTS_BY_ENG_NAME.get(row.engName);
      return prisma.feature.update({
        where: { engName: row.engName },
        data: { damageResistances: grant?.damageResistances ?? [], darkvisionRange: grant?.darkvisionRange ?? null },
      });
    }),
  );

  return drift;
}

const SPECIES_FEATURE = {
  OR: [
    { raceTraits: { some: {} } },
    { subraceTraits: { some: {} } },
    { raceVariantTraits: { some: {} } },
    { raceChoiceOptionTraits: { some: {} } },
  ],
} satisfies Prisma.FeatureWhereInput;

async function loadStoredValues(prisma: PrismaClient) {
  return prisma.feature.findMany({
    where: {
      OR: [
        { engName: { in: SPECIES_SENSE_AND_RESISTANCE_GRANTS.map((grant) => grant.engName) } },
        // Опори дають і не види (Дар опору стихіям, KR31.4): реєстр видів судить лише фічі видів.
        { AND: [SPECIES_FEATURE, { OR: [{ damageResistances: { isEmpty: false } }, { darkvisionRange: { not: null } }] }] },
      ],
    },
    select: { engName: true, ruleset: true, damageResistances: true, darkvisionRange: true },
    orderBy: { engName: "asc" },
  });
}

function matchesGrant(
  row: { damageResistances: DamageType[]; darkvisionRange: number | null },
  grant: SpeciesSenseAndResistanceGrant | undefined,
): boolean {
  const expectedResistances = [...(grant?.damageResistances ?? [])].sort();
  const storedResistances = [...row.damageResistances].sort();

  return (
    (grant?.darkvisionRange ?? null) === row.darkvisionRange &&
    expectedResistances.join(",") === storedResistances.join(",")
  );
}
