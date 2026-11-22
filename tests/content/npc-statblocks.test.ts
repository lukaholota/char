import { describe, expect, it } from "vitest";
import { findCreatureByKey } from "@/lib/bestiaryData";
import { DEFAULT_NPC_STATBLOCK } from "@/lib/refs/npc-statblocks";

describe("типовий статблок швидкого НІПа", () => {
  it("є в бестіарії 2014 з тією ж назвою й картинкою, яку сервер покаже на мапі", () => {
    const creature = findCreatureByKey(DEFAULT_NPC_STATBLOCK.key, DEFAULT_NPC_STATBLOCK.ruleset);
    expect(creature?.name).toContain(DEFAULT_NPC_STATBLOCK.name);
    expect(creature?.imageUrl).toBe(DEFAULT_NPC_STATBLOCK.imageUrl);
  });
});
