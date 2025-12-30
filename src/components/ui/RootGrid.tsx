"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function RootGrid({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isEmbed, setIsEmbed] = useState(false);

  useEffect(() => {
    const isEmbedParam = (pathname.startsWith("/spells") || pathname.startsWith("/magic-items")) && searchParams.get("origin") === "character";
    const isIframe = typeof window !== "undefined" && window.self !== window.top;
    setIsEmbed(isEmbedParam || isIframe);
  }, [pathname, searchParams]);

  if (isEmbed) {
    return <div className="min-h-screen w-full">{children}</div>;
  }

  return (
    <div className="grid min-h-screen w-full grid-rows-[1fr_auto] md:grid-rows-1 md:grid-cols-[88px_1fr]">
      {children}
    </div>
  );
}
