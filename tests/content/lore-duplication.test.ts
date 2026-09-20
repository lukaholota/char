import { describe, expect, it } from "vitest";

import loreGroupsJson from "@/lib/generated/creature-lore-groups.json";
import creatures2014 from "@/lib/generated/creatures.json";
import creatures2024 from "@/lib/generated/creatures2024.json";
import { isDescriptionRepeatingLore } from "@/lib/logic/lore-duplication";

type LoreGroup = { key: string; ruleset: string; description: string; creatureIds: number[] };
type CatalogRow = { creatureId: number; nameEng: string; description?: string | null };

const loreGroups = loreGroupsJson as LoreGroup[];
const catalogs: Record<string, CatalogRow[]> = {
  RULES_2014: creatures2014 as CatalogRow[],
  RULES_2024: creatures2024 as CatalogRow[],
};

function findVerdict(ruleset: string, nameEng: string): boolean {
  const row = catalogs[ruleset].find((creature) => creature.nameEng === nameEng);
  if (!row) throw new Error(`${ruleset}: у каталозі немає ${nameEng}`);
  const group = loreGroups.find((candidate) => candidate.ruleset === ruleset && candidate.creatureIds.includes(row.creatureId));
  return isDescriptionRepeatingLore(row.description, group?.description ?? null);
}

/// Опис дракона 2024 — це інший переклад вступу його групи, і на сторінці той самий текст стояв
/// двічі. Опис ааракокри-застрільника — власні два речення з книги, його ховати не можна.
describe("повтор вступу групи під статблоком", () => {
  it("упізнає опис, що переказує вступ групи", () => {
    expect(findVerdict("RULES_2024", "Ancient Blue Dragon")).toBe(true);
    expect(findVerdict("RULES_2024", "Young Black Dragon")).toBe(true);
    expect(findVerdict("RULES_2024", "Owlbear")).toBe(true);
    expect(findVerdict("RULES_2024", "Bandit")).toBe(true);
  });

  it("лишає власний опис істоти", () => {
    expect(findVerdict("RULES_2024", "Aarakocra Skirmisher")).toBe(false);
    expect(findVerdict("RULES_2024", "Myconid Sprout")).toBe(false);
    /// Одне речення майже самими словами вступу — коротке не ховаємо: це не повтор, а витяг.
    expect(findVerdict("RULES_2024", "Myconid Adult")).toBe(false);
    expect(findVerdict("RULES_2024", "Skeleton")).toBe(false);
    expect(findVerdict("RULES_2014", "Adult Red Dragon")).toBe(false);
    expect(findVerdict("RULES_2014", "Animated Armor")).toBe(false);
  });

  it("без вступу групи опис лишається завжди", () => {
    expect(isDescriptionRepeatingLore("<p>Будь-який опис істоти.</p>", null)).toBe(false);
    expect(isDescriptionRepeatingLore(null, "Вступ до групи істот.")).toBe(false);
  });
});
