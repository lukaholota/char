import { countWithWordUk, type UkrainianWordForms } from "@/lib/ukrainian-plural";

/// Предмет застосовує заклинання за заряди: перший дає baseLevel, кожен наступний піднімає рівень на 1.
export type ItemSpellUse = { spellEngName: string; baseLevel: number; saveDC: number | null; chargeForms: UkrainianWordForms; actionLabel: string };

const CHARGES = { one: "заряд", few: "заряди", many: "зарядів" };
const ITEM_SPELL_USES: Record<string, ItemSpellUse> = {
  "Necklace of Fireballs": { spellEngName: "Fireball", baseLevel: 3, saveDC: 15, chargeForms: { one: "намистина", few: "намистини", many: "намистин" }, actionLabel: "Кинути" },
  "Wand of Fireballs": { spellEngName: "Fireball", baseLevel: 3, saveDC: 15, chargeForms: CHARGES, actionLabel: "Застосувати" },
  "Wand of Lightning Bolts": { spellEngName: "Lightning Bolt", baseLevel: 3, saveDC: 15, chargeForms: CHARGES, actionLabel: "Застосувати" },
  "Wand of Magic Missiles": { spellEngName: "Magic Missile", baseLevel: 1, saveDC: null, chargeForms: CHARGES, actionLabel: "Застосувати" },
};
const MAX_SPELL_LEVEL = 9;

export const findItemSpellUse = (item: { engName: string | null }) => ITEM_SPELL_USES[item.engName ?? ""] ?? null;

export const findSpellLevelForCharges = (use: ItemSpellUse, charges: number) => use.baseLevel + charges - 1;

/// Більше зарядів, ніж лишилось, чи понад 9 рівень витратити не можна; невідомий запас обмежує лише рівень.
export const findMaxChargesPerUse = (use: ItemSpellUse, chargesLeft: number | null) => Math.min(MAX_SPELL_LEVEL - use.baseLevel + 1, chargesLeft ?? Infinity);

export const describeCharges = (use: ItemSpellUse, count: number) => countWithWordUk(count, use.chargeForms);
