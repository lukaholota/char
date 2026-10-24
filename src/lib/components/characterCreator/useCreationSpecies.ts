import { useMemo } from "react";
import type { CreationSpecies } from "@/lib/actions/class-actions";
import { usePersFormStore } from "@/lib/stores/persFormStore";

/** Кроки заклинань не пропонують того, що вже дає вид, — інакше створення відмовить через повтор. */
export function useCreationSpecies(): CreationSpecies | null {
  const raceId = usePersFormStore((state) => state.formData.raceId);
  const raceChoiceSelections = usePersFormStore((state) => state.formData.raceChoiceSelections);
  const optionKey = Object.values(raceChoiceSelections ?? {}).sort((a, b) => a - b).join(",");
  return useMemo(() => (raceId ? { raceId, raceChoiceOptionIds: optionKey ? optionKey.split(",").map(Number) : [] } : null), [raceId, optionKey]);
}
