"use client";

import { useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useCreatureStatblock } from "@/hooks/useCreatureStatblock";
import { useReadingDialogFocus } from "@/hooks/useReadingDialogFocus";
import { useNoAiHref } from "@/components/no-ai/NoAiModeProvider";
import { findCreatureReadingLink } from "@/lib/creature-link";

// `loading` gives the lazy card its own Suspense boundary; without it the root boundary hides the page and scroll resets.
const CreatureStatblockCard = dynamic(() => import("@/components/bestiary/CreatureStatblockCard").then((module) => module.CreatureStatblockCard), { loading: () => null });

export { findCreatureReadingLink };

export function CreatureAnchor({ href, creatureLink, children }: {
  href: string; creatureLink: NonNullable<ReturnType<typeof findCreatureReadingLink>>; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { creature } = useCreatureStatblock(open ? creatureLink.key : null, creatureLink.ruleset, null);
  const focus = useReadingDialogFocus();
  const modeHref = useNoAiHref();
  return <>
    <a href={modeHref(href)} className="accent-link underline underline-offset-2 hover:opacity-80" data-stop-card-click
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault(); event.stopPropagation(); focus.rememberTrigger(event.currentTarget); setOpen(true);
      }}>{children}</a>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent {...focus.dialogProps} className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto">
        <DialogTitle>{creature?.name ?? children}</DialogTitle>
        {creature ? <CreatureStatblockCard creature={creature} is2024={creatureLink.ruleset === "RULES_2024"} />
          : <p role="status">Завантаження статблоку…</p>}
      </DialogContent>
    </Dialog>
  </>;
}
