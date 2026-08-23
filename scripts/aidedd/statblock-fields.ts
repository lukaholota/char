import { CreatureEdition } from "./creature-schema";

const SIZE_WORDS = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"];

const CONDITION_WORDS = new Set(
  [
    "Blinded",
    "Charmed",
    "Deafened",
    "Exhaustion",
    "Frightened",
    "Grappled",
    "Incapacitated",
    "Invisible",
    "Paralyzed",
    "Petrified",
    "Poisoned",
    "Prone",
    "Restrained",
    "Stunned",
    "Unconscious",
  ].map((word) => word.toLowerCase())
);

export type ChallengeRating = {
  challenge: string;
  xp: string;
  xpInLair: string;
  proficiencyBonus: string;
};

export type TypeLine = {
  size: string;
  type: string;
  alignment: string;
};

export function splitTypeLine(line: string): TypeLine {
  const trimmed = collapseSpaces(line).replace(/^_|_$/g, "");
  const sizePattern = SIZE_WORDS.join("|");
  const match = new RegExp(
    `^((?:${sizePattern})(?:\\s+or\\s+(?:${sizePattern}))?)\\s+(.+)$`,
    "i"
  ).exec(trimmed);

  if (!match) return { size: "", type: trimmed, alignment: "" };

  const [, size, rest] = match;
  const comma = rest.lastIndexOf(",");
  if (comma < 0) return { size, type: rest.trim(), alignment: "" };

  return {
    size,
    type: rest.slice(0, comma).trim(),
    alignment: rest.slice(comma + 1).trim(),
  };
}

export function parseChallengeRating(raw: string, edition: CreatureEdition): ChallengeRating {
  const line = collapseSpaces(raw).replace(/^Challenge\s+/i, "");

  const withPb =
    /^([\d/]+)\s*\(\s*XP\s*([\d,  ]+?)\s*(?:,?\s*or\s*([\d,  ]+?)\s*in\s*lair\s*)?;\s*PB\s*([+−–—-]\d+)\s*\)$/i.exec(
      line
    ) ??
    /^([\d/]+)\s*\(\s*([\d,  ]+?)\s*XP\s*;\s*PB\s*([+−–—-]\d+)\s*\)$/i.exec(line);

  if (withPb && withPb.length === 5) {
    return {
      challenge: withPb[1],
      xp: stripDigitSeparators(withPb[2]),
      xpInLair: withPb[3] ? stripDigitSeparators(withPb[3]) : "",
      proficiencyBonus: normalizeSign(withPb[4]),
    };
  }

  if (withPb) {
    return {
      challenge: withPb[1],
      xp: stripDigitSeparators(withPb[2]),
      xpInLair: "",
      proficiencyBonus: normalizeSign(withPb[3]),
    };
  }

  const withoutXp = /^([\d/]+)\s*\(\s*PB\s*([+−–—-]\d+)\s*\)$/i.exec(line);
  const withoutPb = /^([\d/]+)\s*\(\s*([\d,  ]+?)\s*XP\s*\)$/i.exec(line);
  if (withoutXp) {
    return {
      challenge: withoutXp[1],
      xp: "",
      xpInLair: "",
      proficiencyBonus: normalizeSign(withoutXp[2]),
    };
  }

  if (withoutPb) {
    return {
      challenge: withoutPb[1],
      xp: stripDigitSeparators(withoutPb[2]),
      xpInLair: "",
      proficiencyBonus: findProficiencyBonusForChallenge(withoutPb[1]),
    };
  }

  const bareChallenge = /^([\d/—-]+)/.exec(line);
  const challenge = bareChallenge ? bareChallenge[1] : line;
  return {
    challenge,
    xp: "",
    xpInLair: "",
    proficiencyBonus: edition === "RULES_2014" ? findProficiencyBonusForChallenge(challenge) : "",
  };
}

export function findProficiencyBonusForChallenge(challenge: string): string {
  const numeric = readChallengeNumber(challenge);
  if (!Number.isFinite(numeric)) return "+2";
  return `+${Math.max(2, 2 + Math.floor(Math.max(0, numeric - 1) / 4))}`;
}

/// 2024 merges damage and condition immunities into one line separated by ";".
/// Without the separator the line is whichever kind its words belong to.
export function splitImmunityLine(raw: string): { damage: string; conditions: string } {
  const line = collapseSpaces(raw);
  if (line === "") return { damage: "", conditions: "" };

  const semicolon = line.indexOf(";");
  if (semicolon >= 0) {
    return {
      damage: line.slice(0, semicolon).trim(),
      conditions: line.slice(semicolon + 1).trim(),
    };
  }

  return isConditionList(line) ? { damage: "", conditions: line } : { damage: line, conditions: "" };
}

export function collapseSpaces(value: string): string {
  return value.replace(/ /g, " ").replace(/\s+/g, " ").trim();
}

/// aidedd mixes true minus, en dash and em dash in the same table, sometimes within one creature.
export function normalizeSign(value: string): string {
  return value.replace(/[−–—‒]/g, "-");
}

export function readChallengeNumber(challenge: string): number {
  const fraction = /^(\d+)\s*\/\s*(\d+)$/.exec(challenge.trim());
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  const whole = Number(challenge.trim());
  return Number.isFinite(whole) ? whole : NaN;
}

function isConditionList(line: string): boolean {
  const words = line.split(",").map((word) => word.trim().split(" ")[0].toLowerCase());
  return words.every((word) => CONDITION_WORDS.has(word));
}

function stripDigitSeparators(value: string): string {
  return value.replace(/[,\s ]/g, "");
}
