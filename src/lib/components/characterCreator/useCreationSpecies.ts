import { useMemo } from "react";
import type { CreationSpecies } from "@/lib/actions/class-actions";
import { usePersFormStore } from "@/lib/stores/persFormStore";

/** Кроки заклинань не пропонують того, що вже дає вид, — інакше створення відмовить через повтор. */
export function useCreationSpecies(): CreationSpecies | null {
  const raceId = usePersFormStore((state) => state.formData.raceId);
  const raceChoiceSelections = usePersFormStore((state) => state.formData.raceChoiceSelections);
  const raceSpellIds = usePersFormStore((state) => state.formData.raceSpellIds);
  const optionKey = Object.values(raceChoiceSelections ?? {}).sort((a, b) => a - b).join(",");
  const raceSpellKey = (raceSpellIds ?? []).join(",");
  return useMemo(() => {
    if (!raceId) return null;
    const species: CreationSpecies = { raceId, raceChoiceOptionIds: optionKey ? optionKey.split(",").map(Number) : [] };
    return raceSpellKey ? { ...species, raceSpellIds: raceSpellKey.split(",").map(Number) } : species;
  }, [raceId, optionKey, raceSpellKey]);
}
