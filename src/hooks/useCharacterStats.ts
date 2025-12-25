import { useMemo } from 'react';
import { usePersFormStore } from '@/lib/stores/persFormStore';
import { Ability, RaceVariant } from '@prisma/client';
import { RaceI, FeatPrisma, RaceASI } from '@/lib/types/model-types';

const attributes = [
  { key: Ability.STR, label: 'Сила' },
  { key: Ability.DEX, label: 'Спритність' },
  { key: Ability.CON, label: 'Статура' },
  { key: Ability.INT, label: 'Інтелект' },
  { key: Ability.WIS, label: 'Мудрість' },
  { key: Ability.CHA, label: 'Харизма' },
];

interface UseCharacterStatsProps {
  race?: RaceI;
  raceVariant?: RaceVariant | null;
  feat?: FeatPrisma | null;
}

export const useCharacterStats = ({ race, raceVariant, feat }: UseCharacterStatsProps) => {
  const { formData } = usePersFormStore();

  const stats = useMemo(() => {
    const scores: Record<string, { base: number; bonus: number; total: number; mod: number }> = {};

    // 1. Base Scores
    const baseScores: Record<string, number> = {
      STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10
    };

    if (formData.asiSystem === 'POINT_BUY') {
      formData.asi?.forEach(s => baseScores[s.ability] = s.value);
    } else if (formData.asiSystem === 'SIMPLE') {
      formData.simpleAsi?.forEach(s => baseScores[s.ability] = s.value);
    } else if (formData.asiSystem === 'CUSTOM' && formData.customAsi) {
      formData.customAsi.forEach(s => baseScores[s.ability] = Number(s.value) || 10);
    }

    // Initialize result structure
    attributes.forEach(attr => {
      scores[attr.key] = { base: baseScores[attr.key], bonus: 0, total: 0, mod: 0 };
    });

    // 2. Racial Bonuses (Fixed)
    let effectiveASI = race?.ASI as RaceASI | undefined;
    if (raceVariant?.overridesRaceASI) {
      effectiveASI = raceVariant.overridesRaceASI as unknown as RaceASI;
    }

    if (effectiveASI?.basic?.simple) {
      Object.entries(effectiveASI.basic.simple).forEach(([ability, bonus]) => {
        if (scores[ability]) scores[ability].bonus += Number(bonus);
      });
    }

    // 3. Racial Bonuses (Choices)
    if (formData.racialBonusChoiceSchema) {
      const choices = formData.isDefaultASI 
          ? formData.racialBonusChoiceSchema.basicChoices 
          : formData.racialBonusChoiceSchema.tashaChoices;
      
      choices?.forEach(choice => {
          choice.selectedAbilities.forEach(ability => {
             if (scores[ability]) scores[ability].bonus += 1;
          });
      });
    }

    // 4. Feat Bonuses (Fixed)
    if (feat?.grantedASI) {
       const featASI = feat.grantedASI as any;
       if (featASI?.basic?.simple) {
         Object.entries(featASI.basic.simple).forEach(([ability, bonus]) => {
            if (scores[ability]) scores[ability].bonus += Number(bonus);
         });
       }
    }

    // 5. Feat Bonuses (Choices)
    // We need to look at featChoiceSelections and map them to abilities
    if (feat && formData.featChoiceSelections) {
        Object.values(formData.featChoiceSelections).forEach(optionId => {
            // Find the option in the feat's options
            const option = feat.featChoiceOptions.find(o => o.choiceOptionId === optionId);
            if (option) {
                // Check if the option name corresponds to an ability
                // We seeded them as "Strength", "Dexterity", etc. or localized "Сила", "Спритність"
                // Let's check both or use a map.
                // In seed: "Skill Expert Ability (Strength)" -> optionNameEng
                // In seed: "Resilient (Strength)" -> optionNameEng
                
                const nameEng = option.choiceOption.optionNameEng;
                if (nameEng.includes('Strength')) scores['STR'].bonus += 1;
                else if (nameEng.includes('Dexterity')) scores['DEX'].bonus += 1;
                else if (nameEng.includes('Constitution')) scores['CON'].bonus += 1;
                else if (nameEng.includes('Intelligence')) scores['INT'].bonus += 1;
                else if (nameEng.includes('Wisdom')) scores['WIS'].bonus += 1;
                else if (nameEng.includes('Charisma')) scores['CHA'].bonus += 1;
            }
        });
    }

    // Calculate Totals and Mods
    Object.keys(scores).forEach(key => {
        scores[key].total = scores[key].base + scores[key].bonus;
        scores[key].mod = Math.floor((scores[key].total - 10) / 2);
    });

    return scores;
  }, [formData, race, raceVariant, feat]);

  return stats;
};
