import { describe, expect, it } from "vitest";

import { collectOtherGenieKindSpellNames, findChosenGenieKind } from "@/rules/genie-kind-spells-2014";

describe("рід Джина 2014 — заклинання інших родів вилучаються з пропозиції", () => {
  it("без обраного роду нічого не вилучається", () => {
    expect(findChosenGenieKind(["Pact of the Tome"])).toBeNull();
    expect(collectOtherGenieKindSpellNames([])).toEqual(new Set());
  });

  it("дао лишає Святилище, а Хвилю грому джина, Палючі долоні іфрита й Туман марида прибирає; спільні лишаються", () => {
    const excluded = collectOtherGenieKindSpellNames(["Pact of the Blade", "Genie Kind: Dao"]);
    expect(excluded.size).toBe(15);
    expect(excluded.has("Sanctuary")).toBe(false);
    expect(excluded.has("Thunderwave")).toBe(true);
    expect(excluded.has("Burning Hands")).toBe(true);
    expect(excluded.has("Fog Cloud")).toBe(true);
    expect(excluded.has("Detect Evil and Good")).toBe(false);
    expect(excluded.has("Wish")).toBe(false);
  });

  it("марид прибирає й дао", () => {
    expect(collectOtherGenieKindSpellNames(["Genie Kind: Marid"]).has("Sanctuary")).toBe(true);
    expect(collectOtherGenieKindSpellNames(["Genie Kind: Marid"]).has("Fog Cloud")).toBe(false);
  });
});
