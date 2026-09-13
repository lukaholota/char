/**
 * KR31.6 — «Майстер на всі руки» шукається за назвою фічі, тож кожна назва реєстру мусить бути
 * фічею барда 2-го рівня у своїй редакції, а жодна інша фіча з такою назвою не лишається поза ним.
 */

import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { JACK_OF_ALL_TRADES_FEATURE_ENG_NAMES } from "@/rules/proficiency";

describe("реєстр «Майстра на всі руки» проти бази", () => {
  it("кожна назва — фіча барда 2-го рівня", async () => {
    const links = await prisma.classFeature.findMany({
      where: { feature: { engName: { in: [...JACK_OF_ALL_TRADES_FEATURE_ENG_NAMES] } } },
      select: { levelGranted: true, class: { select: { name: true } }, feature: { select: { engName: true } } },
    });

    const found = links
      .map((link) => `${link.feature.engName} → ${link.class.name} ${link.levelGranted}`)
      .sort();

    expect(found).toEqual(["Bard: Jack of all Trades (2024) → BARD_2024 2", "Jack of All Trades → BARD_2014 2"]);
  });

  it("інших фіч «Jack of All Trades» у базі немає", async () => {
    const features = await prisma.feature.findMany({
      where: { engName: { contains: "jack of all trades", mode: "insensitive" } },
      select: { engName: true },
    });

    const outsideRegistry = features
      .map((feature) => feature.engName)
      .filter((engName) => !(JACK_OF_ALL_TRADES_FEATURE_ENG_NAMES as readonly string[]).includes(engName));

    expect(outsideRegistry).toEqual([]);
  });
});
