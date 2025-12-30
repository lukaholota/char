import { useEffect, useRef } from "react";

export function useModalBackButton(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  const pushedRef = useRef(false);
  const closedByPopRef = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof window === "undefined") return;

    // React StrictMode runs effects twice in dev. Avoid double push.
    if (!pushedRef.current) {
      window.history.pushState({ modal: true }, "");
      pushedRef.current = true;
    }

    const handlePopState = () => {
      // Закриваємо модалку коли користувач натискає "назад"
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

    // If user closed via browser back, we already consumed the history entry.
    if (closedByPopRef.current) {
      pushedRef.current = false;
      closedByPopRef.current = false;
      return;
    }

    // Close via UI: pop our injected history entry.
    if (window.history.state?.modal) {
      window.history.back();
    }

    pushedRef.current = false;
    closedByPopRef.current = false;
  }, [isOpen]);
}
