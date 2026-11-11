"use client";

import { useEffect, useState, type RefObject } from "react";

/// Ширина незбільшеної дошки: з неї рахується розмір клітинки, а отже й токенів.
export function useElementWidth(ref: RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setWidth(element.offsetWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}
