"use client";

import type { ReactNode } from "react";
import { useNoAiHref } from "@/components/no-ai/NoAiModeProvider";
import { openTermLink, type TermLink } from "@/lib/term-link";

/// Відмінкова форма з тексту («паралізованою», «дією») заголовком модалки не стає: там словникова
/// назва — та сама, що покаже пряме відкриття адреси.
export function RuleTermAnchor({
  href,
  termLink,
  children,
}: {
  href: string;
  termLink: TermLink;
  children: ReactNode;
}) {
  const buildNoAiHref = useNoAiHref();

  return (
    <a
      href={buildNoAiHref(href)}
      className="text-inherit underline decoration-slate-500 decoration-dotted underline-offset-2 hover:decoration-arcane-400"
      data-stop-card-click
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        openTermLink(termLink);
      }}
    >
      {children}
    </a>
  );
}
