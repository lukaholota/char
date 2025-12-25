import { useState, useEffect } from 'react';
import { getLevelUpInfo, commitLevelUp, LevelUpInfo, LevelUpSelections } from '@/app/actions/level-up';

export function useLevelUpManager(persId: number, currentLevel: number) {
  const [info, setInfo] = useState<LevelUpInfo | null>(null);
  const [selections, setSelections] = useState<LevelUpSelections>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    getLevelUpInfo(persId, currentLevel + 1)
      .then(data => {
        setInfo(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [persId, currentLevel]);

  const setSubclass = (subclassId: number) => {
    setSelections(prev => ({ ...prev, subclassId }));
  };

  const setAsi = (asi: { stat: string; value: number }[]) => {
    setSelections(prev => ({ ...prev, asi }));
  };

  const setSpecificChoice = (featureId: number, choiceOptionId: number) => {
    setSelections(prev => {
      const existing = prev.specificChoices || [];
      const filtered = existing.filter(c => c.featureId !== featureId);
      return {
        ...prev,
        specificChoices: [...filtered, { featureId, choiceOptionId }]
      };
    });
  };

  const commit = async () => {
    if (!info) return;
    setIsCommitting(true);
    try {
      await commitLevelUp(persId, selections);
      // Handle success (e.g. redirect or refresh)
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCommitting(false);
    }
  };

  // Validation helper
  const isValid = () => {
    if (!info) return false;
    for (const f of info.features) {
      if (f.choiceData) {
        if (f.choiceData.type === 'SUBCLASS' && !selections.subclassId) return false;
        if (f.choiceData.type === 'ASI' && (!selections.asi || selections.asi.length === 0)) return false;
        if (f.choiceData.type === 'SPECIFIC') {
           const choice = selections.specificChoices?.find(c => c.featureId === f.featureId);
           if (!choice) return false;
        }
      }
    }
    return true;
  };

  return { 
    info, 
    selections, 
    setSubclass, 
    setAsi, 
    setSpecificChoice, 
    commit, 
    loading, 
    error, 
    isCommitting,
    isValid 
  };
}
