"use client";

import { useEffect } from "react";

export function useScrollToUrlHash() {
  useEffect(() => {
    const scrollToHashTarget = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      document.getElementById(id)?.scrollIntoView({ block: "start" });
    };

    scrollToHashTarget();
    window.addEventListener("hashchange", scrollToHashTarget);
    return () => window.removeEventListener("hashchange", scrollToHashTarget);
  }, []);
}
