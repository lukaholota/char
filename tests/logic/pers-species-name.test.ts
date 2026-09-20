import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SPECIES_LINEAGE_CHOICE_GROUPS, buildPersSpeciesName } from "@/lib/logic/pers-species-name";

describe("KR31.10 / L15-print-07 — назва виду для друку", () => {
  it("2024: вид несе обраний родовід, а не вибір характеристики", () => {
    const pers = {
      ruleset: "RULES_2024" as const,
      race: { name: "ELF_2024" },
      raceChoiceOptions: [
        { choiceGroupName: "Ельфійський родовід", optionName: "Дроу" },
        { choiceGroupName: "Базова характеристика заклинань", optionName: "Харизма" },
        { choiceGroupName: "Гострі чуття", optionName: "Уважність" },
      ],
    };

    expect(buildPersSpeciesName(pers)).toBe("Ельф (Дроу)");
  });

  it("2024: вид без родоводу друкується голою назвою", () => {
    expect(buildPersSpeciesName({ ruleset: "RULES_2024", race: { name: "HUMAN_2024" }, raceChoiceOptions: [] })).toBe("Людина");
  });

  it("2014: підраса вже містить повну назву й заміняє расу", () => {
    const pers = { ruleset: "RULES_2014" as const, race: { name: "ELF_2014" }, subrace: { name: "ELF_DARK_DROW_2014" } };

    expect(buildPersSpeciesName(pers)).toBe("Темний ельф (Дроу)");
  });

  it("2014: варіант раси друкується, коли підраси немає", () => {
    const pers = { ruleset: "RULES_2014" as const, race: { name: "TIEFLING_2014" }, subrace: null, raceVariants: [{ name: "TIEFLING_ASMODEUS" }] };

    expect(buildPersSpeciesName(pers)).toBe("Тифлінг (Асмодей)");
  });

  it("кожна група родоводу існує в сіді виборів видів 2024", () => {
    const seed = readFileSync("prisma/seed/speciesChoices2024.ts", "utf8");
    const seededGroups = [...seed.matchAll(/groupName: "([^"]+)"/g)].map((match) => match[1]);

    for (const group of SPECIES_LINEAGE_CHOICE_GROUPS) expect(seededGroups).toContain(group);
  });
});
