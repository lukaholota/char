"use client";

import { useEffect, useState } from "react";

const BREAKPOINTS: Record<"md" | "lg", number> = {
  md: 768,
  lg: 1024,
};

export function useMediaQuery(breakpoint: "md" | "lg") {
  const minWidth = BREAKPOINTS[breakpoint];
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${minWidth}px)`);
    const onChange = () => setMatches(mql.matches);

    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [minWidth]);

  return matches;
}
