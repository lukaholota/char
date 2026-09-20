import { describe, expect, it } from "vitest";

import { readFeat2024SeedInputs } from "../../prisma/seed/featSeed2024";

describe("сід рис 2024", () => {
  it("не повертає рису «Ability Score Improvement», прибрану в KR31.4", () => {
    const engNames = readFeat2024SeedInputs().map((feat) => feat.engName);

    expect(engNames).not.toContain("Ability Score Improvement");
    expect(engNames).toHaveLength(74);
  });
});
