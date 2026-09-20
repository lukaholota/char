// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { DEFAULT_SCHOOL_VISUAL, findSchoolVisual as schoolVisualByValue } from "@/lib/refs/spell-school-visual";

/// KR40.4: характеризаційний тест. Написаний до виносу `schoolVisualByValue` з `SpellListGroup`
/// у `src/lib/refs/spell-school-visual.ts` і прогнаний на старому коді — тільки тому він доводить,
/// що винос нічого не змінив.

const EXPECTED: [string, string, string, string][] = [
  ["evocation", "Flame", "bg-rose-950/55 border-rose-800/50", "text-rose-300"],
  ["Втілення", "Flame", "bg-rose-950/55 border-rose-800/50", "text-rose-300"],
  ["necromancy", "Skull", "bg-emerald-950/55 border-emerald-800/45", "text-emerald-300"],
  ["Некромантія", "Skull", "bg-emerald-950/55 border-emerald-800/45", "text-emerald-300"],
  ["abjuration", "Shield", "bg-sky-950/55 border-sky-800/45", "text-sky-300"],
  ["Захист", "Shield", "bg-sky-950/55 border-sky-800/45", "text-sky-300"],
  ["Огородження", "Shield", "bg-sky-950/55 border-sky-800/45", "text-sky-300"],
  ["conjuration", "WandSparkles", "bg-arcane-950/55 border-arcane-800/45", "text-arcane-300"],
  ["Виклик", "WandSparkles", "bg-arcane-950/55 border-arcane-800/45", "text-arcane-300"],
  ["divination", "Eye", "bg-amber-950/55 border-amber-800/50", "text-amber-300"],
  ["Ворожіння", "Eye", "bg-amber-950/55 border-amber-800/50", "text-amber-300"],
  ["Віщування", "Eye", "bg-amber-950/55 border-amber-800/50", "text-amber-300"],
  ["enchantment", "Heart", "bg-pink-950/55 border-pink-800/50", "text-pink-300"],
  ["Причарування", "Heart", "bg-pink-950/55 border-pink-800/50", "text-pink-300"],
  ["Зачарування", "Heart", "bg-pink-950/55 border-pink-800/50", "text-pink-300"],
  ["illusion", "Ghost", "bg-cyan-950/55 border-cyan-800/45", "text-cyan-100"],
  ["Ілюзія", "Ghost", "bg-cyan-950/55 border-cyan-800/45", "text-cyan-100"],
  ["transmutation", "Atom", "bg-purple-950/60 border-purple-800/50", "text-purple-300"],
  ["Перетворення", "Atom", "bg-purple-950/60 border-purple-800/50", "text-purple-300"],
];

describe("вигляд школи заклинання", () => {
  it.each(EXPECTED)("%s → %s", (school, iconName, wrap, color) => {
    const visual = schoolVisualByValue(school);
    expect(visual.icon.displayName ?? visual.icon.name).toBe(iconName);
    expect(visual.iconWrap).toBe(wrap);
    expect(visual.iconColor).toBe(color);
  });

  it.each(["", "   ", "невідома школа", null, undefined])("%s → дефолт", (school) => {
    expect(schoolVisualByValue(school as string | null | undefined)).toEqual(DEFAULT_SCHOOL_VISUAL);
  });

  it("дефолт лишається тим самим", () => {
    expect(DEFAULT_SCHOOL_VISUAL.iconWrap).toBe("bg-slate-900/65 border-slate-600/60");
    expect(DEFAULT_SCHOOL_VISUAL.iconColor).toBe("text-slate-300");
  });
});
