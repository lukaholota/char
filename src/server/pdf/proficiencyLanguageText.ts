import { translatePdfText } from "./translatePdfText";

export type ProficiencyAndLanguageInput = {
  customProficiencies: string;
  customLanguages: string;
  darkvisionRange: number | null;
  damageResistances: string[];
};

export function buildProficiencyAndLanguageText(input: ProficiencyAndLanguageInput): string {
  return [
    ...buildSection("Чуття й опори:", buildSenseLines(input)),
    ...buildSection("Володіння (броня/зброя/інструменти):", splitManualLines(input.customProficiencies, { isProficiencies: true })),
    ...buildSection("Мови:", splitManualLines(input.customLanguages, { isProficiencies: false })),
  ].join("\n");
}

function buildSenseLines(input: ProficiencyAndLanguageInput): string[] {
  return [
    input.darkvisionRange !== null ? `Темнозір ${input.darkvisionRange} футів` : "",
    input.damageResistances.length ? `Опори: ${input.damageResistances.join(", ")}` : "",
  ].filter(Boolean);
}

function buildSection(title: string, lines: string[]): string[] {
  const unique = Array.from(new Set(lines));
  return unique.length ? [title, ...unique.map((line) => `· ${line}`)] : [];
}

function splitManualLines(value: string, options: { isProficiencies: boolean }): string[] {
  return value
    .split(/\n+/g)
    .map((line) => line.trim())
    .map((line) => (options.isProficiencies ? replaceToolChoiceWording(line) : line))
    .map(translatePdfText)
    .filter(Boolean);
}

function replaceToolChoiceWording(value: string): string {
  return value.replace(/(?<!\p{L})[Оо]бери\s+(\d+)(?!\d)/gu, (match, rawCount) => {
    const count = Number(rawCount);
    if (!Number.isFinite(count) || count <= 0) return match;
    return count === 1 ? "Інструменти на вибір" : `Інструменти на вибір (${Math.trunc(count)})`;
  });
}
