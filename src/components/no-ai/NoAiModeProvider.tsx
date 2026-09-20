"use client";

import { ReactNode, createContext, useCallback, useContext, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";

import { buildHrefForNoAiMode, hasNoAiPrefix, stripNoAiPrefix } from "@/lib/no-ai/no-ai-route";

type NoAiMode = {
  enabled: boolean;
  /** Pathname with the `/no-ai` segment removed — what the route tree actually rendered. */
  routePathname: string;
};

const NoAiModeContext = createContext<NoAiMode>({ enabled: false, routePathname: "/" });

export function NoAiModeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";

  const value = useMemo<NoAiMode>(
    () => ({ enabled: hasNoAiPrefix(pathname), routePathname: stripNoAiPrefix(pathname) }),
    [pathname]
  );

  return <NoAiModeContext.Provider value={value}>{children}</NoAiModeContext.Provider>;
}

export function useNoAiMode(): NoAiMode {
  return useContext(NoAiModeContext);
}

/**
 * The pathname the route tree actually rendered — `usePathname()` still carries the `/no-ai`
 * segment, so anything matching on route shape must read this instead.
 */
export function useRoutePathname(): string {
  return useNoAiMode().routePathname;
}

export function useNoAiHref(): (href: string) => string {
  const { enabled } = useNoAiMode();
  return useCallback((href: string) => buildHrefForNoAiMode(href, enabled), [enabled]);
}

/// `useRouter()`, що не губить `/no-ai` на програмному переході — пара до `ModeLink`.
export function useModeRouter(): ReturnType<typeof useRouter> {
  const router = useRouter();
  const buildHref = useNoAiHref();

  return useMemo(
    () => ({
      ...router,
      push: (href, options) => router.push(buildHref(href), options),
      replace: (href, options) => router.replace(buildHref(href), options),
      prefetch: (href, options) => router.prefetch(buildHref(href), options),
    }),
    [router, buildHref]
  );
}
