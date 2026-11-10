"use client";

import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { waitForPendingHistoryBack } from "@/lib/history-back";
import { findShownHeroPersId, listSheetPersIds } from "@/rules/game-room-heroes";
import { showRoomTab } from "./room-tabs";

/// Закриття модалки відкочує історію із запізненням: без очікування ?hero= ліг би на запис, який зараз зникне.
export function useRoomHeroSheetOpener(viewer: Parameters<typeof listSheetPersIds>[0]) {
  const router = useModeRouter();
  return async (persId: number) => {
    showRoomTab("hero");
    await waitForPendingHistoryBack();
    const url = new URL(window.location.href);
    if (findShownHeroPersId(url.searchParams.get("hero"), listSheetPersIds(viewer)) === persId) return;
    url.searchParams.set("hero", String(persId));
    router.replace(`${url.pathname}${url.search}`, { scroll: false });
  };
}
