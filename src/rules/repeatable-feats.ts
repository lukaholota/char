// Повтор дозволяє сама риса (isRepeatable), а не категорія: Skilled береться скільки завгодно,
// Magic Initiate — лише з іншим списком заклинань, Skill Expert — ніколи. Так у PHB 2014
// («You can take each feat only once, unless the feat's description says otherwise») і в 2024
// (властивість Repeatable). Рішення власника 2026-09-03, Р37 у docs/DECISIONS.md.

export type FeatChoicePick = { groupName: string; optionNameEng: string };

export type FeatInstance = {
  featName: string;
  choices: readonly FeatChoicePick[];
};

export type FeatRepeatCandidate = {
  name: string;
  isRepeatable: boolean;
  choices: readonly FeatChoicePick[];
};

export type FeatRepeatProblem =
  | { kind: "not-repeatable"; featName: string }
  | { kind: "same-choice"; featName: string; groupName: string; optionNameEng: string };

// Повторна риса з вибором має брати щоразу інший: «you must choose a different damage type each
// time» (Elemental Adept) і «choose a different class each time» (Magic Initiate).
const UNIQUE_CHOICE_GROUP_BY_FEAT: Record<string, string> = {
  MAGIC_INITIATE: "Список заклинань",
  ELEMENTAL_ADEPT: "Тип шкоди",
};

export function findFeatRepeatProblem(
  candidate: FeatRepeatCandidate,
  taken: readonly FeatInstance[],
): FeatRepeatProblem | null {
  const previous = taken.filter((instance) => instance.featName === candidate.name);
  if (!previous.length) return null;
  if (!candidate.isRepeatable) return { kind: "not-repeatable", featName: candidate.name };

  return findRepeatedUniqueChoice(candidate, previous);
}

// Пакет створення несе кілька рис одразу (походження плюс Універсальність Людини), і вони
// мають звірятися й між собою, а не лише з уже взятими.
export function findFeatRepeatProblemInBatch(
  candidates: readonly FeatRepeatCandidate[],
  alreadyTaken: readonly FeatInstance[] = [],
): FeatRepeatProblem | null {
  const taken: FeatInstance[] = [...alreadyTaken];
  for (const candidate of candidates) {
    const problem = findFeatRepeatProblem(candidate, taken);
    if (problem) return problem;
    taken.push({ featName: candidate.name, choices: candidate.choices });
  }
  return null;
}

function findRepeatedUniqueChoice(candidate: FeatRepeatCandidate, previous: readonly FeatInstance[]): FeatRepeatProblem | null {
  const groupName = UNIQUE_CHOICE_GROUP_BY_FEAT[candidate.name];
  if (!groupName) return null;

  const chosen = candidate.choices.find((pick) => pick.groupName === groupName);
  if (!chosen) return null;

  const repeated = previous.some((instance) =>
    instance.choices.some((pick) => pick.groupName === groupName && pick.optionNameEng === chosen.optionNameEng),
  );
  return repeated ? { kind: "same-choice", featName: candidate.name, groupName, optionNameEng: chosen.optionNameEng } : null;
}

// Право взяти рису задає джерело вибору, а не її категорія (Р41 у docs/DECISIONS.md): класовий
// ASI каже «another feat of your choice for which you qualify» і категорії не називає.
//
// Окремого джерела під епічний дар немає навмисно (Р39): 19-й рівень класу формулює право тим
// самим реченням, що й класовий ASI, — «an Epic Boon feat or another feat of your choice for
// which you qualify», — тож обмеження в нього те саме, і відсіює непридатне prerequisiteLevel.
export type FeatChoiceSource = "BACKGROUND_ORIGIN" | "SPECIES_VERSATILITY" | "CLASS_ASI" | "FIGHTING_STYLE";

const ALLOWED_CATEGORIES_BY_SOURCE: Record<FeatChoiceSource, readonly string[] | "any"> = {
  BACKGROUND_ORIGIN: ["ORIGIN"],
  SPECIES_VERSATILITY: ["ORIGIN"],
  CLASS_ASI: "any",
  FIGHTING_STYLE: ["FIGHTING_STYLE"],
};

// Риси 2014 категорії не мають, тож для них джерело нічого не обмежує.
export function isFeatCategoryAllowed(source: FeatChoiceSource, category: string | null | undefined): boolean {
  if (!category) return true;
  const allowed = ALLOWED_CATEGORIES_BY_SOURCE[source];
  return allowed === "any" || allowed.includes(category);
}
