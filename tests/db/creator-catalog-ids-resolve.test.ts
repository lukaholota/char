import type { Ruleset } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { findCharacterCreatorOptions } from "@/lib/content/creator-content";
import {
  collectCatalogChoiceReferences,
  findChoiceReferenceMismatches,
} from "@/lib/content/creator-catalog-choice-references";
import { prisma } from "@/lib/prisma";

/// O31. `subclass_choice_option` під 2024 наповнили сідом окремо в проді й окремо в клоні, тож
/// однакові опції дістали різні id: каталог ніс 3700, `spells_test` — 3984. Сервер звіряє вибір
/// із каталогом, а пише в базу, тому кожен підкласовий вибір 2024 на своєму ж рівні відхилявся
/// словами «Обрана опція недоступна на цьому рівні». Симптом не називав причину — цей сторож
/// називає.
const RULESETS: Ruleset[] = ["RULES_2014", "RULES_2024"];

describe("O31 — id виборів у каталозі конструктора існують у базі, до якої йде запис", () => {
  for (const ruleset of RULESETS) {
    it(`${ruleset}: кожен choiceOptionId каталогу знаходиться в базі під тією самою назвою`, async () => {
      const references = collectCatalogChoiceReferences(findCharacterCreatorOptions(ruleset));
      expect(references.length).toBeGreaterThan(0);

      const rows = await prisma.choiceOption.findMany({
        select: { choiceOptionId: true, optionNameEng: true },
      });
      const optionNameEngById = new Map(rows.map((row) => [row.choiceOptionId, row.optionNameEng]));

      expect(findChoiceReferenceMismatches(references, optionNameEngById)).toEqual([]);
    });
  }
});
