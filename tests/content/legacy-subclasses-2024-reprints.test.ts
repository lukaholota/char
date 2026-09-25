import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { LEGACY_SUBCLASSES_2024 } from "@/rules/legacy-subclasses-2024";

/// Задано руками: вгадування за підрядком при вимірі O43 знайшло «Light» у «Twilight».
const FIVE_ETOOLS_SHORT_NAME: Record<string, string> = {
  THE_GENIE: "Genie",
  HEXBLADE: "Hexblade",
  FATHOMLESS: "Fathomless",
  UNDYING: "Undying",
};

const FIVE_ETOOLS_SOURCE: Record<string, string> = {
  PHB: "PHB",
  TCOE: "TCE",
  XGTE: "XGE",
  SCAG: "SCAG",
};

type FiveEtoolsSubclass = { shortName: string; source: string; classSource: string; reprintedAs?: string[] };

function readFiveEtoolsSubclasses(class2014: string): FiveEtoolsSubclass[] {
  const classSlug = class2014.replace(/_2014$/, "").toLowerCase();
  const raw = readFileSync(join(process.cwd(), `data/5etools/raw/class/class-${classSlug}.json`), "utf-8");
  return JSON.parse(raw).subclass;
}

function findOriginal2014Record(entry: (typeof LEGACY_SUBCLASSES_2024)[number]): FiveEtoolsSubclass | undefined {
  return readFiveEtoolsSubclasses(entry.class2014).find(
    (record) =>
      record.classSource === "PHB" &&
      record.shortName === FIVE_ETOOLS_SHORT_NAME[entry.subclass] &&
      record.source === FIVE_ETOOLS_SOURCE[entry.source],
  );
}

describe("O43 — реєстр легасі-підкласів 2024 проти дзеркала 5etools", () => {
  it("жоден підклас реєстру не перевиданий у 2024 — за записом 5etools із тієї ж книги", () => {
    const unmapped = LEGACY_SUBCLASSES_2024.filter((entry) => FIVE_ETOOLS_SHORT_NAME[entry.subclass] === undefined);
    expect(unmapped).toEqual([]);

    const problems = LEGACY_SUBCLASSES_2024.flatMap((entry) => {
      const original = findOriginal2014Record(entry);
      if (!original) return [`${entry.subclass}: немає запису 5etools classSource PHB з книги ${entry.source}`];
      if (original.reprintedAs) return [`${entry.subclass}: перевиданий як ${original.reprintedAs.join(", ")}`];
      return [];
    });
    expect(problems).toEqual([]);
  });

});
