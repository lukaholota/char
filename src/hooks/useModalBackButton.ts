import { useEffect, useRef } from "react";
import { goBackInHistory, waitForPendingHistoryBack } from "@/lib/history-back";

const MODAL_HISTORY_STATE_KEY = "__modalBackButtonToken";

type ModalWindow = Window & {
  __modalBackButtonStack__?: string[];
};

function getModalStack(): string[] {
  if (typeof window === "undefined") return [];
  const w = window as ModalWindow;
  if (!Array.isArray(w.__modalBackButtonStack__)) w.__modalBackButtonStack__ = [];
  return w.__modalBackButtonStack__;
}

function pushModalToken(token: string) {
  const stack = getModalStack();
  if (!stack.includes(token)) stack.push(token);
}

function removeModalToken(token: string) {
  const stack = getModalStack();
  const index = stack.lastIndexOf(token);
  if (index >= 0) stack.splice(index, 1);
}

function peekModalToken(): string | null {
  const stack = getModalStack();
  return stack.length ? stack[stack.length - 1] : null;
}

export function useModalBackButton(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  const pushedRef = useRef(false);
  const closedByPopRef = useRef(false);
  const tokenRef = useRef<string | null>(null);

  const getToken = () => {
    if (tokenRef.current) return tokenRef.current;
    if (typeof window !== "undefined" && typeof window.crypto?.randomUUID === "function") {
      tokenRef.current = window.crypto.randomUUID();
      return tokenRef.current;
    }

    tokenRef.current = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return tokenRef.current;
  };

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof window === "undefined") return;

    const token = getToken();
    let isCancelled = false;

    const handlePopState = () => {
      if (peekModalToken() !== token) return;

      // Close ONLY if we navigated away from this modal's injected entry.
      // This makes nested modals safe: only the top one closes on back.
      const currentToken = (window.history.state as Record<string, unknown> | null)?.[MODAL_HISTORY_STATE_KEY];
      if (currentToken === token) return;

      closedByPopRef.current = true;
      removeModalToken(token);
      onCloseRef.current();
    };

    void waitForPendingHistoryBack().then(() => {
      if (isCancelled) return;
      pushModalToken(token);

      // React StrictMode runs effects twice in dev. Avoid double push.
      if (!pushedRef.current) {
        window.history.pushState({ [MODAL_HISTORY_STATE_KEY]: token }, "");
        pushedRef.current = true;
      }

      window.addEventListener("popstate", handlePopState);
    });

    return () => {
      isCancelled = true;
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) return;
    if (typeof window === "undefined") return;
    const token = getToken();

    if (!pushedRef.current) {
      removeModalToken(token);
      return;
    }

    removeModalToken(token);

    // If user closed via browser back, we already consumed the history entry.
    if (closedByPopRef.current) {
      pushedRef.current = false;
      closedByPopRef.current = false;
      return;
    }

    // Close via UI: pop our injected history entry.
    const currentToken = (window.history.state as Record<string, unknown> | null)?.[MODAL_HISTORY_STATE_KEY];
    if (currentToken === token) {
      goBackInHistory();
    }

    pushedRef.current = false;
    closedByPopRef.current = false;
  }, [isOpen]);
}
