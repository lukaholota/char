"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { installRedundantTraversalFilter, rememberRouterHref } from "@/lib/router-popstate-filter";

export function RouterPopStateFilter() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => rememberRouterHref(pathname, search), [pathname, search]);
  useEffect(() => installRedundantTraversalFilter(), []);

  return null;
}
