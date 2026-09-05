export interface CreationStepConditions {
  hasSubraces: boolean;
  hasRaceVariants: boolean;
  hasRaceChoiceOptions: boolean;
  /** Риса від вибору виду (друга риса Людини 2024) має власні опції — навички, список заклинань. */
  hasSpeciesFeatChoices?: boolean;
  hasSubclasses: boolean;
  hasLevelOneSubclassChoices: boolean;
  hasLevelOneChoices: boolean;
  hasLevelOneOptionalFeatures: boolean;
  hasWeaponMastery?: boolean;
  hasFeatChoice: boolean;
  hasFeatChoices: boolean;
  hasBackgroundFeatChoice: boolean;
  hasBackgroundFeatChoices: boolean;
  hasExpertiseChoice: boolean;
  hasLanguageChoice: boolean;
}

export interface CreationStep {
  id: string;
  name: string;
  component: string;
}

const coreSteps: CreationStep[] = [
  { id: "background", name: "Передісторія", component: "background" },
  { id: "asi", name: "Характеристики", component: "asi" },
  { id: "skills", name: "Навички", component: "skills" },
];

export function resolveCreationSteps(conditions: CreationStepConditions): CreationStep[] {
  return [
    { id: "race", name: "Раса", component: "races" },
    ...resolveRaceSteps(conditions),
    { id: "class", name: "Клас", component: "class" },
    ...resolveClassSteps(conditions),
    ...coreSteps,
    ...resolveChoiceSteps(conditions),
    { id: "equipment", name: "Спорядження", component: "equipment" },
    { id: "name", name: "Імʼя", component: "name" },
  ];
}

function resolveRaceSteps(conditions: CreationStepConditions): CreationStep[] {
  const steps: CreationStep[] = [];
  const raceDetailsName = resolveRaceDetailsName(conditions);
  if (raceDetailsName) steps.push({ id: "raceDetails", name: raceDetailsName, component: "raceDetails" });
  if (conditions.hasRaceChoiceOptions) steps.push({ id: "raceChoices", name: "Опції раси", component: "raceChoices" });
  if (conditions.hasSpeciesFeatChoices) steps.push({ id: "speciesFeatChoices", name: "Опції риси виду", component: "speciesFeatChoices" });
  return steps;
}

function resolveRaceDetailsName(conditions: CreationStepConditions): string | null {
  if (conditions.hasSubraces && conditions.hasRaceVariants) return "Підраса чи Варіант";
  if (conditions.hasSubraces) return "Підраса";
  if (conditions.hasRaceVariants) return "Варіант раси";
  return null;
}

function resolveClassSteps(conditions: CreationStepConditions): CreationStep[] {
  const steps: CreationStep[] = [];
  if (conditions.hasSubclasses) steps.push({ id: "subclass", name: "Підклас", component: "subclass" });
  if (conditions.hasLevelOneSubclassChoices) steps.push({ id: "subclassChoices", name: "Опції підкласу", component: "subclassChoices" });
  if (conditions.hasLevelOneChoices) steps.push({ id: "classChoices", name: "Опції класу", component: "classChoices" });
  if (conditions.hasLevelOneOptionalFeatures) steps.push({ id: "classOptional", name: "Додаткові риси", component: "classOptional" });
  if (conditions.hasWeaponMastery) steps.push({ id: "weaponMastery", name: "Майстерність зброї", component: "weaponMastery" });
  return steps;
}

function resolveChoiceSteps(conditions: CreationStepConditions): CreationStep[] {
  const steps: CreationStep[] = [];
  if (conditions.hasFeatChoice) steps.push({ id: "feat", name: "Риса", component: "feat" });
  if (conditions.hasFeatChoices) steps.push({ id: "featChoices", name: "Опції риси", component: "featChoices" });
  if (conditions.hasBackgroundFeatChoice) steps.push({ id: "backgroundFeat", name: "Риса походження", component: "backgroundFeat" });
  if (conditions.hasBackgroundFeatChoices) steps.push({ id: "backgroundFeatChoices", name: "Опції риси походження", component: "backgroundFeatChoices" });
  if (conditions.hasExpertiseChoice) steps.push({ id: "expertise", name: "Експертиза", component: "expertise" });
  if (conditions.hasLanguageChoice) steps.push({ id: "languages", name: "Мови", component: "languages" });
  return steps;
}
