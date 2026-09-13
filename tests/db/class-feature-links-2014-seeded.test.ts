/**
 * KR31.12 — звірка «файл → база» для звʼязків класових фіч 2014: клірик має «Вигнання нежиті»
 * і не має паладинського «Channel Divinity», чарівник не має порожнього дубліката «Spellcasting».
 * Список у `prisma/seed/classFeatureLinks2014.ts` — джерело; тут перевіряється, що сід прогнали.
 */

import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase } from "../user-data";
import {
  FORBIDDEN_CLASS_FEATURE_LINKS_2014,
  REQUIRED_CLASS_FEATURE_LINKS_2014,
} from "../../prisma/seed/classFeatureLinks2014";

afterAll(disconnectDatabase);

async function findLink(className: string, featureEngName: string) {
  return prisma.classFeature.findFirst({
    where: {
      class: { name: className as never, ruleset: "RULES_2014" },
      feature: { engName: featureEngName },
    },
    select: { levelGranted: true },
  });
}

describe("KR31.12 — звʼязки класових фіч 2014", () => {
  it.each(REQUIRED_CLASS_FEATURE_LINKS_2014)(
    "$className отримує $featureEngName на рівні $levelGranted",
    async (link) => {
      const stored = await findLink(link.className, link.featureEngName);

      expect(stored).not.toBeNull();
      expect(stored?.levelGranted).toBe(link.levelGranted);
    },
  );

  it.each(FORBIDDEN_CLASS_FEATURE_LINKS_2014)(
    "$className не несе $featureEngName",
    async (link) => {
      expect(await findLink(link.className, link.featureEngName)).toBeNull();
    },
  );

  it("клірик 2014 має рівно одну рису Каналу божественності", async () => {
    const channelDivinity = await prisma.classFeature.findMany({
      where: {
        class: { name: "CLERIC_2014", ruleset: "RULES_2014" },
        feature: { engName: { startsWith: "Channel Divinity" } },
      },
      select: { feature: { select: { engName: true } } },
    });

    expect(channelDivinity.map((row) => row.feature.engName)).toEqual([
      "Channel Divinity (Cleric)",
    ]);
  });

  it("чарівник 2014 має рівно одну рису чаклування", async () => {
    const spellcasting = await prisma.classFeature.findMany({
      where: {
        class: { name: "WIZARD_2014", ruleset: "RULES_2014" },
        feature: { engName: { contains: "Spellcasting" } },
      },
      select: { feature: { select: { engName: true } } },
    });

    expect(spellcasting.map((row) => row.feature.engName)).toEqual(["Spellcasting (Wizard)"]);
  });
});
