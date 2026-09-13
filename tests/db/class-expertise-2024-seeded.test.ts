import { expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma";

const EXPECTED = [
  ["BARD_2024", 2, 2], ["BARD_2024", 9, 2],
  ["ROGUE_2024", 1, 2], ["ROGUE_2024", 6, 2],
  ["RANGER_2024", 2, 1], ["RANGER_2024", 9, 2],
  ["WIZARD_2024", 2, 1],
] as const;

it("KR31.2 — spells_test містить усі expertise-гранти класів 2024", async () => {
  const classes = await prisma.class.findMany({
    where: { ruleset: "RULES_2024", name: { in: [...new Set(EXPECTED.map(([name]) => name))] } },
    select: {
      name: true,
      features: {
        select: { levelGranted: true, feature: { select: { skillExpertises: true } } },
      },
    },
  });

  const actual = classes.flatMap((characterClass) => characterClass.features.flatMap((link) => {
    const metadata = link.feature.skillExpertises as { count?: number } | null;
    return metadata?.count ? [[String(characterClass.name), link.levelGranted, metadata.count] as const] : [];
  })).sort((a, b) => `${a[0]}-${a[1]}`.localeCompare(`${b[0]}-${b[1]}`));

  expect(actual).toEqual([...EXPECTED].sort((a, b) => `${a[0]}-${a[1]}`.localeCompare(`${b[0]}-${b[1]}`)));
});
