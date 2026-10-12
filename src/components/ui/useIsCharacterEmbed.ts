"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const EMBEDDABLE_PATHS = ["/spells", "/magic-items", "/2024/spells", "/2024/magic-items"];

// Не useSearchParams: тоді оболонка навколо всіх сторінок потребує Suspense, і notFound() віддає 200 замість 404.
export function useIsCharacterEmbed() {
  const pathname = usePathname();
  const [isEmbed, setIsEmbed] = useState(false);

  useEffect(() => {
    const isEmbeddablePath = EMBEDDABLE_PATHS.some((path) => pathname.startsWith(path));
    setIsEmbed(isEmbeddablePath && new URLSearchParams(window.location.search).get("origin") === "character");
  }, [pathname]);

  return isEmbed;
}
