"use client";

import { useLayoutEffect } from "react";
import { create } from "zustand";

import { useRoutePathname } from "@/components/no-ai/NoAiModeProvider";
import { getEditionFromPathname, type Edition } from "@/rules/route-helpers";
import type { Ruleset } from "@/rules/types";

/// Сторінки персонажа (`/char/<id>`, левелап, бастіон, публічне посилання) не мають `/2024` в
/// адресі: редакція належить персонажу, а не маршруту. Без закріплення меню, пошук і терміни
/// вгадували б її з адреси й відправляли гравця 2024 у каталоги 2014.
const usePinnedEditionStore = create<{ pinnedEdition: Edition | null }>(() => ({ pinnedEdition: null }));

export function PersEditionPin({ ruleset }: { ruleset: Ruleset }) {
  const edition: Edition = ruleset === "RULES_2024" ? "2024" : "2014";

  useLayoutEffect(() => {
    usePinnedEditionStore.setState({ pinnedEdition: edition });
    return () => usePinnedEditionStore.setState({ pinnedEdition: null });
  }, [edition]);

  return null;
}

export function useActiveEdition(): Edition {
  const pathname = useRoutePathname();
  const pinnedEdition = usePinnedEditionStore((state) => state.pinnedEdition);
  return pinnedEdition ?? getEditionFromPathname(pathname);
}

export function useIsEditionPinnedByPage(): boolean {
  return usePinnedEditionStore((state) => state.pinnedEdition !== null);
}

export function findPinnedRuleset(): Ruleset | null {
  const { pinnedEdition } = usePinnedEditionStore.getState();
  if (pinnedEdition === null) return null;
  return pinnedEdition === "2024" ? "RULES_2024" : "RULES_2014";
}
