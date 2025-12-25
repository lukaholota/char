import { z } from 'zod';

export const StatsSchema = z.object({
  STR: z.number().optional(),
  DEX: z.number().optional(),
  CON: z.number().optional(),
  INT: z.number().optional(),
  WIS: z.number().optional(),
  CHA: z.number().optional(),
});

export type Stats = z.infer<typeof StatsSchema>;

export type LevelUpStepType = 
  | 'SELECT_SUBCLASS'
  | 'SELECT_FEAT_OR_ASI'
  | 'SELECT_SPELLS'
  | 'ADD_HP'
  | 'CHOOSE_OPTIONAL_FEATURE'
  | 'MULTICLASS_NEW_CLASS'
  | 'INFO';

export interface LevelUpStepBase {
  type: LevelUpStepType;
}

export interface SelectSubclassStep extends LevelUpStepBase {
  type: 'SELECT_SUBCLASS';
  classId: number;
  className: string;
  classNameEng: string;
  level: number;
  options: {
    id: number;
    name: string;
    description: string;
  }[];
  isRequired: boolean;
}

export interface SelectFeatOrASIStep extends LevelUpStepBase {
  type: 'SELECT_FEAT_OR_ASI';
  currentStats: Stats;
  feats: any[]; // Define Feat type properly if needed
}

export interface AddHPStep extends LevelUpStepBase {
  type: 'ADD_HP';
  hitDie: number;
  method: 'roll' | 'fixed';
}

export interface ChooseOptionalFeatureStep extends LevelUpStepBase {
  type: 'CHOOSE_OPTIONAL_FEATURE';
  featureId: string | number;
  title: string;
  description: string;
  options: {
    id: number;
    name: string;
    description: string;
  }[];
  count: number;
}

export interface SelectSpellsStep extends LevelUpStepBase {
    type: 'SELECT_SPELLS';
    // Add properties
}

export type LevelUpStep = 
  | SelectSubclassStep 
  | SelectFeatOrASIStep 
  | AddHPStep 
  | ChooseOptionalFeatureStep
  | SelectSpellsStep;

export interface LevelUpChoice {
  stepType: LevelUpStepType;
  subclassId?: number;
  type?: 'ASI' | 'FEAT';
  stats?: Stats;
  value?: number;
  method?: 'roll' | 'fixed';
  featureId?: string | number;
  selectedOptionId?: number;
  selectedSpellIds?: number[];
}

export interface LevelUpResponse {
  newLevel: number;
  className: string;
  steps: LevelUpStep[];
}

export interface LevelUpError {
  error: string;
}
