import { Subclasses } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { LEGACY_SUBCLASSES_2024 } from "@/rules/legacy-subclasses-2024";
import { isLegacySubclassDiffEmpty } from "../../prisma/seed/helpers/legacySubclassPlan";
import { seedLegacySubclasses2024 } from "../../prisma/seed/legacySubclasses2024";
import { disconnectDatabase } from "../user-data";

const LEGACY_NAMES: Subclasses[] = Object.values(Subclasses).filter((name) => LEGACY_SUBCLASSES_2024.some((entry) => entry.subclass === name));

async function readLegacyRows() {
  const rows = await prisma.subclass.findMany({
    where: { class: { name: "WARLOCK_2024" }, name: { in: LEGACY_NAMES } },
    select: {
      name: true,
      ruleset: true,
      spellcastingType: true,
      armorProficiencies: true,
      weaponProficiencies: true,
      features: { select: { featureId: true, levelGranted: true, ruleset: true }, orderBy: { featureId: "asc" } },
      subclassChoiceOptions: { select: { choiceOptionId: true, levelsGranted: true, ruleset: true }, orderBy: { choiceOptionId: "asc" } },
    },
  });
  return new Map(rows.map((row) => [String(row.name), row]));
}

async function read2014Row(name: Subclasses) {
  return prisma.subclass.findFirstOrThrow({
    where: { class: { name: "WARLOCK_2014" }, name, ruleset: "RULES_2014" },
    select: {
      armorProficiencies: true,
      weaponProficiencies: true,
      features: { select: { featureId: true, levelGranted: true }, orderBy: { featureId: "asc" } },
      subclassChoiceOptions: { select: { choiceOptionId: true, levelsGranted: true }, orderBy: { choiceOptionId: "asc" } },
    },
  });
}

describe("O43 — легасі-підкласи 2024 у базі", () => {
  let legacy: Awaited<ReturnType<typeof readLegacyRows>>;
  let genie2014: Awaited<ReturnType<typeof read2014Row>>;
  let genie2014Before: Awaited<ReturnType<typeof read2014Row>>;

  beforeAll(async () => {
    genie2014Before = await read2014Row(Subclasses.THE_GENIE);
    await seedLegacySubclasses2024(prisma, true);
    legacy = await readLegacyRows();
    genie2014 = await read2014Row(Subclasses.THE_GENIE);
  });
  afterAll(disconnectDatabase);

  it("кожен підклас реєстру — рядок RULES_2024 під чорнокнижником 2024 без власного чаклування", () => {
    expect([...legacy.keys()].sort()).toEqual([...LEGACY_NAMES].sort());
    for (const row of legacy.values()) {
      expect(row).toMatchObject({ ruleset: "RULES_2024", spellcastingType: "NONE" });
    }
  });

  it("Джин 2024 має ті самі риси, що й 2014, а риси 1-го рівня — на 3-му", () => {
    const genie = legacy.get("THE_GENIE");

    expect(genie?.features.map((link) => link.featureId)).toEqual(genie2014.features.map((link) => link.featureId));
    expect(genie?.features.map((link) => link.levelGranted).sort((a, b) => a - b)).toEqual([3, 3, 6, 10, 14]);
    expect(genie?.features.every((link) => link.ruleset === "RULES_2024")).toBe(true);
  });

  it("роди джина — ті самі опції, на 3-му рівні", () => {
    const genie = legacy.get("THE_GENIE");

    expect(genie?.subclassChoiceOptions.map((link) => link.choiceOptionId)).toEqual(genie2014.subclassChoiceOptions.map((link) => link.choiceOptionId));
    expect(genie?.subclassChoiceOptions).toHaveLength(4);
    expect(genie?.subclassChoiceOptions.every((link) => link.levelsGranted.join() === "3" && link.ruleset === "RULES_2024")).toBe(true);
  });

  it("Відьмацький клинок 2024 несе володіння 2014", async () => {
    const hexblade2014 = await read2014Row(Subclasses.HEXBLADE);
    const hexblade = legacy.get("HEXBLADE");

    expect(hexblade?.armorProficiencies).toEqual(["MEDIUM", "SHIELD"]);
    expect(hexblade?.weaponProficiencies).toEqual(hexblade2014.weaponProficiencies);
  });

  it("рядок 2014 сід лише читає", () => {
    expect(genie2014).toEqual(genie2014Before);
  });

  it("повторний прогін нічого не міняє", async () => {
    const outcomes = await seedLegacySubclasses2024(prisma, false);

    expect(outcomes.filter((outcome) => !isLegacySubclassDiffEmpty(outcome.diff)).map((outcome) => outcome.entry.subclass)).toEqual([]);
  });
});
