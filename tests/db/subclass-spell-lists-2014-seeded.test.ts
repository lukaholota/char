/**
 * KR31.18 — розширені списки покровителів і заклинання дунамантії 2014 мусять стояти в `spell_classes`, а Магічна рука
 * Містичного спритника — у `subclass_spell`. Файл із корпусом звіряє
 * `tests/content/warlock-expanded-spell-lists-2014.test.ts`; тут — що сід доніс його до бази.
 */

import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { findSubclassSpellListDrift } from "../../prisma/seed/subclassSpellLists2014";
import { disconnectDatabase } from "../user-data";

afterAll(disconnectDatabase);

describe("KR31.18 — списки заклинань підкласів 2014 у базі", () => {
  it("покровителі й школи дунамантії мають у spell_classes рівно те, що у файлах, дунамантії немає у списку чарівника, а Містичний спритник має Магічну руку з 3-го рівня", async () => {
    const drift = await findSubclassSpellListDrift(prisma);

    expect(drift.missing).toEqual([]);
    expect(drift.extra).toEqual([]);
    expect(drift.isArcaneTricksterGranted).toBe(true);
    expect(drift.genieKindMissing).toEqual([]);
  });
});
