"use client";

import { useEffect, useState } from "react";

import { readOfflineQueue } from "@/lib/offline/queue";
import { savePageForOffline } from "@/lib/offline/service-worker";
import { warmChunksWhenIdle } from "@/lib/offline/warm-chunks";
import { findSpellForModal } from "@/lib/spell-cards";
import type { SpellLink } from "@/lib/spell-link";

export type OfflineReadiness = "unavailable" | "preparing" | "ready" | "failed";

type LoadChunk = () => Promise<unknown>;

const REFRESH_AFTER_EDIT_MS = 10_000;

function canPrepareForOffline(): boolean {
  return process.env.NODE_ENV === "production" && "serviceWorker" in navigator && navigator.onLine;
}

/**
 * The sheet is usable as soon as it renders; this then saves its page, lazy tabs and spell cards
 * so the same sheet reloads and switches tabs without a network.
 */
export function useOfflineReadiness({ loadChunks, spellLinks, revision }: {
  loadChunks: readonly LoadChunk[];
  spellLinks: readonly SpellLink[];
  revision: unknown;
}): OfflineReadiness {
  const [readiness, setReadiness] = useState<OfflineReadiness>("unavailable");

  useEffect(() => {
    if (!canPrepareForOffline()) return;
    const abort = new AbortController();
    setReadiness("preparing");
    void prepareSheetForOffline(loadChunks, spellLinks, abort.signal).then((isReady) => {
      if (!abort.signal.aborted) setReadiness(isReady ? "ready" : "failed");
    });
    return () => abort.abort();
    // Once per opened sheet: edits refresh the saved page below, without restarting the warm-up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useRefreshSavedPageAfterEdits(revision);

  return readiness;
}

async function prepareSheetForOffline(loadChunks: readonly LoadChunk[], spellLinks: readonly SpellLink[], signal: AbortSignal): Promise<boolean> {
  const isPageSaved = await savePageForOffline(window.location.href);
  const areChunksWarm = await warmChunksWhenIdle(loadChunks, signal);
  const cards = await Promise.allSettled(spellLinks.map((link) => findSpellForModal(link)));
  return isPageSaved && areChunksWarm && cards.every((card) => card.status === "fulfilled");
}

// The saved page is a snapshot; without a refresh an offline reload would show values from before
// edits made online. A pending queue is skipped: the snapshot plus the queue would apply it twice.
function useRefreshSavedPageAfterEdits(revision: unknown) {
  const [initialRevision] = useState(revision);

  useEffect(() => {
    if (revision === initialRevision || !canPrepareForOffline()) return;
    const timer = setTimeout(() => {
      if (navigator.onLine && readOfflineQueue().length === 0) void savePageForOffline(window.location.href, { refresh: true });
    }, REFRESH_AFTER_EDIT_MS);
    return () => clearTimeout(timer);
  }, [revision, initialRevision]);
}
