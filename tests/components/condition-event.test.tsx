import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/actions/game-sessions", () => ({ changeHeroConditionsAction: vi.fn(), changeMapCreatureConditionsAction: vi.fn() }));
vi.mock("@/components/no-ai/NoAiModeProvider", () => ({ useModeRouter: vi.fn() }));

import { buildConditionEvent } from "@/components/games/use-token-conditions";

describe("buildConditionEvent", () => {
  it("names the token target, not the PostHog token field", () => {
    expect(buildConditionEvent({ kind: "creature", id: 1 }, { kind: "toggle", condition: "prone", isActive: true })).toEqual({ target: "creature", kind: "toggle" });
    expect(buildConditionEvent({ kind: "hero", id: 2 }, { kind: "exhaustion", level: 2 })).toEqual({ target: "hero", kind: "exhaustion" });
  });

  it("records the spotlight style when switched on and null when switched off", () => {
    expect(buildConditionEvent({ kind: "hero", id: 2 }, { kind: "toggle", condition: "spotlit-fire", isActive: true })).toEqual({ target: "hero", kind: "spotlight", spotlight_style: "fire" });
    expect(buildConditionEvent({ kind: "hero", id: 2 }, { kind: "toggle", condition: "spotlit-fire", isActive: false })).toEqual({ target: "hero", kind: "spotlight", spotlight_style: null });
  });
});
