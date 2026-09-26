/**
 * O48 — заклинання, які підклас 2014 дає сам, мусять стояти в `subclass_spell` рівно як у файлі.
 * Файл із корпусом звіряє `tests/content/subclass-granted-spells-2014-corpus.test.ts`; тут — що сід доніс його до бази.
 */

import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { findSubclassGrantedSpellDrift } from "../../prisma/seed/subclassGrantedSpells2014";
import { disconnectDatabase } from "../user-data";

afterAll(disconnectDatabase);

describe("O48 — заклинання підкласів 2014 у базі", () => {
  it("subclass_spell 2014 дорівнює data/2014/subclass-granted-spells.json", async () => {
    expect(await findSubclassGrantedSpellDrift(prisma)).toEqual({ missing: [], extra: [], wrongLevel: [] });
  });
});
