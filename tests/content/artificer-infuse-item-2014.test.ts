import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { readClassFeatureSeedInputs } from "../../prisma/seed/classFeatureSeed";

const feature = readClassFeatureSeedInputs().find((entry) => entry.engName === "Infuse Item")!;
const description = String(feature.description);
const original = JSON.parse(readFileSync("tests/fixtures/5etools/raw-slices/class/class-artificer.json", "utf8"));

it("keeps the native and supplemental 2014 descriptions equal to the authoritative feature seed", () => {
  const classes: Array<{ features: Array<{ engName: string; description: string }> }> = JSON.parse(readFileSync("src/lib/generated/classes.json", "utf8"));
  const references: Array<{ engName: string; description: string }> = JSON.parse(readFileSync("src/lib/generated/optimization-feature-descriptions-2014.json", "utf8"));
  expect(classes.flatMap((characterClass) => characterClass.features).find((entry) => entry.engName === "Infuse Item")!.description).toBe(description);
  expect(references.filter((entry) => entry.engName === "Infuse Item")).toHaveLength(1);
  expect(references.find((entry) => entry.engName === "Infuse Item")!.description).toBe(description);
  expect(feature.name).toBe("Вливання предмета");
  const creator = JSON.parse(readFileSync("src/lib/generated/creator-content-2014.json", "utf8"));
  const creatorFeature = creator.classes.flatMap((entry: { features: Array<{ feature: { engName: string; description: string } }> }) => entry.features)
    .find((entry: { feature: { engName: string } }) => entry.feature.engName === "Infuse Item").feature;
  expect(creatorFeature.description).toBe(description);
});

it("preserves Infusions Known and item eligibility, immediate attunement and normal later attunement", () => {
  const source = original.classFeature.find((entry: { name: string; source: string }) => entry.name === "Infuse Item" && entry.source === "TCE");
  expect(source.page).toBe(9);
  expect(source.entries.some((entry: { classFeature?: string }) => entry.classFeature === "Infusions Known|Artificer|TCE|2")).toBe(true);
  expect(description).toContain("оберіть чотири Вливання");
  expect(description).toContain("щоразу, коли отримуєте рівень у цьому класі");
  expect(description).toContain("не можете вивчити те саме Вливання більше одного разу");
  expect(description).toContain("щонайменше зазначеного рівня");
  expect(description).toContain("після завершення тривалого відпочинку");
  expect(description).toContain("торкнутися немагічного предмета");
  expect(description).toContain("лише на певних типах предметів");
  expect(description).toContain("налаштуватися на нього тієї ж миті");
  expect(description).toContain("налаштуватися пізніше, використовуйте звичайний процес");
});

it("preserves indefinite duration, the death delay, lost knowledge and every simultaneous-item restriction", () => {
  expect(description).toContain("залишається в предметі необмежено довго");
  expect(description).toContain("після вашої смерті воно зникає через кількість днів");
  expect(description).toContain("модифікатору Інтелекту (мінімум 1 день)");
  expect(description).toContain("відмовляєтеся від знання цього Вливання на користь іншого");
  expect(description).toContain("торкнутися кожного предмета");
  expect(description).toContain("одне ваше Вливання може перебувати лише в одному предметі");
  expect(description).toContain("жоден предмет не може містити більше одного вашого Вливання");
  expect(description).toContain("найстаріше Вливання негайно припиняється, а потім застосовується нове");
  expect(description).toContain("вміст без жодної шкоди зʼявляється в його просторі та навколо нього");
  expect(description).not.toMatch(/24 години|24 годин|близькості|відстані/);
});

it("uses the exact original known-infusion and infused-item limits for all five level ranges", () => {
  const characterClass = original.class.find((entry: { source: string }) => entry.source === "TCE");
  const table = characterClass.classTableGroups.find((entry: { colLabels: string[] }) => entry.colLabels.some((label) => label.includes("Infusions Known")));
  for (const [start, end] of [[2, 5], [6, 9], [10, 13], [14, 17], [18, 20]]) {
    const [known, infused] = table.rows[start - 1];
    for (let level = start; level <= end; level++) expect(table.rows[level - 1].slice(0, 2)).toEqual([known, infused]);
    expect(description).toContain(`| ${start}–${end} | ${known} | ${infused} |`);
  }
});
