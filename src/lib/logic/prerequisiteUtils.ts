import { Ability, Races, Subraces } from "@/lib/prisma-enums";
import { raceTranslations, subraceTranslations } from "@/lib/refs/translation";

const translateRace = (race: Races) => {
  return (raceTranslations as Record<string, string>)[race] || String(race);
};

const translateSubrace = (subrace: Subraces) => {
  return (subraceTranslations as Record<string, string>)[subrace] || String(subrace);
};

export interface PrerequisiteResult {
  met: boolean;
  reason?: string;
  reasons?: string[];
}

const abilityNames: Record<string, string> = {
  STR: 'Сила',
  DEX: 'Спритність',
  CON: 'Статура',
  INT: 'Інтелект',
  WIS: 'Мудрість',
  CHA: 'Харизма',
};

const abilityKeys = new Set<Ability>(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']);

function parseAbilityRequirements(input: unknown): {
  requirements: Array<{ ability: Ability; minScore: number }>;
  useOr: boolean;
} {
  if (!input || typeof input !== 'object') {
    return { requirements: [], useOr: false };
  }

  const raw = input as Record<string, unknown>;
  const useOr = raw.or === true || raw.OR === true;
  const requirements: Array<{ ability: Ability; minScore: number }> = [];

  for (const [key, value] of Object.entries(raw)) {
    const ability = key as Ability;
    if (!abilityKeys.has(ability)) continue;
    const minScore = Number(value);
    if (!Number.isFinite(minScore)) continue;
    requirements.push({ ability, minScore });
  }

  return { requirements, useOr };
}

export function checkPrerequisite(
  prereq: any,
  charData: {
    classLevel: number;
    pact?: string;
    existingChoiceOptionIds: number[];
    stats?: Record<Ability, number>;
    hasSpellcasting?: boolean;
    race?: Races;
    subrace?: Subraces;
  }
): PrerequisiteResult {
  if (!prereq || (typeof prereq === 'object' && Object.keys(prereq).length === 0)) {
    return { met: true };
  }

  const failedReasons: string[] = [];

  // 1. Level Check
  if (prereq.level) {
    const minLevel = Number(prereq.level);
    if (charData.classLevel < minLevel) {
      failedReasons.push(`Потрібен ${minLevel} рівень цього класу`);
    }
  }

  // 2. Pact Check (Warlock specific)
  if (prereq.pact) {
    const requiredPact = String(prereq.pact);
    if (charData.pact !== requiredPact) {
      const pactMap: Record<string, string> = {
        'Pact of the Blade': 'Дар клинка',
        'Pact of the Chain': 'Дар ланцюга',
        'Pact of the Tome': 'Дар гримуара',
        'Pact of the Talisman': 'Дар талісмана',
        // 2024 (KR18.8): Pact of the Blade/Chain/Tome — самі виклики, ключ несе суфікс редакції.
        'Pact of the Blade (2024)': 'Дар клинка',
        'Pact of the Chain (2024)': 'Дар ланцюга',
        'Pact of the Tome (2024)': 'Дар гримуара',
      };
      failedReasons.push(`Потрібен ${pactMap[requiredPact] || requiredPact}`);
    }
  }

  // 3. Ability Score Check
  if (prereq.abilityScore && charData.stats) {
    const { requirements, useOr } = parseAbilityRequirements(prereq.abilityScore);

    if (requirements.length > 0) {
      if (useOr) {
        const metAtLeastOne = requirements.some(
          ({ ability, minScore }) => (charData.stats?.[ability] || 0) >= minScore
        );
        if (!metAtLeastOne) {
          const label = requirements
            .map(({ ability, minScore }) => `${abilityNames[ability] || ability} ${minScore}`)
            .join(' або ');
          failedReasons.push(`Потрібен показник: ${label}`);
        }
      } else {
        for (const { ability, minScore } of requirements) {
          if ((charData.stats[ability] || 0) < minScore) {
            failedReasons.push(`Потрібен показник ${abilityNames[ability] || ability} не менше ${minScore}`);
          }
        }
      }
    }
  }

  // 4. Spellcasting Check
  if (prereq.spellcasting && !charData.hasSpellcasting) {
    failedReasons.push('Потрібна здатність накладати хоча б одне заклинання');
  }

  // 5. Race Restriction
  if (prereq.raceRestriction && prereq.raceRestriction.length > 0) {
    if (!charData.race || !prereq.raceRestriction.includes(charData.race)) {
      const required = (prereq.raceRestriction as Races[])
        .map((r) => translateRace(r))
        .filter(Boolean);
      if (required.length === 1) {
        failedReasons.push(`Ваша раса не відповідає вимогам - має бути: ${required[0]}`);
      } else if (required.length > 1) {
        failedReasons.push(`Ваша раса не відповідає вимогам - має бути одна з: ${required.join(", ")}`);
      } else {
        failedReasons.push('Ваша раса не відповідає вимогам');
      }
    }
  }

  if (failedReasons.length > 0) {
    return {
      met: false,
      reasons: failedReasons,
      reason: failedReasons.join(', ')
    };
  }

  return { met: true };
}

/**
 * Specifically for Feats, which have fields instead of a JSON object (though some fields ARE JSON)
 */
export function checkFeatPrerequisites(
  feat: {
    prerequisiteAbilityScore?: any;
    prerequisiteLevel?: number | null;
    prerequisiteSpellcasting?: boolean;
    raceRestriction?: Races[];
    subraceRestriction?: Subraces[];
  },
  charData: {
    level: number;
    stats: Record<Ability, number>;
    hasSpellcasting: boolean;
    race?: Races;
    subrace?: Subraces;
  }
): PrerequisiteResult {
  // Level
  if (feat.prerequisiteLevel && charData.level < feat.prerequisiteLevel) {
    return { met: false, reason: `Потрібен ${feat.prerequisiteLevel} рівень` };
  }

  // Stats
  if (feat.prerequisiteAbilityScore) {
    const scores = typeof feat.prerequisiteAbilityScore === 'string' 
      ? JSON.parse(feat.prerequisiteAbilityScore) 
      : feat.prerequisiteAbilityScore;

    const { requirements, useOr } = parseAbilityRequirements(scores);

    if (requirements.length > 0) {
      if (useOr) {
        const metAtLeastOne = requirements.some(
          ({ ability, minScore }) => (charData.stats[ability] || 0) >= minScore
        );

        if (!metAtLeastOne) {
          return {
            met: false,
            reason: `Потрібен показник: ${requirements
              .map(({ ability, minScore }) => `${abilityNames[ability] || ability} ${minScore}`)
              .join(' або ')}`
          };
        }
      } else {
        for (const { ability, minScore } of requirements) {
          if ((charData.stats[ability] || 0) < minScore) {
            return {
              met: false,
              reason: `Потрібен показник ${abilityNames[ability] || ability} не менше ${minScore}`
            };
          }
        }
      }
    }
  }

  // Spellcasting
  if (feat.prerequisiteSpellcasting && !charData.hasSpellcasting) {
    return { met: false, reason: 'Потрібна здатність накладати заклинання' };
  }

  // Race
  if (feat.raceRestriction && feat.raceRestriction.length > 0) {
    if (!charData.race || !feat.raceRestriction.includes(charData.race)) {
      const required = feat.raceRestriction.map((r) => translateRace(r)).filter(Boolean);
      if (required.length === 1) {
        return { met: false, reason: `Ваша раса не відповідає вимогам - має бути: ${required[0]}` };
      }
      if (required.length > 1) {
        return { met: false, reason: `Ваша раса не відповідає вимогам - має бути одна з: ${required.join(", ")}` };
      }
      return { met: false, reason: 'Ваша раса не відповідає вимогам' };
    }
  }

  // Subrace
  if (feat.subraceRestriction && feat.subraceRestriction.length > 0) {
    if (!charData.subrace || !feat.subraceRestriction.includes(charData.subrace)) {
      const required = feat.subraceRestriction.map((s) => translateSubrace(s)).filter(Boolean);
      if (required.length === 1) {
        return { met: false, reason: `Ваша підраса не відповідає вимогам - має бути: ${required[0]}` };
      }
      if (required.length > 1) {
        return { met: false, reason: `Ваша підраса не відповідає вимогам - має бути одна з: ${required.join(", ")}` };
      }
      return { met: false, reason: 'Ваша підраса не відповідає вимогам' };
    }
  }

  return { met: true };
}
