"use client";

import type { ReactNode } from "react";

// Діти з сервера, що ще в дорозі, не можна класти прямо в HTML-тег: повтор тегу під час гідратації вдруге забирає DOM-вузол (React #418).
export function StreamedChildren({ children }: { children: ReactNode }) {
  return children;
}
