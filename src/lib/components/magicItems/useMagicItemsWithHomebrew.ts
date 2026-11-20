"use client";

import { useCallback, useMemo } from "react";
import { useCatalogHomebrew } from "@/hooks/useCommunityHomebrew";
import type { HomebrewRuleset } from "@/lib/logic/homebrew-input";
import type { HomebrewItemEntry } from "@/lib/logic/homebrew-view";
import type { HomebrewSort } from "@/lib/logic/homebrew-catalog";

export function useMagicItemsWithHomebrew<T extends { magicItemId: number }>(items: T[], ruleset: HomebrewRuleset, isOn: boolean, onlyHomebrewSort: HomebrewSort | null) {
  const community = useCatalogHomebrew({ kind: "ITEM", ruleset, isOn, onlyHomebrewSort });
  const homebrewEntries = useMemo(() => community.filter((entry): entry is HomebrewItemEntry => entry.kind === "ITEM"), [community]);
  const allItems = useMemo(() => [...items, ...homebrewEntries.map((entry) => entry.item)], [items, homebrewEntries]);
  const findHomebrewEntry = useCallback((item: { magicItemId: number } | null) => homebrewEntries.find((entry) => entry.item.magicItemId === item?.magicItemId) ?? null, [homebrewEntries]);
  return { allItems, communityCount: homebrewEntries.length, findHomebrewEntry };
}
