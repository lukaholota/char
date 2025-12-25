import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { LevelUpChoice, LevelUpStep } from '@/types/character-flow';
import { getLevelUpSteps } from '@/lib/actions/character-logic';
import { commitLevelUp, LevelUpSelections } from '@/app/actions/level-up';

export type WizardPhase = 'idle' | 'loading' | 'steps' | 'complete' | 'error';

interface CharacterStoreState {
  phase: WizardPhase;
  steps: LevelUpStep[];
  choices: LevelUpChoice[];
  currentStepIndex: number;
  error: string | null;
  isSubmitting: boolean;
  message: string | null;
  persId: number | null; // Store persId for submission

  initiateLevelUp: (persId: number, currentLevel: number) => Promise<void>;
  nextStep: () => void;
  prevStep: () => void;
  addChoice: (choice: LevelUpChoice) => void;
  removeChoice: (stepType: LevelUpChoice['stepType']) => void;
  submitLevelUp: () => Promise<void>;
  reset: () => void;
  
  // Mock for createCharacter
  setCharacterInput: (input: unknown) => void;
  createCharacter: () => Promise<void>;
}

const initialState = {
  phase: 'idle' as WizardPhase,
  steps: [],
  choices: [],
  currentStepIndex: 0,
  error: null,
  isSubmitting: false,
  message: null,
  persId: null as number | null,
};

export const useCharacterStore = create<CharacterStoreState>()(
  immer((set) => ({
    ...initialState,

    initiateLevelUp: async (persId: number) => {
      set((state) => {
        state.phase = 'loading';
        state.error = null;
        state.persId = persId; // Store persId for later submission
      });

      try {
        const result = await getLevelUpSteps(persId);
        
        if ('error' in result) {
             set((state) => {
                state.phase = 'error';
                state.error = result.error;
             });
             return;
        }

        set((state) => {
          state.phase = 'steps';
          state.steps = result.steps;
          state.currentStepIndex = 0;
          state.choices = [];
        });
      } catch {
        set((state) => {
          state.phase = 'error';
          state.error = 'Failed to load level up steps';
        });
      }
    },

    nextStep: () => {
      set((state) => {
        if (state.currentStepIndex < state.steps.length - 1) {
          state.currentStepIndex += 1;
        }
      });
    },

    prevStep: () => {
      set((state) => {
        if (state.currentStepIndex > 0) {
          state.currentStepIndex -= 1;
        }
      });
    },

    addChoice: (choice: LevelUpChoice) => {
      set((state) => {
        const existingIndex = state.choices.findIndex(c => c.stepType === choice.stepType);
        if (existingIndex >= 0) {
          state.choices[existingIndex] = choice;
        } else {
          state.choices.push(choice);
        }
      });
    },

    removeChoice: (stepType: LevelUpChoice['stepType']) => {
      set((state) => {
        state.choices = state.choices.filter(c => c.stepType !== stepType);
      });
    },

    submitLevelUp: async () => {
        const state = useCharacterStore.getState();
        const { persId, choices } = state;
        
        if (!persId) {
          set((s) => { 
            s.phase = 'error'; 
            s.error = 'Персонаж не знайдено'; 
          });
          return;
        }

        set((s) => { s.isSubmitting = true; });

        try {
          // Transform choices to LevelUpSelections format
          const selections: LevelUpSelections = {};
          
          for (const choice of choices) {
            // Subclass selection
            if (choice.stepType === 'SELECT_SUBCLASS' && choice.subclassId) {
              selections.subclassId = choice.subclassId;
            }
            
            // ASI selection (stats object like { STR: 2 } or { DEX: 1, WIS: 1 })
            if (choice.stepType === 'SELECT_FEAT_OR_ASI' && choice.type === 'ASI' && choice.stats) {
              selections.asi = Object.entries(choice.stats)
                .filter(([, val]) => val && val > 0)
                .map(([stat, value]) => ({
                  stat: stat,
                  value: value as number,
                }));
            }
            
            // Optional feature choice (Fighting Style, etc.)
            if (choice.stepType === 'CHOOSE_OPTIONAL_FEATURE' && choice.featureId && choice.selectedOptionId) {
              if (!selections.specificChoices) selections.specificChoices = [];
              selections.specificChoices.push({
                featureId: Number(choice.featureId),
                choiceOptionId: choice.selectedOptionId,
              });
            }
            
            // Spell selection
            if (choice.stepType === 'SELECT_SPELLS' && choice.selectedSpellIds) {
              selections.spellIds = choice.selectedSpellIds;
            }
          }

          const result = await commitLevelUp(persId, selections);
          
          if (result.success) {
            set((s) => {
              s.isSubmitting = false;
              s.phase = 'complete';
            });
          } else {
            set((s) => {
              s.isSubmitting = false;
              s.phase = 'error';
              s.error = result.error || 'Помилка збереження';
            });
          }
        } catch (err) {
          console.error('Level-up submission error:', err);
          set((s) => {
            s.isSubmitting = false;
            s.phase = 'error';
            s.error = 'Помилка збереження. Спробуйте ще раз.';
          });
        }
    },

    reset: () => {
      set(initialState);
    },

    setCharacterInput: () => {},
    createCharacter: async () => {},
  }))
);
