import { afterAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { findCatalogSpellIdsForKeys, PrintableSpellNotFoundError } from "@/server/db/print-content";
import { buildSpells2024 } from "@/lib/spellsData";
import spells2024Json from "../../data/2024/normalized/spells.json";
import { disconnectDatabase } from "../user-data";

afterAll(disconnectDatabase);

describe("ключ друку заклинання", () => {
  it("зводить слаг 2024 до рядка бази — саме ним каталог і зветься", async () => {
    const [spellId] = await findCatalogSpellIdsForKeys(["summon-beast"], "RULES_2024");
    const spell = await prisma.spell.findUniqueOrThrow({ where: { spellId } });

    expect(spell.engName).toBe("Summon Beast");
    expect(spell.ruleset).toBe("RULES_2024");
  });

  it("не плутає редакції на однаковій назві", async () => {
    const [id2014] = await findCatalogSpellIdsForKeys(["summon-beast"], "RULES_2014");
    const [id2024] = await findCatalogSpellIdsForKeys(["summon-beast"], "RULES_2024");

    expect(id2014).not.toBe(id2024);
  });

  it("приймає номер 2014 як ключ — старі адреси лишаються робочими", async () => {
    const spell = await prisma.spell.findFirstOrThrow({ where: { ruleset: "RULES_2014" } });

    expect(await findCatalogSpellIdsForKeys([String(spell.spellId)], "RULES_2014")).toEqual([spell.spellId]);
  });

  it("відмовляє позиційному номеру каталогу 2024 замість порожнього PDF", async () => {
    const positionalId = buildSpells2024(spells2024Json).find((spell) => spell.engName === "Summon Beast")?.spellId;
    expect(positionalId).toBe(20158);

    await expect(findCatalogSpellIdsForKeys([String(positionalId)], "RULES_2024")).rejects.toThrow(
      PrintableSpellNotFoundError
    );
  });
});
