"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getSearchParamsFromLocation, replaceUrlSearchParams } from "@/lib/catalog-url-helpers";
import { isOnBranchEntry, leaveBranch, pushBranchEntry } from "@/lib/catalogs/reading-history";
import { goBackInHistory, waitForPendingHistoryBack } from "@/lib/history-back";

type WriteTarget = (params: URLSearchParams) => void;

type BranchOpener = { key: string; scroller: HTMLElement | null; scrollTop: number };

const DIALOG_SCROLLER = "[data-rpg-dialog-content]";

/// Адреса — єдине джерело цілі читання. Хук лише пише її й повідомляє каталог (`onUrlChanged`),
/// а також повертає читача до картки гілки, з якої той пішов: той самий скрол і фокус.
export function useReadingNavigation({ isBranchOpen, onUrlChanged }: { isBranchOpen: boolean; onUrlChanged: () => void }) {
  const [focusRequest, setFocusRequest] = useState(0);
  const openerRef = useRef<BranchOpener | null>(null);

  const requestFocus = useCallback(() => setFocusRequest((count) => count + 1), []);

  const replaceTarget = useCallback((write: WriteTarget) => {
    const params = getSearchParamsFromLocation();
    write(params);
    replaceUrlSearchParams(params);
    onUrlChanged();
  }, [onUrlChanged]);

  const openBranch = useCallback((write: WriteTarget, key: string, opener: HTMLButtonElement) => {
    const scroller = opener.closest<HTMLElement>(DIALOG_SCROLLER);
    openerRef.current = { key, scroller, scrollTop: scroller?.scrollTop ?? 0 };
    const params = getSearchParamsFromLocation();
    write(params);
    pushBranchEntry(params);
    onUrlChanged();
    if (scroller) scroller.scrollTop = 0;
  }, [onUrlChanged]);

  const leaveBranchTo = useCallback((write: WriteTarget) => {
    const params = getSearchParamsFromLocation();
    write(params);
    if (leaveBranch(params) === "replaced") onUrlChanged();
  }, [onUrlChanged]);

  /// Закрити модалку, у якій відкрита гілка: спершу зняти запис гілки, потім — запис модалки.
  /// `history.go` асинхронний, тож другий крок чекає на перший (src/lib/history-back.ts).
  const closeModalWithBranch = useCallback((closeModal: () => void, clearTarget: WriteTarget) => {
    if (!isOnBranchEntry()) {
      replaceTarget(clearTarget);
      closeModal();
      return;
    }
    goBackInHistory();
    void waitForPendingHistoryBack().then(() => {
      replaceTarget(clearTarget);
      closeModal();
    });
  }, [replaceTarget]);

  useReturnToOpener(isBranchOpen, openerRef);

  return { focusRequest, requestFocus, replaceTarget, openBranch, leaveBranchTo, closeModalWithBranch };
}

function useReturnToOpener(isBranchOpen: boolean, openerRef: React.MutableRefObject<BranchOpener | null>) {
  const wasOpenRef = useRef(isBranchOpen);

  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = isBranchOpen;
    const opener = openerRef.current;
    if (!wasOpen || isBranchOpen || !opener) return;

    openerRef.current = null;
    requestAnimationFrame(() => {
      if (opener.scroller?.isConnected) opener.scroller.scrollTop = opener.scrollTop;
      findVisibleCard(opener)?.focus({ preventScroll: Boolean(opener.scroller) });
    });
  }, [isBranchOpen, openerRef]);
}

function findVisibleCard(opener: BranchOpener): HTMLElement | null {
  const selector = `[data-branch-card="${CSS.escape(opener.key)}"]`;
  const root: ParentNode = opener.scroller?.isConnected ? opener.scroller : document;
  const cards = [...root.querySelectorAll<HTMLElement>(selector)];
  return cards.find((card) => card.offsetParent !== null) ?? null;
}
