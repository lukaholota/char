import { translatePdfText } from "./translatePdfText";

export type ProficiencyAndLanguageInput = {
  customProficiencies: string;
  customLanguages: string;
  darkvisionRange: number | null;
  damageResistances: string[];
};

type ProficiencyKind = "armor" | "weapon" | "tool";

const KIND_TITLES: Record<ProficiencyKind, string> = { armor: "Обладунки", weapon: "Зброя", tool: "Інструменти" };
const KIND_BY_LABEL: Record<string, ProficiencyKind> = {
  обладунки: "armor",
  броня: "armor",
  зброя: "weapon",
  інструменти: "tool",
};
const KIND_BY_TOKEN: Array<[RegExp, ProficiencyKind]> = [
  [/обладун|^щит(и)?$|броня/iu, "armor"],
  [/зброя$/iu, "weapon"],
  [/^(набір|інструмент|приладдя)/iu, "tool"],
];
const LABELLED_LINE = /^([\p{L}'ʼ’ ]{2,40}):\s*(.*)$/u;
const LIST_ITEM = /^[-·•*–]\s*/u;

/// Мови першими: на тісному листі саме вони губилися в кінці блоку.
export function buildProficiencyAndLanguageText(input: ProficiencyAndLanguageInput): string {
  return [buildLanguageLine(input.customLanguages), buildSenseLine(input), ...buildProficiencyLines(input.customProficiencies)]
    .filter(Boolean)
    .join("\n");
}

function buildLanguageLine(customLanguages: string): string {
  const languages = dedupeTokens(splitLines(customLanguages).flatMap(splitTokens));
  return languages.length ? `Мови: ${languages.join(", ")}` : "";
}

function buildSenseLine(input: ProficiencyAndLanguageInput): string {
  return [
    input.darkvisionRange !== null ? `Темнозір ${input.darkvisionRange} футів` : "",
    input.damageResistances.length ? `Опори: ${input.damageResistances.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("; ");
}

function buildProficiencyLines(customProficiencies: string): string[] {
  const byKind: Record<ProficiencyKind, string[]> = { armor: [], weapon: [], tool: [] };
  const labelled: string[] = [];
  const other: string[] = [];
  let listKind: ProficiencyKind | null = null;
  for (const line of splitLines(customProficiencies).map(replaceToolChoiceWording)) {
    const item = line.replace(LIST_ITEM, "");
    const label = LABELLED_LINE.exec(line);
    const labelKind = label ? KIND_BY_LABEL[label[1].trim().toLowerCase()] : undefined;
    if (label && !label[2]) {
      listKind = labelKind ?? null;
      if (!labelKind) labelled.push(line);
    } else if (labelKind && label) {
      byKind[labelKind].push(...splitTokens(label[2]));
    } else if (listKind && item !== line) {
      byKind[listKind].push(...splitTokens(item));
    } else if (label) {
      labelled.push(line);
    } else {
      const tokens = splitTokens(item);
      const kind = findCommonKind(tokens);
      if (kind) byKind[kind].push(...tokens);
      else other.push(item.replace(/\s+/g, " ").replace(/[,;.\s]+$/, ""));
    }
  }
  return [
    ...(Object.keys(KIND_TITLES) as ProficiencyKind[]).map((kind) => joinTitled(KIND_TITLES[kind], dedupeTokens(byKind[kind]), ", ")),
    ...dedupeTokens(labelled),
    joinTitled("Інше", dedupeTokens(other), "; "),
  ].filter(Boolean);
}

function findCommonKind(tokens: string[]): ProficiencyKind | null {
  const kinds = tokens.map((token) => KIND_BY_TOKEN.find(([pattern]) => pattern.test(token))?.[1] ?? null);
  return kinds.length > 0 && kinds.every((kind) => kind === kinds[0]) ? kinds[0] : null;
}

function joinTitled(title: string, items: string[], separator: string): string {
  return items.length ? `${title}: ${items.join(separator)}` : "";
}

function splitLines(value: string): string[] {
  return value
    .split(/\n+/g)
    .map((line) => translatePdfText(line.trim()))
    .filter(Boolean);
}

function splitTokens(line: string): string[] {
  return line
    .split(",")
    .map((token) => token.trim().replace(/\s+/g, " ").replace(/[.;]$/, ""))
    .filter(Boolean);
}

function dedupeTokens(tokens: string[]): string[] {
  const seen = new Set<string>();
  return tokens.filter((token) => {
    const key = token.toLowerCase().replace(/['’ʼ]/g, "ʼ");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function replaceToolChoiceWording(value: string): string {
  return value.replace(/(?<!\p{L})[Оо]бери\s+(\d+)(?!\d)/gu, (match, rawCount) => {
    const count = Number(rawCount);
    if (!Number.isFinite(count) || count <= 0) return match;
    return count === 1 ? "Інструменти: на вибір" : `Інструменти: на вибір (${Math.trunc(count)})`;
  });
}
