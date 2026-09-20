"use client";

import type { ReactNode } from "react";
import { useNoAiHref } from "@/components/no-ai/NoAiModeProvider";
import { buildSpellHref, openSpellLink, type SpellLink } from "@/lib/spell-link";

export function SpellAnchor({ spellLink, children }: { spellLink: SpellLink; children: ReactNode }) {
  const buildNoAiHref = useNoAiHref();

  return (
    <a
      href={buildNoAiHref(buildSpellHref(spellLink))}
      className="text-arcane-400 underline underline-offset-2 hover:text-arcane-300"
      data-stop-card-click
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        openSpellLink(spellLink);
      }}
    >
      {children}
    </a>
  );
}
