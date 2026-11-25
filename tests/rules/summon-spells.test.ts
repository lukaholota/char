import { describe, expect, it } from "vitest";
import { findCreatureByKey } from "@/lib/bestiaryData";
import { getAllSpells } from "@/lib/spellsData";
import { canSummon, isSummonSpell, listSummonSpells, parseSummonRequest } from "@/rules/summon-spells";

describe("заклинання, що закликають істоту", () => {
  it.each(["RULES_2014", "RULES_2024"] as const)("кожне заклинання й кожна істота %s є в каталогах тієї ж редакції", (ruleset) => {
    const spellNames = new Set(getAllSpells(ruleset).map((spell) => spell.engName));
    const spells = listSummonSpells(ruleset);
    expect(spells.filter((spell) => !spellNames.has(spell.engName))).toEqual([]);
    expect(spells.flatMap((spell) => spell.forms).filter((form) => !findCreatureByKey(form.key, ruleset))).toEqual([]);
  });

  it("форми Пакту ланцюга позначені й теж дозволені, чужа істота — ні", () => {
    const familiar = listSummonSpells("RULES_2014").find((spell) => spell.engName === "Find Familiar");
    expect(familiar?.forms).toContainEqual({ key: "owl", isChainOnly: false });
    expect(familiar?.forms).toContainEqual({ key: "imp", isChainOnly: true });
    expect(canSummon("RULES_2014", "Find Familiar", "imp")).toBe(true);
    expect(canSummon("RULES_2014", "Find Familiar", "owl")).toBe(true);
    expect(canSummon("RULES_2014", "Find Familiar", "adult-red-dragon")).toBe(false);
    expect(canSummon("RULES_2014", "Fireball", "owl")).toBe(false);
    expect(canSummon("RULES_2014", "constructor", "owl")).toBe(false);
  });

  it("редакції не змішуються: 2024 кличе потойбічного скакуна, 2014 — бойового коня", () => {
    expect(canSummon("RULES_2024", "Find Steed", "otherworldly-steed")).toBe(true);
    expect(canSummon("RULES_2024", "Find Steed", "warhorse")).toBe(false);
    expect(canSummon("RULES_2014", "Find Steed", "warhorse")).toBe(true);
    expect(canSummon("RULES_2014", "Summon Dragon", "draconic-spirit")).toBe(false);
    expect(canSummon("RULES_2024", "Summon Dragon", "draconic-spirit")).toBe(true);
  });

  it("запит на закликання: точку тиснемо в межі мапи, без назв чи точки — відмова", () => {
    expect(parseSummonRequest({ spellEngName: "Find Familiar", creatureKey: "owl", position: { x: 1.4, y: 0.25 } })).toEqual({ spellEngName: "Find Familiar", creatureKey: "owl", position: { x: 1, y: 0.25 } });
    expect(parseSummonRequest({ spellEngName: "Find Familiar", creatureKey: 7, position: { x: 0.5, y: 0.5 } })).toBeNull();
    expect(parseSummonRequest({ spellEngName: "Find Familiar", creatureKey: "owl" })).toBeNull();
    expect(parseSummonRequest(null)).toBeNull();
  });

  it("заклинання виклику впізнає за назвою будь-якої редакції, решту — ні", () => {
    expect([isSummonSpell("Find Familiar"), isSummonSpell("Summon Fey"), isSummonSpell("Fireball"), isSummonSpell("toString"), isSummonSpell(null)]).toEqual([true, true, false, false, false]);
  });
});
