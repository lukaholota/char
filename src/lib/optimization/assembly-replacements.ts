import { isReplacedGroupMatch } from "@/rules/choice-replacement";
import type { AssemblyChoiceOption, AssemblyClass } from "./assembly-catalog";
import type { LevelDecisions } from "./types";

type OptionRef = NonNullable<LevelDecisions["replaceOptions"]>[number]["drop"];

export type OptionReplacement = { optionalFeatureId: number; group: string; remove: AssemblyChoiceOption; add: AssemblyChoiceOption };
export type OptionReplacementResolution = { replacements: OptionReplacement[]; problems: string[] };

export function resolveOptionReplacements(characterClass: AssemblyClass | undefined, classLevel: number, refs: LevelDecisions["replaceOptions"]): OptionReplacementResolution {
  const result: OptionReplacementResolution = { replacements: [], problems: [] };
  if (!characterClass) return result;
  for (const ref of refs ?? []) {
    const replacement = resolveOne(characterClass, classLevel, ref, result.problems);
    if (!replacement) continue;
    if (result.replacements.some((entry) => entry.optionalFeatureId === replacement.optionalFeatureId)) {
      result.problems.push(`replaceOptions: у групі «${replacement.group}» на одному рівні можна замінити лише один вибір`);
      continue;
    }
    result.replacements.push(replacement);
  }
  return result;
}

function resolveOne(characterClass: AssemblyClass, classLevel: number, ref: { drop: OptionRef; add: OptionRef }, problems: string[]): OptionReplacement | null {
  const remove = findClassOption(characterClass, ref.drop, "drop", problems);
  const add = findClassOption(characterClass, ref.add, "add", problems);
  if (!remove || !add) return null;
  const feature = characterClass.replacementFeatures.find((entry) => entry.levelsGranted.includes(classLevel) && isReplacedGroupMatch(entry.group, remove.groupName));
  if (!feature) {
    problems.push(`replaceOptions: ${characterClass.key} ${classLevel}-го рівня не дає замінити вибір із групи «${remove.groupName}»`);
    return null;
  }
  if (!isReplacedGroupMatch(feature.group, add.groupName)) {
    problems.push(`replaceOptions: «${add.nameEng}» не з групи «${remove.groupName}», як «${remove.nameEng}»`);
    return null;
  }
  if (add.id === remove.id) {
    problems.push(`replaceOptions: «${remove.nameEng}» замінюється на себе`);
    return null;
  }
  return { optionalFeatureId: feature.id, group: feature.group, remove, add };
}

function findClassOption(characterClass: AssemblyClass, ref: OptionRef, role: "drop" | "add", problems: string[]): AssemblyChoiceOption | null {
  const matches = characterClass.choiceOptions.filter((option) => option.nameEng === ref.optionNameEng && (!ref.groupName || option.groupName === ref.groupName));
  if (matches.length === 1) return matches[0];
  const reason = matches.length ? "неоднозначна: додайте groupName" : `немає серед виборів класу ${characterClass.key}`;
  problems.push(`replaceOptions.${role}: опція «${ref.optionNameEng}» ${reason}`);
  return null;
}
