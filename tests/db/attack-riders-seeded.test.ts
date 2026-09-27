import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { listFeaturesUsedDuringAttack } from "@/rules/attack-riders";
import { disconnectDatabase } from "../user-data";

afterAll(disconnectDatabase);

describe("розділ «Під час атаки» на листі", () => {
  it("кожна назва зі списку є фічею в базі — описка мовчки лишила б фічу серед пасивних", async () => {
    const names = listFeaturesUsedDuringAttack();
    const found = await prisma.feature.findMany({ where: { engName: { in: names } }, select: { engName: true } });
    const foundNames = new Set(found.map((feature) => feature.engName));

    expect(names.filter((name) => !foundNames.has(name))).toEqual([]);
  });
});
