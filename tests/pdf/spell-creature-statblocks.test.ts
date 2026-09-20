import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Ruleset } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase } from "../user-data";

vi.mock("@/server/pdf/pdfUtils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/pdf/pdfUtils")>()),
  generatePdfFromHtml: vi.fn(async () => new Uint8Array()),
}));

import { generatePdfFromHtml } from "@/server/pdf/pdfUtils";
import { generateSpellsPdfBytes } from "@/server/pdf/spellsPdf";

afterAll(disconnectDatabase);

async function findSpellId(engName: string, ruleset: Ruleset): Promise<number> {
  const spell = await prisma.spell.findUniqueOrThrow({ where: { engName_ruleset: { engName, ruleset } }, select: { spellId: true } });
  return spell.spellId;
}

async function printSpellsHtml(spellIds: number[]): Promise<string> {
  vi.mocked(generatePdfFromHtml).mockClear();
  await generateSpellsPdfBytes(spellIds);
  return vi.mocked(generatePdfFromHtml).mock.calls[0][0];
}

function countStatblocks(html: string): number {
  return html.match(/<article class="statblock">/g)?.length ?? 0;
}

describe("статблок істоти друкується під заклинанням, що її викликає", () => {
  let summonBeast2014 = "";
  let summonBeast2024 = "";
  let fireball = "";

  beforeAll(async () => {
    summonBeast2014 = await printSpellsHtml([await findSpellId("Summon Beast", "RULES_2014")]);
    summonBeast2024 = await printSpellsHtml([await findSpellId("Summon Beast", "RULES_2024")]);
    fireball = await printSpellsHtml([await findSpellId("Fireball", "RULES_2014")]);
  });

  it("2014: під «Викликом звіра» — статблок духу звіра, у тексті — позначка", () => {
    expect(countStatblocks(summonBeast2014)).toBe(1);
    expect(summonBeast2014).toContain("<h1>Дух звіра [Bestial Spirit]</h1>");
    expect(summonBeast2014).toContain("Духу Звіра (статблок — нижче)");
  });

  it("2024: те саме зі статблоком своєї редакції", () => {
    expect(countStatblocks(summonBeast2024)).toBe(1);
    expect(summonBeast2024).toContain("Дух звіра [Bestial Spirit]</h1>");
    expect(summonBeast2024).toContain("«Дух звіра [Bestial Spirit]» (статблок — нижче)");
  });

  it("на папері немає ні посилань, ні англійських маркерів", () => {
    for (const html of [summonBeast2014, summonBeast2024]) {
      expect(html).not.toMatch(/<a\b/);
      expect(html).not.toContain("{{");
    }
  });

  it("заклинання без істоти друкується без статблока", () => {
    expect(countStatblocks(fireball)).toBe(0);
    expect(fireball).not.toContain("статблок — нижче");
  });
});
