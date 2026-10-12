import { expect, it } from "vitest";
import classes from "@/lib/generated/classes.json";
import races from "@/lib/generated/races.json";
import supplemental from "@/lib/generated/optimization-feature-descriptions-2014.json";
import { readSubclassFeatureSeedInputs } from "../../prisma/seed/subclassFeatureSeed";
import { readRaceFeatureSeedInputs } from "../../prisma/seed/raceFeatureSeed";

type FeatureText = { engName: string; description?: string | null; shortDescription?: string | null; name?: string };

function collect2014Features(value: unknown, inheritedEdition = "RULES_2014"): FeatureText[] {
  if (Array.isArray(value)) return value.flatMap((entry) => collect2014Features(entry, inheritedEdition));
  if (!value || typeof value !== "object") return [];
  const row = value as Record<string, unknown>;
  const edition = String(row.ruleset ?? inheritedEdition);
  const own = edition === "RULES_2014" && typeof row.engName === "string" ? [row as FeatureText] : [];
  return [...own, ...Object.values(row).flatMap((entry) => entry && typeof entry === "object" ? collect2014Features(entry, edition) : [])];
}

it("native 2014 rules exposed in article modals use ratified skill and hit-dice terms", () => {
  const retired = /(?<!\p{L})(?:Проникливість(?! велетнів)|Проникливості|Проникливістю|Сприйняття|Увага|Увагу|Увагою|Уваги|Увазі|Догляд за тваринами|Кубик[а-яіїєґ]* [Хх]іт[а-яіїєґ]*)(?!\p{L})/u;
  const texts = [...collect2014Features(classes), ...collect2014Features(races), ...supplemental];
  expect(texts.filter((entry) => retired.test(`${entry.description ?? ""} ${entry.shortDescription ?? ""}`)).map((entry) => entry.engName)).toEqual([]);
});

it("repaired class and race descriptions remain identical to their source seeds", () => {
  const native = [...collect2014Features(classes), ...collect2014Features(races)];
  const source = [...readSubclassFeatureSeedInputs(), ...readRaceFeatureSeedInputs()];
  for (const english of ["Steel Defender", "Ear for Deceit", "Insightful Fighting", "Soul of Deceit", "Panache", "Implements of Mercy", "Visage of the Astral Self", "Healing Machine", "Black Blood Healing"]) {
    const seed = source.find((entry) => entry.engName === english)!;
    const records = native.filter((entry) => entry.engName === english);
    expect(records.length, english).toBeGreaterThan(0);
    for (const entry of records) expect(entry.description, english).toBe(seed.description);
    expect(supplemental.find((entry) => entry.engName === english)?.description, english).toBe(seed.description);
  }
});

it("Mercy skill names agree with the dictionary and proper ability names remain intact", () => {
  const seed = readSubclassFeatureSeedInputs();
  const mercy = seed.find((entry) => entry.engName === "Implements of Mercy")!;
  expect(mercy.description).toContain("навичками Аналіз поведінки і Медицина");
  expect(mercy.shortDescription).toContain("навичками Аналіз поведінки і Медицина");
  expect(seed.find((entry) => entry.engName === "Insightful Fighting")?.name).toBe("Проникливий бій");
  expect(readRaceFeatureSeedInputs().find((entry) => entry.engName === "Telepathic Insight")?.name).toBe("Телепатична проникливість");
});
