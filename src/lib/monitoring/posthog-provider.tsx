"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useActiveEdition, useIsEditionPinnedByPage } from "@/components/ui/PersEditionPin";
import { buildPostHogPageProperties, isInternalAnalyticsEmail } from "@/lib/monitoring/posthog-context";
import { capturePostHogEvent, configurePostHogIdentity, flushPostHogOnExit } from "@/lib/monitoring/posthog-client";
import { stripNoAiPrefix } from "@/lib/no-ai/no-ai-route";

export function PostHogProvider() {
  const { data: session, status } = useSession();
  const pathname = usePathname() ?? "/";
  const edition = useActiveEdition();
  const isEditionPinned = useIsEditionPinnedByPage();
  const userId = session?.user?.id ?? null;
  const isInternal = isInternalAnalyticsEmail(session?.user?.email) || Boolean(session?.user && "analyticsInternal" in session.user && session.user.analyticsInternal);
  const lastPageview = useRef<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    configurePostHogIdentity({ userId, isInternal });
  }, [status, userId, isInternal]);

  useEffect(() => {
    window.addEventListener("pagehide", flushPostHogOnExit);
    return () => window.removeEventListener("pagehide", flushPostHogOnExit);
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    const route = stripNoAiPrefix(pathname);
    if (/^\/(?:char\/\d+|pers\/)/.test(route) && !isEditionPinned) return;
    const key = `${pathname}:${edition}:${userId}`;
    if (lastPageview.current === key) return;
    lastPageview.current = key;
    capturePostHogEvent("$pageview", buildPostHogPageProperties(pathname, edition));
  }, [pathname, edition, isEditionPinned, status, userId]);

  return null;
}
