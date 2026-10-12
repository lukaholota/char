"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import type { ContentReference } from "@/lib/optimization/types";
import { ContentReferenceContext, useOpenContentReference } from "./ContentReferenceContext";
import { useReadingDialogFocus } from "@/hooks/useReadingDialogFocus";
import { readingReferenceHref } from "@/lib/optimization/reading-reference-href";
import { findReferenceCardTarget } from "@/lib/optimization/reference-card-target";
import { buildRpgbotCtaProps, type RpgbotSurface } from "@/lib/monitoring/rpgbot-analytics-model";
import { LeavingLink } from "./LeavingLink";
import { ReferenceCardView } from "./ReferenceCardView";

export function ContentReferenceProvider({ references = [], surface, children }: { references?: readonly ContentReference[]; surface: RpgbotSurface; children: ReactNode }) {
  const parent = useOpenContentReference();
  const [selected, setSelected] = useState<ContentReference | null>(null);
  const findReference = (href: string) => references.find((reference) => reference.href === href);
  const opener = {
    has: (href: string) => !!findReference(href) || !!parent?.has(href),
    open: (href: string) => {
      const reference = findReference(href);
      if (!reference) return parent?.open(href) ?? false;
      setSelected(reference);
      return true;
    },
  };
  return <ContentReferenceContext.Provider value={opener}>
    {children}
    <ContentReferenceDialog reference={selected} surface={surface} onClose={() => setSelected(null)} />
  </ContentReferenceContext.Provider>;
}

function ContentReferenceDialog({ reference, surface, onClose }: { reference: ContentReference | null; surface: RpgbotSurface; onClose: () => void }) {
  const focus = useReadingDialogFocus();
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const onBranchChange = useCallback((isOpen: boolean) => setIsBranchOpen(isOpen), []);
  const close = () => { setIsBranchOpen(false); onClose(); };
  return <Dialog open={reference !== null} onOpenChange={(open) => { if (!open) close(); }}>
    <DialogContent {...focus.dialogProps} showClose={!isBranchOpen} aria-describedby={undefined}
      className="max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-3xl grid-cols-[minmax(0,1fr)] overflow-y-auto overflow-x-hidden p-4 sm:p-6">
      {reference ? <ReferenceContent reference={reference} surface={surface} onBranchChange={onBranchChange} onClose={close} />
        : <DialogTitle className="sr-only">Довідка</DialogTitle>}
    </DialogContent>
  </Dialog>;
}

type ContentProps = { reference: ContentReference; surface: RpgbotSurface; onBranchChange: (isOpen: boolean) => void; onClose: () => void };

function ReferenceContent({ reference, surface, onBranchChange, onClose }: ContentProps) {
  const target = findReferenceCardTarget(reference);
  const catalogLink = <CatalogLink reference={reference} surface={surface} />;
  if (reference.options) return <>
    <DialogTitle className="pr-6 text-lg font-bold sm:text-xl">{reference.name}</DialogTitle>
    <p className="text-sm text-slate-300">Оберіть варіант, щоб прочитати його опис.</p>
    <div className="space-y-3">
      {reference.options.map((option) => <details key={option.href} className="rounded-lg border border-slate-700 p-3">
        <summary className="min-h-11 cursor-pointer text-slate-100">{[option.name, ...option.details.map((detail) => `${detail.label}: ${detail.value}`)].join(" · ")}</summary>
        <OptionContent reference={option} surface={surface} onBranchChange={onBranchChange} onClose={onClose} />
      </details>)}
    </div>
  </>;
  if (target) return <>
    <DialogTitle className="sr-only">{reference.name}</DialogTitle>
    <ReferenceCardView href={reference.href} target={target} onBranchChange={onBranchChange} onClose={onClose}
      unavailable={<p role="alert" className="py-4 text-sm text-slate-300">Не вдалося завантажити опис. {catalogLink}</p>} />
  </>;
  return <>
    <DialogTitle className="pr-6 text-lg font-bold sm:text-xl">{reference.name}</DialogTitle>
    <FeatureSheetBody reference={reference} catalogLink={catalogLink} />
  </>;
}

function OptionContent({ reference, surface, onBranchChange, onClose }: ContentProps) {
  const target = findReferenceCardTarget(reference);
  const catalogLink = <CatalogLink reference={reference} surface={surface} />;
  if (target) return <div className="mt-3"><ReferenceCardView href={reference.href} target={target} onBranchChange={onBranchChange} onClose={onClose}
    unavailable={<p role="alert" className="text-sm text-slate-300">Не вдалося завантажити опис. {catalogLink}</p>} /></div>;
  return <div className="mt-3"><FeatureSheetBody reference={reference} catalogLink={catalogLink} /></div>;
}

function FeatureSheetBody({ reference, catalogLink }: { reference: ContentReference; catalogLink: ReactNode }) {
  return <div className="space-y-3">
    {reference.details.length ? <p className="text-sm text-slate-400">{reference.details.map((detail) => `${detail.label}: ${detail.value}`).join(" · ")}</p> : null}
    {reference.description ? <div className="glass-panel rounded-xl border border-slate-800/70 p-3 sm:p-4">
      <FormattedDescription content={reference.description} className="text-slate-200/90" />
    </div> : null}
    {catalogLink}
  </div>;
}

function CatalogLink({ reference, surface }: { reference: ContentReference; surface: RpgbotSurface }) {
  return <LeavingLink href={readingReferenceHref(reference.href)} {...buildRpgbotCtaProps("open_catalog", surface, reference.engName)}>Відкрити в каталозі</LeavingLink>;
}
