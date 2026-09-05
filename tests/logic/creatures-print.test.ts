import { describe, expect, it } from "vitest";

import { findCreatureByKey } from "@/lib/bestiaryData";
import {
  buildCreaturesPrintHtml,
  loadPrintableCreatures,
} from "@/server/pdf/creaturesPdf";
import { parseCreaturePrintRequest } from "@/server/pdf/creaturePrintRequest";

describe("creature print request", () => {
  it("keeps the edition beside the creature keys", () => {
    const request = parseCreaturePrintRequest(
      new URLSearchParams("ruleset=RULES_2024&keys=wolf,badger")
    );

    expect(request).toEqual({
      ruleset: "RULES_2024",
      keys: ["wolf", "badger"],
    });
  });

  it("rejects an empty creature selection", () => {
    expect(() => parseCreaturePrintRequest(new URLSearchParams("ruleset=RULES_2014"))).toThrow(
      "Оберіть хоча б одну істоту"
    );
  });

  it("limits a single PDF job to fifty creatures", () => {
    const keys = Array.from({ length: 51 }, (_, index) => `creature-${index}`).join(",");

    expect(() =>
      parseCreaturePrintRequest(new URLSearchParams(`ruleset=RULES_2014&keys=${keys}`))
    ).toThrow("до 50 істот");
  });
});

describe("printable creatures", () => {
  it("loads statblocks from the requested static catalog", () => {
    const wolf2014 = findCreatureByKey("wolf", "RULES_2014");
    expect(wolf2014).not.toBeNull();

    const loaded = loadPrintableCreatures(["wolf"], "RULES_2014");

    expect(loaded).toHaveLength(1);
    expect(loaded[0].nameEng).toBe(wolf2014?.nameEng);
    expect(loaded[0].ruleset).toBe("RULES_2014");
    expect(loaded[0]).not.toHaveProperty("imageUrl");
    expect(loaded[0]).not.toHaveProperty("imageWidth");
    expect(loaded[0]).not.toHaveProperty("imageHeight");
  });

  it("keeps the same creature slug isolated by ruleset", () => {
    const wolf2014 = loadPrintableCreatures(["wolf"], "RULES_2014")[0];
    const wolf2024 = loadPrintableCreatures(["wolf"], "RULES_2024")[0];

    expect(wolf2014.ruleset).toBe("RULES_2014");
    expect(wolf2024.ruleset).toBe("RULES_2024");
    expect(wolf2014.source).not.toBe(wolf2024.source);
  });

  it("fails instead of silently dropping an unknown key", () => {
    expect(() => loadPrintableCreatures(["definitely-not-a-creature"], "RULES_2014")).toThrow(
      "Істоту не знайдено"
    );
  });

  it("builds a mechanical statblock without portrait or glossary payload", async () => {
    const wolf = findCreatureByKey("wolf", "RULES_2014");
    expect(wolf).not.toBeNull();
    if (!wolf) return;

    const html = await buildCreaturesPrintHtml([
      {
        ...wolf,
        imageUrl: "/images/creatures/wolf.webp",
        specialAbilities: "***Гострий нюх{{Keen Smell}}.*** Вовк має перевагу.",
      },
    ]);

    expect(html).toContain("Гострий нюх");
    expect(html).toContain("ОСОБЛИВОСТІ");
    expect(html).toContain("ДІЇ");
    expect(html).not.toContain("Keen Smell");
    expect(html).not.toContain("{{");
    expect(html).not.toContain("wolf.webp");
    expect(html).not.toContain("<img");
    expect(html).toContain("column-count: 2");
    expect(html).toContain("column-fill: auto");
    expect(html).toContain(".statblock { display: block;");
    expect(html).not.toContain(".statblock { display: inline-block;");
    expect(html).toContain("background: #fff");
    expect(html).toContain("color: #000");
    for (const printColor of ["#2d211a", "#fff9df", "#b68b28", "#7f1d1d", "#6f1d1b"]) {
      expect(html).not.toContain(printColor);
    }
    expect(html).not.toContain("БОНУСНІ ДІЇ");
    expect(html).not.toContain("ЛЕГЕНДАРНІ ДІЇ");
  });

  it("renders every populated mechanical section", async () => {
    const wolf = findCreatureByKey("wolf", "RULES_2014");
    expect(wolf).not.toBeNull();
    if (!wolf) return;

    const html = await buildCreaturesPrintHtml([
      {
        ...wolf,
        bonusActions: "***Ривок.*** Вовк рухається.",
        reactions: "***Відскок.*** Вовк відступає.",
        legendaryActions: "***Рух.*** Вовк рухається.",
        lairInfo: "Вовче лігво.",
        lairActions: "Лігво діє.",
        regionEffects: "Вовків більшає.",
        mythicInfo: "Вовк стає міфічним.",
        mythicActions: "***Виття.*** Вовк виє.",
      },
    ]);

    for (const heading of [
      "ОСОБЛИВОСТІ",
      "ДІЇ",
      "БОНУСНІ ДІЇ",
      "РЕАКЦІЇ",
      "ЛЕГЕНДАРНІ ДІЇ",
      "ЛІГВО",
      "ДІЇ ЛІГВА",
      "РЕГІОНАЛЬНІ ЕФЕКТИ",
      "МІФІЧНІ ДІЇ",
    ]) {
      expect(html).toContain(heading);
    }
  });
});
