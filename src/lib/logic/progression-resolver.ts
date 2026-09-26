import {
  loadFightingStyleOptions,
  loadProgressionFeatures,
  loadProgressionSubclasses,
} from '@/server/db/progression-content';
import { FeatureMechanic } from '@prisma/client';
import { LevelUpStep, Stats } from '@/types/character-flow';

// Локалізація назв класів
const CLASS_NAMES_UK: Record<string, string> = {
  BARBARIAN: 'Варвар',
  BARD: 'Бард',
  CLERIC: 'Клірик',
  DRUID: 'Друїд',
  FIGHTER: 'Боєць',
  MONK: 'Монах',
  PALADIN: 'Паладін',
  RANGER: 'Мисливець',
  ROGUE: 'Розбійник',
  SORCERER: 'Чародій',
  WARLOCK: 'Чорнокнижник',
  WIZARD: 'Чарівник',
  ARTIFICER: 'Винахідник',
  BLOOD_HUNTER: 'Мисливець за кровʼю',
};

const CLASS_HIT_DICE: Record<string, number> = {
  BARBARIAN: 12,
  BARD: 8,
  CLERIC: 8,
  DRUID: 8,
  FIGHTER: 10,
  MONK: 8,
  PALADIN: 10,
  RANGER: 10,
  ROGUE: 8,
  SORCERER: 6,
  WARLOCK: 8,
  WIZARD: 6,
  ARTIFICER: 8,
  BLOOD_HUNTER: 10,
};

export class ProgressionResolver {
  static async resolveLevelUpSteps(
    persId: number,
    classId: number,
    newLevel: number,
    className: string,
    currentStats: Stats
  ) {
    const steps: LevelUpStep[] = [];

    // 1. Отримуємо фічі для цього рівня з БД
    const features = await loadProgressionFeatures(classId, newLevel);

    console.log(`🔍 Found ${features.length} features for ${className} Level ${newLevel}`);

    // 2. Проходимо по кожній фічі і генеруємо крок
    for (const f of features) {
      switch (f.mechanicType) {
        case FeatureMechanic.CHOICE_SUBCLASS:
          steps.push(await this.createSubclassStep(classId, className, newLevel));
          break;

        case FeatureMechanic.CHOICE_ASI:
          steps.push(this.createASIStep(currentStats));
          break;

        case FeatureMechanic.CHOICE_SPELLS:
           // Тут можна додати логіку для спелів, якщо вона в метаданих
           // Наприклад: const count = f.mechanicMetadata?.count || 2;
           // steps.push(this.createSpellStep(className, newLevel, count));
           break;

        case FeatureMechanic.CHOICE_SPECIFIC:
          if (f.mechanicMetadata) {
             const meta = f.mechanicMetadata as { options_source?: unknown };
             if (meta.options_source === 'fighting_styles') {
                steps.push(await this.createFightingStyleStep());
             }
          }
          break;
          
        case FeatureMechanic.PASSIVE:
        default:
          // Пасивні фічі просто показуємо як інформацію, або ігноруємо у візарді
          // steps.push({ type: 'INFO', feature: f.feature });
          break;
      }
    }

    // 3. Завжди додаємо крок HP (якщо це не рівень 1, хоча на 1 теж можна показати макс)
    if (newLevel > 1) {
      steps.push({
        type: 'ADD_HP',
        hitDie: CLASS_HIT_DICE[className] || 8,
        method: 'roll', // Default
      });
    }

    return steps;
  }

  private static async createSubclassStep(classId: number, className: string, level: number) {
    // Отримуємо доступні підкласи
    const subclasses = await loadProgressionSubclasses(classId);

    return {
      type: 'SELECT_SUBCLASS' as const,
      classId,
      className: CLASS_NAMES_UK[className] || className,
      classNameEng: className,
      level,
      options: subclasses.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description || '',
      })),
      isRequired: true,
    };
  }

  private static createASIStep(currentStats: Stats) {
    return {
      type: 'SELECT_FEAT_OR_ASI' as const,
      currentStats,
      // Feats можна завантажити окремо або передати пустим масивом, якщо поки не реалізовано
      feats: [], 
    };
  }

  private static async createFightingStyleStep() {
      const styles = await loadFightingStyleOptions();
      return {
          type: 'CHOOSE_OPTIONAL_FEATURE' as const,
          featureId: 'fighting_style',
          title: 'Бойовий Стиль',
          description: 'Оберіть один бойовий стиль, що визначає вашу майстерність у бою.',
          options: styles.map(s => ({
              id: s.id,
              name: s.name,
              description: s.description
          })),
          count: 1
      };
  }
}
