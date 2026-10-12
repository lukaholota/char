"use client";

import Link from "next/link";
export { useLinkStatus } from "next/link";
import { ComponentProps, forwardRef } from "react";

import { useNoAiHref } from "./NoAiModeProvider";

type Props = ComponentProps<typeof Link>;

/**
 * Drop-in replacement for `next/link` that keeps the current view mode in the URL.
 * Without it the first click leaves `/no-ai/…` and the shared view is lost.
 */
export const ModeLink = forwardRef<HTMLAnchorElement, Props>(function ModeLink({ href, ...rest }, ref) {
  const buildHref = useNoAiHref();
  const resolvedHref = typeof href === "string" ? buildHref(href) : href;

  return <Link ref={ref} href={resolvedHref} {...rest} />;
});
