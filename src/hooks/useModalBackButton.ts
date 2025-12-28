import { useEffect, useRef } from "react";

export function useModalBackButton(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof window === "undefined") return;

    // Пушимо стейт коли відкриваємо модалку
    window.history.pushState({ modal: true }, "");

    const handlePopState = () => {
      // Закриваємо модалку коли користувач натискає "назад"
      onCloseRef.current();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);

      // Чистимо history якщо модалка закрилась не через кнопку назад
      // (наприклад через хрестик або Escape)
      if (window.history.state?.modal) {
        window.history.back();
      }
    };
  }, [isOpen]);
}
