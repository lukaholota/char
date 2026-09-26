import { describe, expect, it } from "vitest";

import { LEGACY_SUBCLASSES_2024, shiftLegacyLevel, type LegacySubclass2024 } from "@/rules/legacy-subclasses-2024";
import { readCachedValue } from "../../scripts/5etools/mirror";

type FeatureRef = string | { subclassFeature: string };

type FiveEtoolsSubclass = {
  shortName: string;
  source: string;
  classSource: string;
  reprintedAs?: string[];
  subclassFeatures?: FeatureRef[];
};

type FiveEtoolsSubclassFeature = { name: string; level: number; subclassShortName: string; subclassSource: string; classSource: string };

const SUBCLASS_LEVEL_2024 = 3;

const FIVE_ETOOLS_SOURCE: Readonly<Record<string, string>> = {
  PHB: "PHB",
  DMG: "DMG",
  XGTE: "XGE",
  TCOE: "TCE",
  EGTW: "EGW",
  FTOD: "FTD",
  SCAG: "SCAG",
  BPGOTG: "BGG",
  DRAGONLANCE: "DSotDQ",
};

function readClassFile(entry: LegacySubclass2024) {
  const classSlug = entry.class2014.replace(/_2014$/, "").toLowerCase();
  return readCachedValue(`class/class-${classSlug}.json`) as { subclass: FiveEtoolsSubclass[]; subclassFeature: FiveEtoolsSubclassFeature[] };
}

function findRecord(entry: LegacySubclass2024, classSource: "PHB" | "XPHB"): FiveEtoolsSubclass | undefined {
  const source = FIVE_ETOOLS_SOURCE[entry.source];
  return readClassFile(entry).subclass.find(
    (record) => record.classSource === classSource && record.shortName === entry.shortName5etools && record.source === source,
  );
}

function findOriginalRecord(entry: LegacySubclass2024): FiveEtoolsSubclass {
  const record = findRecord(entry, "PHB");
  if (!record) throw new Error(`${entry.subclass}: немає запису 5etools ${entry.shortName5etools} з книги ${entry.source}`);
  return record;
}

function findXphbCopy(entry: LegacySubclass2024): FiveEtoolsSubclass | undefined {
  return findRecord(entry, "XPHB");
}

/// Посилання 5etools «Name|Class|ClassSource|Short|Source|Level»; копія без власного переліку рис успадковує оригінал.
function readFeatureLevels(refs: readonly FeatureRef[]): string[] {
  return refs.map((ref) => {
    const [name, , , , , level] = (typeof ref === "string" ? ref : ref.subclassFeature).split("|");
    return `${name}@${level}`;
  });
}

function findShiftedOriginalLevels(entry: LegacySubclass2024): string[] {
  return readFeatureLevels(findOriginalRecord(entry).subclassFeatures ?? []).map((ref) => {
    const [name, level] = ref.split("@");
    return `${name}@${shiftLegacyLevel(Number(level), SUBCLASS_LEVEL_2024)}`;
  });
}

describe("O43 — реєстр легасі-підкласів 2024 проти дзеркала 5etools", () => {
  it("жоден підклас реєстру не перевиданий у 2024 — за записом 5etools із тієї ж книги", () => {
    const reprinted = LEGACY_SUBCLASSES_2024.filter((entry) => findOriginalRecord(entry).reprintedAs).map((entry) => entry.subclass);

    expect(reprinted).toEqual([]);
  });

  it("кожен підклас реєстру має XPHB-копію в 5etools — тобто сідає на клас 2024", () => {
    expect(LEGACY_SUBCLASSES_2024.filter((entry) => !findXphbCopy(entry)).map((entry) => entry.subclass)).toEqual([]);
  });

  it("зсув рівнів дає рівно перелік рис XPHB-копії; розходяться лише риси, які реєстр прибирає", () => {
    const mismatches = LEGACY_SUBCLASSES_2024.flatMap((entry) => {
      const copy = findXphbCopy(entry);
      if (!copy?.subclassFeatures) return [];
      const expected = new Set(readFeatureLevels(copy.subclassFeatures));
      const extra = [...new Set(findShiftedOriginalLevels(entry))].filter((ref) => !expected.has(ref));
      return extra.length ? [`${entry.subclass}: ${extra.join(", ")}`] : [];
    });

    expect(mismatches).toEqual([
      "DEATH_DOMAIN: Divine Strike@8, Blessed Strikes@8",
      "FORGE_DOMAIN: Divine Strike@8, Blessed Strikes@8",
      "NATURE_DOMAIN: Divine Strike@8, Blessed Strikes@8",
      "ORDER_DOMAIN: Divine Strike@8, Blessed Strikes@8",
      "PEACE_DOMAIN: Potent Spellcasting@8, Blessed Strikes@8",
      "TEMPEST_DOMAIN: Divine Strike@8, Blessed Strikes@8",
      "TWILIGHT_DOMAIN: Divine Strike@8, Blessed Strikes@8",
    ]);
    expect(LEGACY_SUBCLASSES_2024.filter((entry) => entry.featuresRemovedIn2024).map((entry) => entry.subclass)).toEqual([
      "DEATH_DOMAIN",
      "FORGE_DOMAIN",
      "NATURE_DOMAIN",
      "ORDER_DOMAIN",
      "PEACE_DOMAIN",
      "TEMPEST_DOMAIN",
      "TWILIGHT_DOMAIN",
    ]);
  });
});
