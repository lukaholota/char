import type { Ruleset } from "@prisma/client";
import { findRoutePrefix } from "@/lib/search/omni-categories";

/// KR29.3: з кроку майстра створення персонажа — на статтю довідника, яка пояснює цей крок.
/// Якір — слаг статті або id підрозділу зі сторінки `/rules/abilities` (усі кроки створення
/// живуть у категорії «abilities» в обох редакціях). Заголовок статичний, бо майстер —
/// клієнтський компонент і не тягне generated-JSON правил; гейт
/// `tests/content/creation-step-rule-links.test.ts` звіряє його зі справжнім заголовком статті.
export type CreationStepRuleLink = {
  href: string;
  articleTitle: string;
};

type RuleAnchor = { anchor: string; articleTitle: string };

const RULES_2014_ANCHORS: Record<string, RuleAnchor> = {
  race: { anchor: "1-choose-a-race", articleTitle: "1. Оберіть расу" },
  raceDetails: { anchor: "racial-traits--subraces", articleTitle: "Расові особливості" },
  raceChoices: { anchor: "racial-traits", articleTitle: "Расові особливості" },
  class: { anchor: "2-choose-a-class", articleTitle: "2. Оберіть клас" },
  subclass: { anchor: "2-choose-a-class", articleTitle: "2. Оберіть клас" },
  subclassChoices: { anchor: "2-choose-a-class", articleTitle: "2. Оберіть клас" },
  classChoices: { anchor: "2-choose-a-class", articleTitle: "2. Оберіть клас" },
  classOptional: { anchor: "optional-class-features", articleTitle: "Необовʼязкові класові риси" },
  background: { anchor: "4-describe-your-character", articleTitle: "4. Опишіть свого персонажа" },
  asi: { anchor: "3-determine-ability-scores", articleTitle: "3. Визначте значення характеристик" },
  skills: { anchor: "ability-checks--skills", articleTitle: "Перевірки характеристик" },
  feat: { anchor: "feats", articleTitle: "Риси" },
  featChoices: { anchor: "feats", articleTitle: "Риси" },
  expertise: { anchor: "ability-checks--skills", articleTitle: "Перевірки характеристик" },
  languages: { anchor: "languages", articleTitle: "Мови" },
  equipment: { anchor: "5-choose-equipment-phb", articleTitle: "5. Оберіть спорядження" },
  name: { anchor: "character-details", articleTitle: "Деталі персонажа" },
};

const RULES_2024_ANCHORS: Record<string, RuleAnchor> = {
  race: { anchor: "step-2-character-origin--choose-a-species", articleTitle: "Крок 2: Походження персонажа" },
  raceDetails: { anchor: "parts-of-a-species", articleTitle: "Складові виду" },
  raceChoices: { anchor: "parts-of-a-species", articleTitle: "Складові виду" },
  class: { anchor: "step-1-choose-class", articleTitle: "Крок 1: Оберіть клас" },
  subclass: { anchor: "step-1-choose-class", articleTitle: "Крок 1: Оберіть клас" },
  subclassChoices: { anchor: "step-1-choose-class", articleTitle: "Крок 1: Оберіть клас" },
  classChoices: { anchor: "step-1-choose-class", articleTitle: "Крок 1: Оберіть клас" },
  background: { anchor: "step-2-character-origin--choose-a-background", articleTitle: "Крок 2: Походження персонажа" },
  asi: { anchor: "step-3-ability-scores", articleTitle: "Крок 3: Значення характеристик" },
  skills: { anchor: "skill-proficiencies", articleTitle: "Володіння навичками" },
  backgroundFeat: { anchor: "parts-of-a-background--feat", articleTitle: "Складові передісторії" },
  backgroundFeatChoices: { anchor: "parts-of-a-background--feat", articleTitle: "Складові передісторії" },
  expertise: { anchor: "expertise", articleTitle: "Експертиза" },
  languages: { anchor: "step-2-character-origin--choose-languages", articleTitle: "Крок 2: Походження персонажа" },
  equipment: { anchor: "step-2-character-origin--choose-starting-equipment", articleTitle: "Крок 2: Походження персонажа" },
  name: { anchor: "step-5-character-creation-details", articleTitle: "Крок 5: Деталі персонажа" },
};

/// Кроки, для яких статті в довіднику цієї редакції немає — перелічені явно, щоб гейт
/// відрізняв «свідомо без посилання» від «забули». Майстерність зброї 2024 — каталожне
/// поняття без статті (той самий стан, що аліас `weapon-mastery` у search-aliases.json).
export const STEPS_WITHOUT_RULE_ARTICLE: Record<Ruleset, readonly string[]> = {
  RULES_2014: ["weaponMastery", "backgroundFeat", "backgroundFeatChoices"],
  RULES_2024: ["weaponMastery", "feat", "featChoices", "classOptional"],
};

const ANCHORS_BY_RULESET: Record<Ruleset, Record<string, RuleAnchor>> = {
  RULES_2014: RULES_2014_ANCHORS,
  RULES_2024: RULES_2024_ANCHORS,
};

export function findCreationStepRuleLink(stepId: string, ruleset: Ruleset): CreationStepRuleLink | null {
  const target = ANCHORS_BY_RULESET[ruleset][stepId];
  if (!target) return null;
  return {
    href: `${findRoutePrefix(ruleset)}/rules/abilities#${target.anchor}`,
    articleTitle: target.articleTitle,
  };
}

export function listLinkedCreationStepIds(ruleset: Ruleset): string[] {
  return Object.keys(ANCHORS_BY_RULESET[ruleset]);
}
