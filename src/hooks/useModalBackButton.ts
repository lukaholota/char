import { useEffect, useRef } from "react";

const MODAL_HISTORY_STATE_KEY = "__modalBackButtonToken";

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

    // React StrictMode runs effects twice in dev. Avoid double push.
    if (!pushedRef.current) {
      window.history.pushState({ [MODAL_HISTORY_STATE_KEY]: token }, "");
      pushedRef.current = true;
    }

    const handlePopState = () => {
      // Close ONLY if we navigated away from this modal's injected entry.
      // This makes nested modals safe: only the top one closes on back.
      const currentToken = (window.history.state as Record<string, unknown> | null)?.[MODAL_HISTORY_STATE_KEY];
      if (currentToken === token) return;

      closedByPopRef.current = true;
      onCloseRef.current();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) return;
    if (typeof window === "undefined") return;
    if (!pushedRef.current) return;

    const token = getToken();

    // If user closed via browser back, we already consumed the history entry.
    if (closedByPopRef.current) {
      pushedRef.current = false;
      closedByPopRef.current = false;
      return;
    }

    // Close via UI: pop our injected history entry.
    const currentToken = (window.history.state as Record<string, unknown> | null)?.[MODAL_HISTORY_STATE_KEY];
    if (currentToken === token) {
      window.history.back();
    }

    pushedRef.current = false;
    closedByPopRef.current = false;
  }, [isOpen]);
}
