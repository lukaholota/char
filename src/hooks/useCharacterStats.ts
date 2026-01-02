import { useMemo } from 'react';
import { usePersFormStore } from '@/lib/stores/persFormStore';
import { Ability, RaceVariant } from '@prisma/client';
import { RaceI, FeatPrisma, RaceASI } from '@/lib/types/model-types';
import { normalizeRaceASI } from '@/lib/components/characterCreator/infoUtils';

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
    const scores: Record<
      string,
      {
        base: number;
        bonus: number;
        total: number;
        mod: number;
        breakdown: Array<{ source: string; value: number }>;
      }
    > = {};

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
    attributes.forEach((attr) => {
      scores[attr.key] = { base: baseScores[attr.key], bonus: 0, total: 0, mod: 0, breakdown: [] };
    });

    const addBonus = (ability: string, value: number, source: string) => {
      if (!scores[ability]) return;
      const n = Number(value);
      if (!Number.isFinite(n) || n === 0) return;
      scores[ability].bonus += n;

      const existing = scores[ability].breakdown.find((x) => x.source === source);
      if (existing) existing.value += n;
      else scores[ability].breakdown.push({ source, value: n });
    };

    const subrace = (race?.subraces || []).find((sr: any) => sr.subraceId === (formData.subraceId ?? undefined));

    // 2. Racial Bonuses (Fixed)
    const effectiveASI = normalizeRaceASI(
      (raceVariant?.overridesRaceASI ?? race?.ASI) as any
    ) as RaceASI | undefined;

    if (formData.isDefaultASI) {
      if (effectiveASI?.basic?.simple) {
        Object.entries(effectiveASI.basic.simple).forEach(([ability, bonus]) => {
          addBonus(ability, Number(bonus), "за расу");
        });
      }

      const additionalASI = (subrace as any)?.additionalASI as Record<string, number> | undefined;
      if (additionalASI && typeof additionalASI === 'object') {
        Object.entries(additionalASI).forEach(([ability, bonus]) => {
          addBonus(ability, Number(bonus), "за підрасу");
        });
      }
    }

    // 3. Racial Bonuses (Choices)
    if (formData.racialBonusChoiceSchema) {
      const choices = formData.isDefaultASI
        ? formData.racialBonusChoiceSchema.basicChoices
        : formData.racialBonusChoiceSchema.tashaChoices;

      if (choices?.length) {
        const raceGroups = formData.isDefaultASI
          ? (effectiveASI?.basic?.flexible?.groups ?? [])
          : (effectiveASI?.tasha?.flexible?.groups ?? []);

        const additionalASI = (subrace as any)?.additionalASI as Record<string, number> | undefined;
        const subraceGroups = !formData.isDefaultASI && additionalASI && typeof additionalASI === 'object'
          ? (() => {
              const byValue = new Map<number, number>();
              Object.entries(additionalASI).forEach(([_ability, bonus]) => {
                const value = Number(bonus);
                if (!Number.isFinite(value) || value === 0) return;
                byValue.set(value, (byValue.get(value) ?? 0) + 1);
              });
              return Array.from(byValue.entries())
                .sort((a, b) => b[0] - a[0])
                .map(([value, count]) => ({
                  groupName: `+${value} до ${count}`,
                  value,
                  choiceCount: count,
                  unique: true,
                }));
            })()
          : [];

        const allGroups = [...raceGroups, ...subraceGroups] as any[];

        choices.forEach((choice) => {
          const group = allGroups[choice.groupIndex];
          const value = group?.value;
          const bonusValue = typeof value === 'number' ? value : 1;

          const source = choice.groupIndex < raceGroups.length ? "за расу" : "за підрасу";

          choice.selectedAbilities.forEach((ability) => {
            addBonus(ability, bonusValue, source);
          });
        });
      }
    }

    // 4. Feat Bonuses (Fixed)
    if (feat?.grantedASI) {
       const abilityKeys = new Set(["STR", "DEX", "CON", "INT", "WIS", "CHA"]);
       const featASI = feat.grantedASI as any;
       const apply = (ability: string, bonus: unknown) => {
         const upper = String(ability).toUpperCase();
         if (!abilityKeys.has(upper)) return;
         addBonus(upper, Number(bonus), "за рису");
       };

       if (featASI?.basic?.simple && typeof featASI.basic.simple === "object") {
         Object.entries(featASI.basic.simple).forEach(([ability, bonus]) => apply(ability, bonus));
       } else if (featASI && typeof featASI === "object" && !Array.isArray(featASI)) {
         Object.entries(featASI).forEach(([ability, bonus]) => apply(ability, bonus));
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
                if (nameEng.includes('Strength')) addBonus('STR', 1, "за рису");
                else if (nameEng.includes('Dexterity')) addBonus('DEX', 1, "за рису");
                else if (nameEng.includes('Constitution')) addBonus('CON', 1, "за рису");
                else if (nameEng.includes('Intelligence')) addBonus('INT', 1, "за рису");
                else if (nameEng.includes('Wisdom')) addBonus('WIS', 1, "за рису");
                else if (nameEng.includes('Charisma')) addBonus('CHA', 1, "за рису");
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
