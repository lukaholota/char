// Опційна риса класу, що дає замінити один відомий варіант вибору на інший на підвищенні рівня.
// Три старі групи мають власні прапорці; будь-яка інша (криваві прокляття, мутагени мисливця за
// кровʼю) називає групу в `replacesChoiceGroup`.

export type ChoiceReplacementSource = {
  replacesInvocation?: boolean | null;
  replacesFightingStyle?: boolean | null;
  replacesManeuver?: boolean | null;
  replacesChoiceGroup?: string | null;
};

const INVOCATIONS_GROUP = "Потойбічні виклики";
const FIGHTING_STYLE_GROUP = "Бойовий стиль";
const MANEUVERS_GROUP = "Маневри майстра бою";

export function findReplacedChoiceGroup(source: ChoiceReplacementSource): string | null {
  if (source.replacesInvocation) return INVOCATIONS_GROUP;
  if (source.replacesFightingStyle) return FIGHTING_STYLE_GROUP;
  if (source.replacesManeuver) return MANEUVERS_GROUP;
  return source.replacesChoiceGroup?.trim() || null;
}

/// Бойовий стиль у базі живе під кількома назвами групи («Бойовий стиль», «Fighting Style …»).
export function isReplacedGroupMatch(replacedGroup: string, optionGroup: string | null | undefined): boolean {
  const group = String(optionGroup ?? "");
  if (replacedGroup !== FIGHTING_STYLE_GROUP) return group === replacedGroup;
  const normalized = group.trim().toLowerCase();
  return normalized.includes("бойовий стиль") || normalized.includes("fighting style");
}
