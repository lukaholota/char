import { useCallback, useEffect, useMemo, useState } from "react";
import { FANTASY_NAMES } from "@/lib/refs/fantasyNames";

export function useFantasyNameGenerator() {
  const names = useMemo(() => FANTASY_NAMES, []);
  const [currentName, setCurrentName] = useState<string>(names[0] ?? "");

  const generateName = useCallback(() => {
    if (!names.length) return "";
    const randomIndex = Math.floor(Math.random() * names.length);
    const next = names[randomIndex];
    setCurrentName(next);
    return next;
  }, [names]);

  useEffect(() => {
    if (!currentName) generateName();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { currentName, generateName };
}
