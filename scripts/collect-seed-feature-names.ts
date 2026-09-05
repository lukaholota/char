import { readFileSync } from "fs";
import { join } from "path";

const FEATURE_SEED_FILES = [
  "prisma/seed/classFeatureSeed.ts",
  "prisma/seed/subclassFeatureSeed.ts",
  "prisma/seed/raceFeatureSeed.ts",
  "prisma/seed/subraceFeatureSeed.ts",
  "prisma/seed/optionalFeatureSeed.ts",
  "prisma/seed/infusionFeaturesSeed.ts",
];

export type SeedFeatureName = {
  engName: string;
  file: string;
  line: number;
};

export function collectSeedFeatureNames(): SeedFeatureName[] {
  return FEATURE_SEED_FILES.flatMap(readFeatureNamesFromFile);
}

export function findDuplicateEngNames(names: SeedFeatureName[]) {
  const byEngName = new Map<string, SeedFeatureName[]>();

  for (const name of names) {
    byEngName.set(name.engName, [...(byEngName.get(name.engName) ?? []), name]);
  }

  return [...byEngName.entries()].filter(([, places]) => places.length > 1);
}

function readFeatureNamesFromFile(file: string): SeedFeatureName[] {
  const source = readFileSync(join(process.cwd(), file), "utf-8");

  return findInnermostObjects(blankOutComments(source))
    .map((object) => buildFeatureName(object, source, file))
    .filter((name): name is SeedFeatureName => name !== null);
}

function buildFeatureName(
  object: { start: number; text: string },
  source: string,
  file: string,
): SeedFeatureName | null {
  const engName = /^\s*engName:\s*"([^"]+)"/m.exec(object.text)?.[1];

  if (!engName || !object.text.includes("description:")) return null;

  return {
    engName,
    file,
    line: source.slice(0, object.start).split("\n").length,
  };
}

/// Коментарі гасяться пробілами, а не вирізаються: рядки й зміщення мусять лишитися ті самі,
/// інакше номер рядка в повідомленні тесту вкаже не туди. Плюс український апостроф у
/// коментарі інакше читається як початок рядка й зʼїдає пів файлу.
function blankOutComments(source: string) {
  let result = "";
  let index = 0;
  let quote: string | null = null;

  while (index < source.length) {
    const char = source[index];

    if (quote) {
      result += char;
      if (char === "\\") {
        result += source[index + 1] ?? "";
        index += 2;
        continue;
      }
      if (char === quote) quote = null;
      index += 1;
      continue;
    }

    if (char === '"' || char === "`") {
      quote = char;
      result += char;
      index += 1;
      continue;
    }

    if (char === "/" && source[index + 1] === "/") {
      while (index < source.length && source[index] !== "\n") {
        result += " ";
        index += 1;
      }
      continue;
    }

    if (char === "/" && source[index + 1] === "*") {
      const end = source.indexOf("*/", index);
      const stop = end < 0 ? source.length : end + 2;
      result += source.slice(index, stop).replace(/[^\n]/g, " ");
      index = stop;
      continue;
    }

    result += char;
    index += 1;
  }

  return result;
}

function findInnermostObjects(source: string) {
  const spans: { start: number; end: number; text: string }[] = [];
  const openBraces: number[] = [];
  let quote: string | null = null;
  let index = 0;

  while (index < source.length) {
    const char = source[index];

    if (quote) {
      if (char === "\\") {
        index += 2;
        continue;
      }
      if (char === quote) quote = null;
    } else if (char === '"' || char === "`") {
      quote = char;
    } else if (char === "{") {
      openBraces.push(index);
    } else if (char === "}" && openBraces.length > 0) {
      const start = openBraces.pop() as number;
      spans.push({ start, end: index + 1, text: source.slice(start, index + 1) });
    }

    index += 1;
  }

  return spans.filter((span) => !spans.some((other) => span.start < other.start && other.end <= span.end));
}
