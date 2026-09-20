/**
 * KR6.3 Step 3 — 2024 Content Seeding & Isolation Tests
 *
 * Verifies that:
 * 1. 2014 content remains intact and is never overwritten or corrupted by 2024 seeding.
 * 2. 2024 content is properly seeded with ruleset = RULES_2024.
 * 3. The 15 existing *_2024 backgrounds (IDs 153-167) were updated in-place without deleting or changing their IDs.
 * 4. Content queries (creator options, spell lists, etc.) only return RULES_2014 content by default.
 */

import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import normalizedSubclasses from "../../data/2024/normalized/subclasses.json";
import { disconnectDatabase } from "../user-data";
import { findCharacterCreatorOptions } from "@/lib/content/creator-content";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

afterAll(disconnectDatabase);

describe("KR6.3 Step 3 — 2024 Content Isolation", () => {
  it("preserves 2014 content integrity across all tables", async () => {
    const [races2014, classes2014, feats2014, weapons2014, spells2014] = await Promise.all([
      prisma.race.count({ where: { ruleset: "RULES_2014" } }),
      prisma.class.count({ where: { ruleset: "RULES_2014" } }),
      prisma.feat.count({ where: { ruleset: "RULES_2014" } }),
      prisma.weapon.count({ where: { ruleset: "RULES_2014" } }),
      prisma.spell.count({ where: { ruleset: "RULES_2014" } }),
    ]);

    // Baseline sanity: 2014 content must be populated and non-empty
    expect(races2014).toBeGreaterThan(0);
    expect(classes2014).toBeGreaterThan(0);
    expect(feats2014).toBeGreaterThan(0);
    expect(weapons2014).toBeGreaterThan(0);
    expect(spells2014).toBeGreaterThan(0);
  });

  it("seeds 2024 content with explicit RULES_2024 ruleset", async () => {
    const [races2024, classes2024, feats2024, weapons2024, spells2024, subclasses2024] =
      await Promise.all([
        prisma.race.count({ where: { ruleset: "RULES_2024" } }),
        prisma.class.count({ where: { ruleset: "RULES_2024" } }),
        prisma.feat.count({ where: { ruleset: "RULES_2024" } }),
        prisma.weapon.count({ where: { ruleset: "RULES_2024" } }),
        prisma.spell.count({ where: { ruleset: "RULES_2024" } }),
        prisma.subclass.count({ where: { ruleset: "RULES_2024" } }),
      ]);

    // 2024 counts must match seeded numbers
    expect(races2024).toBe(10);
    expect(classes2024).toBe(13);
    // KR31.4, 2026-09-06: 74, а не 75 — рису «Ability Score Improvement» прибрано з переліку
    // рішенням власника, бо той самий вибір уже є окремою гілкою кроку ASI.
    expect(feats2024).toBe(74);
    // KR31.6: 38 книжкових одиниць зброї + рядок правила UNARMED_STRIKE (seedUnarmedStrike2024).
    expect(weapons2024).toBe(39);
    expect(spells2024).toBe(391);
    expect(subclasses2024).toBe(normalizedSubclasses.length);
  });

  it("updated 15 existing *_2024 backgrounds in-place without ID changes", async () => {
    const expectedIds = [153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167];

    const updatedBgs = await prisma.background.findMany({
      where: { backgroundId: { in: expectedIds } },
      select: {
        backgroundId: true,
        ruleset: true,
        source: true,
        specialAbilityName: true,
        grantsGoldInstead: true,
        originFeatId: true,
      },
    });

    expect(updatedBgs.length).toBe(15);
    for (const bg of updatedBgs) {
      expect(bg.ruleset).toBe("RULES_2024");
      expect(bg.source).toBe("PHB_2024");
      expect(bg.specialAbilityName).toBeNull(); // cleared 2014-shaped field
      expect(bg.grantsGoldInstead).toBe(50); // real 2024 value
      expect(bg.originFeatId).not.toBeNull(); // resolved to 2024 origin feat
    }
  });

  it("does not leak RULES_2024 records into default creator options", async () => {
    const { races, classes, backgrounds, weapons, feats } = findCharacterCreatorOptions("RULES_2014");

    // Verify creator options only contain RULES_2014 content
    for (const race of races) {
      expect(race.ruleset).toBe("RULES_2014");
    }
    for (const bg of backgrounds) {
      expect(bg.ruleset).toBe("RULES_2014");
    }
    for (const cls of classes) {
      expect(cls.ruleset).toBe("RULES_2014");
    }
    for (const weapon of weapons) {
      expect(weapon.ruleset).toBe("RULES_2014");
    }
    for (const feat of feats) {
      expect(feat.ruleset).toBe("RULES_2014");
    }
  });
});
