"use client";

import type { ComponentProps, ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { ModeLink } from "@/components/no-ai/ModeLink";
import { cn } from "@/lib/utils";

const BADGE_CLASS = "relative rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5 no-underline [box-decoration-break:clone] hover:bg-white/10";

/** Links that leave the article look like a badge; underlined text opens a dialog in place. */
export function LeavingLink({ href, isNewTab = false, className, children, ...rest }: Omit<ComponentProps<"a">, "href"> & { href: string; isNewTab?: boolean; children: ReactNode }) {
  const content = <>
    {children}
    <ArrowUpRight aria-hidden className="ml-0.5 inline h-3.5 w-3.5 align-[-0.15em]" />
    {isNewTab ? <span className="sr-only"> (відкриється в новій вкладці)</span> : null}
  </>;
  if (isNewTab) return <a href={href} target="_blank" rel="noreferrer" className={cn(BADGE_CLASS, className)} {...rest}>{content}</a>;
  return <ModeLink prefetch={false} href={href} className={cn(BADGE_CLASS, className)} {...rest}>{content}</ModeLink>;
}
