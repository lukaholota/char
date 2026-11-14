import type { Skill } from "@/lib/types/enums";

export type SkillPickSource = { key: string; options: readonly Skill[]; count: number; picked: readonly Skill[] | undefined };

/// Чернетка повертає старі вибори, а джерела за цей час могли змінитися: інший клас, інша опція
/// раси, передісторія, що вже дає ту саму навичку. Лишається тільки те, що група досі пропонує
/// й чого ще ніхто не дав; раніші в переліку групи мають першість.
export function settleSkillPicks(sources: readonly SkillPickSource[], ownedOutsideGroups: readonly Skill[]): Record<string, Skill[]> {
  const taken = new Set<Skill>(ownedOutsideGroups);

  return Object.fromEntries(sources.map(({ key, options, count, picked }) => {
    const kept = [...new Set(picked ?? [])].filter((skill) => options.includes(skill) && !taken.has(skill)).slice(0, count);
    kept.forEach((skill) => taken.add(skill));
    return [key, kept];
  }));
}
