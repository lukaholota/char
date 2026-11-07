"use client";

import { useEffect, useState } from "react";

const BREAKPOINTS = {
  md: 768,
  lg: 1024,
  wide: 1700,
} as const;

export function useMediaQuery(breakpoint: keyof typeof BREAKPOINTS) {
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
