"use client";

import { useCallback, useEffect, useState } from "react";
import { enableHomebrewParam } from "@/lib/catalog-source-filter";
import { updateUrlSearchParams } from "@/lib/catalog-url-helpers";
import { useRememberedHomebrewToggle } from "@/hooks/useRememberedHomebrewToggle";
import { fetchHomebrewEntries } from "@/lib/catalog-reads";
import type { HomebrewKind, HomebrewRuleset } from "@/lib/logic/homebrew-input";
import type { HomebrewCatalogEntry } from "@/lib/logic/homebrew-view";
import type { HomebrewSort } from "@/lib/logic/homebrew-catalog";

type HomebrewQuery = { kind: HomebrewKind; ruleset: HomebrewRuleset; sort: HomebrewSort };

export function useCommunityHomebrew({ kind, ruleset, sort }: HomebrewQuery, isEnabled: boolean): HomebrewCatalogEntry[] {
  const [loaded, setLoaded] = useState<{ queryKey: string; entries: HomebrewCatalogEntry[] } | null>(null);
  const queryKey = `${kind}:${ruleset}:${sort}`;

  useEffect(() => {
    if (!isEnabled) return;
    let isCancelled = false;
    fetchHomebrewEntries({ kind, ruleset, sort })
      .then((entries) => {
        if (!isCancelled) setLoaded({ queryKey, entries });
      })
      .catch((error: unknown) => console.error("Не вдалося завантажити хоумбрю спільноти", error));
    return () => {
      isCancelled = true;
    };
  }, [kind, ruleset, sort, queryKey, isEnabled]);

  return isEnabled && loaded?.queryKey === queryKey ? loaded.entries : [];
}

export function useCatalogHomebrew(input: { kind: HomebrewKind; ruleset: HomebrewRuleset; isOn: boolean; onlyHomebrewSort: HomebrewSort | null }): HomebrewCatalogEntry[] {
  const turnOn = useCallback(() => updateUrlSearchParams(enableHomebrewParam), []);
  const rememberKey = input.onlyHomebrewSort ? null : `${input.kind === "SPELL" ? "spells" : "bestiary"}-${input.ruleset}`;
  useRememberedHomebrewToggle(rememberKey, input.isOn, turnOn);
  return useCommunityHomebrew({ kind: input.kind, ruleset: input.ruleset, sort: input.onlyHomebrewSort ?? "TOP" }, input.isOn || input.onlyHomebrewSort !== null);
}
