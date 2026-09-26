import { describe, expect, it } from "vitest";
import { findCharacterCreatorOptions } from "@/lib/content/creator-content";
import { BLOOD_HUNTER_CLASS_NAMES } from "../../prisma/seed/bloodHunter";

/// Мисливець за кровʼю — власний носій O45, його звіряє blood-hunter-carrier.
const isBloodHunter = (className: string) => BLOOD_HUNTER_CLASS_NAMES.some((name) => name === className);

describe("Character Creator Content Loading by Ruleset", () => {
  it("loads 2024 content when ruleset is RULES_2024", async () => {
    const { races, classes, backgrounds, weapons, feats } = findCharacterCreatorOptions("RULES_2024");

    expect(races.length).toBeGreaterThan(0);
    expect(races.every((r) => r.ruleset === "RULES_2024")).toBe(true);

    expect(classes.filter((c) => !isBloodHunter(c.name)).length).toBe(13);
    expect(classes.every((c) => c.ruleset === "RULES_2024")).toBe(true);

    expect(backgrounds.length).toBe(16);
    expect(backgrounds.every((b) => b.ruleset === "RULES_2024")).toBe(true);

    expect(weapons.length).toBeGreaterThan(0);
    expect(weapons.every((w) => w.ruleset === "RULES_2024")).toBe(true);

    expect(feats.length).toBeGreaterThan(0);
    expect(feats.every((f) => f.ruleset === "RULES_2024")).toBe(true);
  });

  it("loads 2014 content when ruleset is RULES_2014 (or default)", async () => {
    const { races, classes, backgrounds, weapons, feats } = findCharacterCreatorOptions("RULES_2014");

    expect(races.length).toBeGreaterThan(0);
    expect(races.every((r) => r.ruleset === "RULES_2014")).toBe(true);

    expect(classes.length).toBeGreaterThan(0);
    expect(classes.every((c) => c.ruleset === "RULES_2014")).toBe(true);

    expect(backgrounds.length).toBeGreaterThan(0);
    expect(backgrounds.every((b) => b.ruleset === "RULES_2014")).toBe(true);

    expect(weapons.length).toBeGreaterThan(0);
    expect(weapons.every((w) => w.ruleset === "RULES_2014")).toBe(true);

    expect(feats.length).toBeGreaterThan(0);
    expect(feats.every((f) => f.ruleset === "RULES_2014")).toBe(true);
  });
});
