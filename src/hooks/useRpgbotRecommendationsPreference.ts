"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "rpgbot-spell-recommendations";
const TURNED_OFF = "0";

export function useRpgbotRecommendationsPreference(): [boolean, (isOn: boolean) => void] {
  const [isOn, setIsOn] = useState(true);

  useEffect(() => {
    setIsOn(readRpgbotRecommendationsPreference());
  }, []);

  const update = useCallback((next: boolean) => {
    setIsOn(next);
    writePreference(next);
  }, []);

  return [isOn, update];
}

export function readRpgbotRecommendationsPreference(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== TURNED_OFF;
  } catch {
    return true;
  }
}

function writePreference(isOn: boolean) {
  try {
    if (isOn) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, TURNED_OFF);
  } catch {
    return;
  }
}
