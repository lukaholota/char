import { Ability, Races, Subraces } from "@prisma/client";

export interface PrerequisiteResult {
  met: boolean;
  reason?: string;
  reasons?: string[];
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
      };
      failedReasons.push(`Потрібен ${pactMap[requiredPact] || requiredPact}`);
    }
  }

  // 3. Ability Score Check
  if (prereq.abilityScore && charData.stats) {
    for (const [ability, minScore] of Object.entries(prereq.abilityScore)) {
      if ((charData.stats[ability as Ability] || 0) < (minScore as number)) {
        const abilityNames: Record<string, string> = {
          STR: 'Сила', DEX: 'Спритність', CON: 'Статура',
          INT: 'Інтелект', WIS: 'Мудрість', CHA: 'Харизма'
        };
        failedReasons.push(`Потрібен показник ${abilityNames[ability] || ability} не менше ${minScore}`);
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
      failedReasons.push('Ваша раса не відповідає вимогам');
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
    
    for (const [ability, minScore] of Object.entries(scores)) {
      if ((charData.stats[ability as Ability] || 0) < (minScore as number)) {
        const abilityNames: Record<string, string> = {
          STR: 'Сила', DEX: 'Спритність', CON: 'Статура',
          INT: 'Інтелект', WIS: 'Мудрість', CHA: 'Харизма'
        };
        return {
          met: false,
          reason: `Потрібен показник ${abilityNames[ability] || ability} не менше ${minScore}`
        };
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
      return { met: false, reason: 'Ваша раса не відповідає вимогам' };
    }
  }

  return { met: true };
}
