/**
 * Володіння звіра, як їх пише статблок каталогу: «Уважність +3, Непомітність +4» у навичках і
 * «Спр +4, Ста +2» у рятівних кидках. Потрібні вони одному правилу — 2024-му «якщо модифікатор
 * у статблоці вищий за ваш, беріть той, що у статблоці».
 *
 * Назви беруться зі словника (`translation.ts`, [Р18]), а не переписуються сюди: власна копія
 * перекладу мовчки вимкнула б правило в той день, коли переклад навички зміниться. Рятівні
 * кидки статблок скорочує до трьох літер, тож вони й шукаються префіксом назви характеристики.
 */

import { Ability, Skills } from "@prisma/client";
import { abilityTranslations, skillTranslations } from "@/lib/refs/translation";

const SAVE_ABBREVIATION_LENGTH = 3;

export function parseBeastSkillModifiers(skills: string): Partial<Record<Skills, number>> {
  return collectModifiers(skills, findSkillByLabel);
}

export function parseBeastSaveModifiers(savingThrows: string): Partial<Record<Ability, number>> {
  return collectModifiers(savingThrows, findAbilityByAbbreviation);
}

function collectModifiers<K extends string>(
  statblockField: string,
  findKey: (label: string) => K | null
): Partial<Record<K, number>> {
  const parsed: Partial<Record<K, number>> = {};

  for (const entry of (statblockField ?? "").split(",")) {
    const modifier = parseEntry(entry);
    if (!modifier) continue;

    const key = findKey(modifier.label);
    if (key) parsed[key] = modifier.value;
  }

  return parsed;
}

/// «Уважність +3» і «Спр +2 + БМ»: перше знакове число — це модифікатор, приріст від чужого
/// бонусу майстерності (статблоки прикликання) до нього не входить.
function parseEntry(entry: string): { label: string; value: number } | null {
  const match = entry.match(/^(.*?)([+-]\s*\d+)/);
  if (!match) return null;

  const label = match[1].trim();
  return label ? { label, value: Number(match[2].replace(/\s+/g, "")) } : null;
}

function findSkillByLabel(label: string): Skills | null {
  const found = Object.entries(skillTranslations).find(([, name]) => equalsIgnoringCase(name, label));
  return found ? (found[0] as Skills) : null;
}

/// «Спр» — це «Спритність», обрізана до трьох літер; жодна пара характеристик такого префікса
/// не ділить, тож збіг однозначний.
function findAbilityByAbbreviation(label: string): Ability | null {
  if (label.length < SAVE_ABBREVIATION_LENGTH) return null;

  const found = Object.entries(abilityTranslations).find(([, name]) =>
    equalsIgnoringCase(name.slice(0, label.length), label)
  );
  return found ? (found[0] as Ability) : null;
}

function equalsIgnoringCase(left: string, right: string): boolean {
  return left.toLocaleLowerCase("uk") === right.trim().toLocaleLowerCase("uk");
}
