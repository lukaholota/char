"use client";

import { useContext, useState } from "react";
import type { z } from "zod";
import type { featureAnalysisSchema } from "@/lib/optimization/schema";
import type { EntityRef } from "@/lib/optimization/types";
import { ModeLink } from "@/components/no-ai/ModeLink";
import { describeRating } from "@/lib/optimization/article-view";
import { AnalystEye } from "./AnalystAvatar";
import { ArticleBlock } from "./ArticleBlocks";
import { InlineContent } from "./InlineContent";
import { RatingBadge } from "./RatingBadge";
import { SubclassAnalysisContext } from "./SubclassAnalysisContext";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useReadingDialogFocus } from "@/hooks/useReadingDialogFocus";
import { ContentReferenceProvider } from "./ContentReferenceProvider";
import { captureRpgbotEvent } from "@/lib/monitoring/rpgbot-analytics";
import { buildRpgbotCtaProps, type RpgbotPlacement } from "@/lib/monitoring/rpgbot-analytics-model";

export function FeatureAnalysis({ featureKey, name, level }: { featureKey?: string; name: string; level: number }) {
  const analysis = useContext(SubclassAnalysisContext);
  if (!analysis?.canRead) return null;
  const matches = analysis.preview?.features.filter((feature) => featureKey
    ? feature.binding.entity.entityKey === featureKey
    : feature.name === name && feature.level === level) ?? [];
  if (matches.length !== 1) return null;
  const feature = matches[0];
  return <ContentReferenceProvider key={feature.binding.bindingId} references={feature.contentReferences} surface="feature_analysis">
    <BoundFeatureAnalysis feature={feature} name={name} placement={analysis.placement} subclass={analysis.entity} />
  </ContentReferenceProvider>;
}

function BoundFeatureAnalysis({ feature, name, placement, subclass }: { feature: z.infer<typeof featureAnalysisSchema>; name: string; placement?: RpgbotPlacement; subclass?: EntityRef }) {
  const [open, setOpen] = useState(false);
  const focus = useReadingDialogFocus();
  return <>
    <button type="button" aria-label={`Аналіз RPGbot: ${name}`} title={`Аналіз RPGbot: ${name}`} aria-haspopup="dialog"
      onClick={(event) => { focus.rememberTrigger(event.currentTarget); setOpen(true); captureRpgbotEvent("rpgbot_feature_analysis_opened", { placement, feature_key: feature.binding.entity.entityKey, subclass_key: subclass?.entityKey, class_key: subclass?.parentKey, rating_score: feature.rating?.score }); }} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-300 hover:bg-white/5">
      <AnalystEye tone={feature.rating ? describeRating(feature.rating).tone : "none"} />
    </button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent {...focus.dialogProps} className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto text-sm leading-relaxed text-slate-300">
      <DialogTitle>Аналіз RPGbot: {name}</DialogTitle>
        <FeatureAnalysisContent feature={feature} name={name} />
      </DialogContent>
    </Dialog>
  </>;
}

function FeatureAnalysisContent({ feature, name }: { feature: z.infer<typeof featureAnalysisSchema>; name: string }) {
  return <>
      {feature.rating ? <div><RatingBadge rating={feature.rating} /></div> : <p className="mb-2 text-xs text-slate-400">Без окремої оцінки автора</p>}
      <div><InlineContent nodes={feature.content} resolveLink={(href) => ({ href, isExternal: /^https?:/.test(href) })} linkClassName="text-amber-200" /></div>
      {feature.childrenBlock ? <div className="mt-2"><ArticleBlock block={feature.childrenBlock} context={{
        ratingIndex: new Map(), ratings: [], resolveLink: (href) => ({ href, isExternal: /^https?:/.test(href) }),
        linkClassName: "text-amber-200", ownArticlePath: feature.href.split("#")[0], headingLevel: 3, sectionHeading: name,
      }} /></div> : null}
      <ModeLink prefetch={false} href={feature.href} {...buildRpgbotCtaProps("open_article", "feature_analysis", feature.binding.entity.entityKey)} className="mt-3 block min-h-11 py-2 text-amber-200 underline">Відкрити в статті</ModeLink>
  </>;
}
