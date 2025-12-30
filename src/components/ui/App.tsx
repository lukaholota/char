"use client";

import React from "react";
import { usePathname, useSearchParams } from "next/navigation";

export const App = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isEmbed = pathname.startsWith("/spells") && searchParams.get("origin") === "character";

  return (
    <main
      className={
        "col-start-1 row-start-1 flex min-h-full w-full flex-col items-center pb-20 md:pb-0 " +
        (isEmbed ? "md:col-start-1 md:col-span-2" : "md:col-start-2")
      }
    >
      { children }
    </main>
  )
}
