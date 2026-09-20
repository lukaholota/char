import { describe, expect, it } from "vitest";
import { formatCreatureXp } from "./creature-xp";

describe("formatCreatureXp", () => {
  it("keeps a single XP suffix when the value already has one", () => {
    expect(formatCreatureXp("11500 XP")).toBe("11500 XP");
    expect(formatCreatureXp("1,100 XP")).toBe("1,100 XP");
  });

  it("adds the suffix to a bare number", () => {
    expect(formatCreatureXp("11500")).toBe("11500 XP");
  });

  it("returns null when there is no XP to show", () => {
    expect(formatCreatureXp("-")).toBeNull();
    expect(formatCreatureXp("")).toBeNull();
    expect(formatCreatureXp(null)).toBeNull();
    expect(formatCreatureXp(undefined)).toBeNull();
  });
});
