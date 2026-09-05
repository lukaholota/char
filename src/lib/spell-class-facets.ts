import { classTranslations, classTranslationsEng, subclassTranslations } from "@/lib/refs/translation";
import { subclassParentClass } from "@/lib/refs/subclassMapping";

/// Список класів у заклинанні змішує базові класи й підкласи в одному полі («Клірик» поруч із
/// «Домен життя»). Фільтр каталогу розводить їх: у «Класи» потрапляє лише те, що є класом у
/// словнику, решта — у «Підкласи», згруповані за батьківським класом.

const BASE_CLASS_NAMES_UA: Set<string> = new Set<string>(Object.values(classTranslations));
const CLASS_KEY_TO_UA: Record<string, string> = classTranslations as unknown as Record<string, string>;

const CLASS_ENG_TO_UA: Record<string, string> = Object.fromEntries(
  Object.entries(classTranslationsEng as unknown as Record<string, string>).map(([key, eng]) => [
    eng,
    CLASS_KEY_TO_UA[key] || eng,
  ])
);

/// Підкласи, що беруть заклинання зі списку чарівника, але не мають власного батьківського
/// класу в мапі: фільтр за ними показує заклинання чарівника.
export const SUBCLASS_FILTER_FALLBACK_CLASS: Record<string, string> = {
  [subclassTranslations.ELDRITCH_KNIGHT]: classTranslations.WIZARD_2014,
  [subclassTranslations.ARCANE_TRICKSTER]: classTranslations.WIZARD_2014,
};

export function normalizeBaseClassValue(raw: string): string {
  const v = (raw || "").trim();
  if (!v) return "";
  if (BASE_CLASS_NAMES_UA.has(v)) return v;
  if (v in CLASS_KEY_TO_UA) return CLASS_KEY_TO_UA[v];
  if (v in CLASS_ENG_TO_UA) return CLASS_ENG_TO_UA[v];
  return v;
}

export function isBaseClassName(value: string): boolean {
  return BASE_CLASS_NAMES_UA.has(normalizeBaseClassValue(value));
}

export type SubclassGroup = { className: string; subclasses: string[] };

export function collectSpellClassFacets(
  spells: readonly { spellClasses: readonly { className: string }[] }[]
): { classes: string[]; subclassesByClass: SubclassGroup[] } {
  const classes = new Set<string>();
  const subclasses = new Set<string>();

  for (const spell of spells) {
    for (const entry of spell.spellClasses) {
      if (isBaseClassName(entry.className)) classes.add(normalizeBaseClassValue(entry.className));
      else if (entry.className.trim()) subclasses.add(entry.className);
    }
  }

  return {
    classes: Array.from(classes).sort((a, b) => a.localeCompare(b, "uk")),
    subclassesByClass: groupSubclassesByParent(subclasses),
  };
}

function groupSubclassesByParent(subclasses: Set<string>): SubclassGroup[] {
  const grouped = new Map<string, string[]>();
  for (const subclass of subclasses) {
    const parent = subclassParentClass[subclass] || SUBCLASS_FILTER_FALLBACK_CLASS[subclass] || "Інші";
    grouped.set(parent, [...(grouped.get(parent) ?? []), subclass]);
  }

  return Array.from(grouped.entries())
    .map(([className, names]) => ({
      className,
      subclasses: names.sort((a, b) => a.localeCompare(b, "uk")),
    }))
    .sort((a, b) => a.className.localeCompare(b.className, "uk"));
}
