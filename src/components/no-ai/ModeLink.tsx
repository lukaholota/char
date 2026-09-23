"use client";

import Link from "next/link";
export { useLinkStatus } from "next/link";
import { ComponentProps, forwardRef, useRef } from "react";

import { useNoAiHref } from "./NoAiModeProvider";

type Props = ComponentProps<typeof Link> & { navigateOnFirstTouch?: boolean };

/**
 * Drop-in replacement for `next/link` that keeps the current view mode in the URL.
 * Without it the first click leaves `/no-ai/…` and the shared view is lost.
 */
export const ModeLink = forwardRef<HTMLAnchorElement, Props>(function ModeLink({ href, navigateOnFirstTouch = false, onTouchStart, onTouchEnd, ...rest }, ref) {
  const buildHref = useNoAiHref();
  const resolvedHref = typeof href === "string" ? buildHref(href) : href;
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  return <Link
    ref={ref}
    href={resolvedHref}
    onTouchStart={(event) => {
      if (event.touches.length === 1) {
        touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      } else {
        touchStart.current = null;
      }
      onTouchStart?.(event);
    }}
    onTouchEnd={(event) => {
      onTouchEnd?.(event);
      const start = touchStart.current;
      touchStart.current = null;
      const end = event.changedTouches[0];
      if (!navigateOnFirstTouch || event.defaultPrevented || !start || !end) return;
      if (Math.hypot(end.clientX - start.x, end.clientY - start.y) > 10) return;
      event.preventDefault();
      window.location.assign(event.currentTarget.href);
    }}
    {...rest}
  />;
});
