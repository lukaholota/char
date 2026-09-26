"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { capturePostHogEvent } from "@/lib/monitoring/posthog-client";

import { decideWhatsNew } from "@/lib/whats-new/decision";
import { CURRENT_RELEASE_FLAG, CURRENT_RELEASE_SLIDES } from "@/lib/whats-new/release-notes";
import { findFlagStorage, markFlagSeen } from "@/lib/whats-new/seen-flags";

// Модалка зі Swiper показується раз на реліз, а цей компонент живе в providers кожної сторінки.
const WhatsNewDialog = dynamic(() => import("./WhatsNewDialog").then((module) => module.WhatsNewDialog), {
  ssr: false,
});

/// `onResolved` існує не для косметики: підказка Google One Tap і ця модалка інакше виходять
/// одночасно, а хто з них перший — гонка. Тому підказка чекає, доки тут не вирішиться.
export function WhatsNewAnnouncement({ onResolved }: { onResolved?: (isOpen: boolean) => void }) {
  const pathname = usePathname();
  const { status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const hasDecided = useRef(false);

  useEffect(() => {
    if (hasDecided.current || status === "loading") return;

    const storage = findFlagStorage();
    const decision = decideWhatsNew({
      pathname,
      isAuthenticated: status === "authenticated",
      storage,
    });

    if (!decision.isOnSurface) return void onResolved?.(false);

    hasDecided.current = true;
    onResolved?.(decision.shouldShow);
    if (!decision.shouldShow) return;

    /// Позначаємо показаним одразу, а не на закритті: перезавантажена сторінка не має
    /// відкривати модалку вдруге.
    markFlagSeen(storage, CURRENT_RELEASE_FLAG);
    setIsOpen(true);
    capturePostHogEvent("whats_new_shown", { release: CURRENT_RELEASE_FLAG });
  }, [pathname, status, onResolved]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    onResolved?.(false);
    capturePostHogEvent("whats_new_closed", { release: CURRENT_RELEASE_FLAG });
  }, [onResolved]);

  if (!isOpen) return null;

  return <WhatsNewDialog slides={CURRENT_RELEASE_SLIDES} isOpen={isOpen} onClose={handleClose} />;
}
