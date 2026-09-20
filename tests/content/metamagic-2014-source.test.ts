import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import dictionary from "@/lib/refs/dictionary.json";
import { readClassFeatureSeedInputs } from "../../prisma/seed/classFeatureSeed";
import sourceSlice from "../fixtures/5etools/metamagic-2014-slice.json";

type SourceMetamagic = {
  name: string;
  source: string;
  featureType: string[];
  consumes?: { name: string; amount?: number; amountMin?: number };
};

const MIRROR_PATH = join(process.cwd(), "data/5etools/raw/optionalfeatures.json");

const SORCERY_POINT_CARRIERS = [
  "prisma/seed/classFeatureSeed.ts",
  "prisma/seed/subclassFeatureSeed.ts",
  "prisma/seed/featSeed.ts",
  "prisma/seed/metamagic2024.ts",
  "data/2024/normalized/metamagic.json",
  "data/2024/normalized/subclasses.json",
];

const RETIRED_SORCERY_POINTS = /[Оо]ч(?:ок|к[а-яіїєʼ]*) метамагії/g;

const sourceOptions = sourceSlice.optionalfeature as SourceMetamagic[];

function findSeedFeature(engName: string) {
  return readClassFeatureSeedInputs().find((input) => input.engName === engName);
}

function readSourceCost(option: SourceMetamagic): number {
  return option.consumes?.amount ?? option.consumes?.amountMin ?? 1;
}

describe("O35 — очки чародійства", () => {
  it("термін є у словнику", () => {
    expect(dictionary.DND_DICTIONARY.classFeatures.sorceryPoints).toBe("Очки чародійства");
  });

  it.each(SORCERY_POINT_CARRIERS)("%s не називає ресурс «очками метамагії»", (carrier) => {
    const text = readFileSync(join(process.cwd(), carrier), "utf-8");
    expect(text.match(RETIRED_SORCERY_POINTS) ?? []).toEqual([]);
  });
});

describe("O35 — метамагія 2014 за PHB/TCoE", () => {
  it("джерело має рівно 10 варіантів 2014", () => {
    expect(sourceOptions.map((option) => `${option.source} ${option.name}`).sort()).toEqual([
      "PHB Careful Spell",
      "PHB Distant Spell",
      "PHB Empowered Spell",
      "PHB Extended Spell",
      "PHB Heightened Spell",
      "PHB Quickened Spell",
      "PHB Subtle Spell",
      "PHB Twinned Spell",
      "TCE Seeking Spell",
      "TCE Transmuted Spell",
    ]);
  });

  it.skipIf(!existsSync(MIRROR_PATH))("зріз у фікстурі дорівнює дзеркалу", () => {
    const mirror = JSON.parse(readFileSync(MIRROR_PATH, "utf-8")) as { optionalfeature: SourceMetamagic[] };
    const fromMirror = mirror.optionalfeature.filter(
      (option) => option.featureType.includes("MM") && option.source !== "XPHB"
    );
    expect(fromMirror).toEqual(sourceOptions);
  });

  it.each(sourceOptions.map((option) => [option.name, option] as const))(
    "%s: фіча в сіді з пулом очок чародійства й ціною джерела",
    (engName, option) => {
      const feature = findSeedFeature(engName);
      expect(feature).toBeDefined();
      expect(feature?.usesPoolKey).toBe("SORCERY_POINTS");
      expect(feature?.usePrice ?? 1).toBe(readSourceCost(option));
    }
  );

  it.each(sourceOptions.filter((option) => option.name !== "Twinned Spell").map((option) => [option.name, option] as const))(
    "%s: опис називає ту саму ціну, що й джерело",
    (engName, option) => {
      const cost = readSourceCost(option);
      const description = String(findSeedFeature(engName)?.description ?? "");
      expect(description).toContain(`${cost} ${cost === 1 ? "очко" : "очки"} чародійства`);
    }
  );

  it("Перетворене заклинання перелічує типи шкоди джерела", () => {
    const description = String(findSeedFeature("Transmuted Spell")?.description ?? "");
    expect(description).toContain("кислотна, холодна, вогняна, блискавична, отруйна, громова");
    expect(description).not.toContain("некротична");
  });
});
