"use client";

import { useEffect, useState } from "react";
import { useIsCharacterEmbed } from "./useIsCharacterEmbed";

export function RootGrid({ children }: { children: React.ReactNode }) {
  const isCharacterEmbed = useIsCharacterEmbed();
  const [isInsideIframe, setIsInsideIframe] = useState(false);

  useEffect(() => setIsInsideIframe(window.self !== window.top), []);

  if (isCharacterEmbed || isInsideIframe) {
    return <div className="min-h-screen w-full">{children}</div>;
  }

  return (
    <div className="safe-root-grid grid h-dvh w-full grid-rows-[1fr_auto] md:grid-rows-1 md:grid-cols-[88px_1fr]">
      {children}
    </div>
  );
}
