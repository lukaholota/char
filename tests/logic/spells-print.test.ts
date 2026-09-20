import { describe, expect, it } from "vitest";

import { parseSpellPrintRequest, SpellPrintRequestError } from "@/server/pdf/spellPrintRequest";

describe("spell print request", () => {
  it("keeps the edition beside the spell keys", () => {
    const request = parseSpellPrintRequest(
      new URLSearchParams("ruleset=RULES_2024&keys=summon-beast,produce-flame")
    );

    expect(request).toEqual({
      ruleset: "RULES_2024",
      catalogKeys: ["summon-beast", "produce-flame"],
      homebrewEntryIds: [],
    });
  });

  it("splits community entries out of the catalog keys", () => {
    const request = parseSpellPrintRequest(new URLSearchParams("keys=1393,homebrew:42"));

    expect(request).toEqual({
      ruleset: "RULES_2014",
      catalogKeys: ["1393"],
      homebrewEntryIds: [42],
    });
  });

  it("reads a legacy id list as keys, negative ones as community entries", () => {
    const request = parseSpellPrintRequest(new URLSearchParams("ids=1393,-42"));

    expect(request).toEqual({
      ruleset: "RULES_2014",
      catalogKeys: ["1393"],
      homebrewEntryIds: [42],
    });
  });

  it("rejects an empty selection", () => {
    expect(() => parseSpellPrintRequest(new URLSearchParams("ruleset=RULES_2024"))).toThrow(
      SpellPrintRequestError
    );
  });

  it("rejects an unknown edition", () => {
    expect(() => parseSpellPrintRequest(new URLSearchParams("ruleset=RULES_2026&keys=fireball"))).toThrow(
      "Невідома редакція правил"
    );
  });

  it("limits a single PDF job to a hundred spells", () => {
    const keys = Array.from({ length: 101 }, (_, index) => `spell-${index}`).join(",");

    expect(() => parseSpellPrintRequest(new URLSearchParams(`keys=${keys}`))).toThrow("до 100 заклинань");
  });
});
