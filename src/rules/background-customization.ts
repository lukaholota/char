export const CUSTOM_BACKGROUND_NAME = "CUSTOM";
export const CUSTOMIZED_SKILL_COUNT = 2;
export const CUSTOM_BACKGROUND_TOOL_AND_LANGUAGE_TOTAL = 2;

export type BackgroundCustomization = { skills: string[]; tools: string[] };

export type BackgroundCustomizationBase = {
  name: string;
  fixedTools: readonly string[];
  languageChoiceCount: number;
};

type KnownValues = { skills: readonly string[]; tools: readonly string[] };

export function isCustomBackground(name: string): boolean {
  return name === CUSTOM_BACKGROUND_NAME;
}

export function countBackgroundLanguageChoices(base: BackgroundCustomizationBase, customization: BackgroundCustomization | undefined): number {
  if (!customization) return base.languageChoiceCount;
  const pool = isCustomBackground(base.name) ? CUSTOM_BACKGROUND_TOOL_AND_LANGUAGE_TOTAL : base.languageChoiceCount;
  return Math.max(0, pool - customization.tools.length);
}

export function countCustomizableToolSlots(base: BackgroundCustomizationBase): number {
  return isCustomBackground(base.name) ? CUSTOM_BACKGROUND_TOOL_AND_LANGUAGE_TOTAL : base.languageChoiceCount;
}

export function findBackgroundCustomizationProblem(base: BackgroundCustomizationBase, customization: BackgroundCustomization, known: KnownValues): string | null {
  return findSkillProblem(customization.skills, known.skills) ?? findToolProblem(base, customization.tools, known.tools);
}

function findSkillProblem(skills: readonly string[], known: readonly string[]): string | null {
  if (skills.length !== CUSTOMIZED_SKILL_COUNT) return `Налаштована передісторія дає рівно ${CUSTOMIZED_SKILL_COUNT} навички, а обрано ${skills.length}`;
  if (new Set(skills).size !== skills.length) return "Налаштована передісторія містить повтор навички";
  const unknown = skills.find((skill) => !known.includes(skill));
  return unknown ? `Невідома навичка передісторії: ${unknown}` : null;
}

function findToolProblem(base: BackgroundCustomizationBase, tools: readonly string[], known: readonly string[]): string | null {
  if (new Set(tools).size !== tools.length) return "Налаштована передісторія містить повтор інструмента";
  const unknown = tools.find((tool) => !known.includes(tool));
  if (unknown) return `Невідомий інструмент передісторії: ${unknown}`;
  const alreadyGranted = tools.find((tool) => base.fixedTools.includes(tool));
  if (alreadyGranted) return `Передісторія вже дає володіння ${alreadyGranted}`;
  const slots = countCustomizableToolSlots(base);
  return tools.length > slots ? `Інструментами можна замінити лише мови передісторії: доступно ${slots}, а обрано ${tools.length}` : null;
}
