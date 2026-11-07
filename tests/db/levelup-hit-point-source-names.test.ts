import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { loadLevelUpBaseContent } from "@/server/db/levelup-content";
import { findLevelUpHitPointSources } from "@/lib/components/levelUp/levelup-hit-point-sources";
import { toHitPointGrantingFeature } from "@/rules/hit-points";
import { createFighter } from "../helpers/sheet-feat-fixtures";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

beforeEach(resetUserData);
afterAll(disconnectDatabase);

describe("доданки хітів у майстрі рівня", () => {
  it("риса, що вже є в персонажа, підписана своєю назвою, а не undefined", async () => {
    const persId = await createFighter({ ruleset: "RULES_2014", level: 2 });
    const toughness = await prisma.feature.findFirstOrThrow({ where: { engName: "Dwarven Toughness (Hill Dwarf Subrace)" }, select: { featureId: true, name: true } });
    await prisma.persFeature.create({ data: { persId, featureId: toughness.featureId } });

    const { pers } = await loadLevelUpBaseContent(persId);
    const sources = findLevelUpHitPointSources({
      ownedFeatures: (pers?.features ?? []).map((entry) => ({ ...toHitPointGrantingFeature(entry.feature), name: entry.feature.name })),
      gainedFeatures: [],
      leveledClassId: pers?.classId ?? 0,
      classLevelAfter: 3,
    });

    expect(sources).toEqual([{ name: toughness.name, amount: 1 }]);
  });
});
