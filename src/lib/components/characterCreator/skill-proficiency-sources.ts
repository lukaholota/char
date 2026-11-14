import type { SkillProficiencies, SkillProficienciesChoice } from "@/lib/types/model-types";
import { type Skill, SkillsEnum } from "@/lib/types/enums";

export function isSkill(value: unknown): value is Skill {
  return typeof value === "string" && (SkillsEnum as readonly string[]).includes(value)
}

export function normalizeSkillProficiencies(value: unknown): SkillProficiencies | null {
  if (!value) return null

  if (Array.isArray(value)) {
    return value.filter(isSkill) as unknown as SkillProficiencies
  }

  if (typeof value === "object") {
    const maybe = value as { options?: unknown; choices?: unknown; choiceCount?: unknown; chooseAny?: unknown }
    
    // Support both 'options' and 'choices' (legacy/seed format)
    const optionsSource = Array.isArray(maybe.options) ? maybe.options : Array.isArray(maybe.choices) ? maybe.choices : undefined;
    
    if (typeof maybe.choiceCount === "number" && optionsSource) {
      // Allow 'ANY' (used in Custom Lineage) or valid skills
      const options = optionsSource.filter(s => isSkill(s) || s === 'ANY') as Skill[] // Cast to satisfy type (ANY treated as valid)
      const chooseAny = typeof maybe.chooseAny === "boolean" ? maybe.chooseAny : undefined
      // Always return normalized object with 'options' key for internal consistency
      return { options, choiceCount: maybe.choiceCount, chooseAny }
    }
  }

  return null
}

/// Скільки навичок це джерело дає **обрати**. Готовий список — не вибір: ельф просто має
/// Уважність, кнопок для неї на кроці немає. Поки список рахувався як вибір, «Далі» вимагала
/// вибору, якого ніде було зробити, і ельф, напіворк, табаксі та ще півтора десятка рас
/// замикали конструктор намертво.
export function findSkillChoiceCount(skillProfs: SkillProficiencies | null): number {
  if (!skillProfs) return 0;

  if (Array.isArray(skillProfs)) return 0

  return skillProfs.choiceCount
}

/// «Будь-яка навичка» приходить двома виглядами: явним `ANY` (Своя раса) і порожнім списком —
/// так лежать кенку, ворожденний і три раси з VRGtR, яким переліку в контенті просто не завели.
/// Розгортається лише ці два випадки: раса зі **своїм** переліком (кентавр, людоящір, тортл)
/// мусить лишитися при ньому, інакше крок дає обрати будь-що замість чотирьох названих навичок.
export function expandSkillOptions(profs: SkillProficienciesChoice | null | undefined): Skill[] {
  if (!profs) return [];

  const options = profs.options ?? [];
  if (!options.length || options.includes("ANY" as unknown as Skill)) return [...SkillsEnum];

  return options as Skill[];
}
