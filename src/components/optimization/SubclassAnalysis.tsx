"use client";

import { ModeLink } from "@/components/no-ai/ModeLink";

import { useEffect, useRef, useState } from "react";
import type { EntityRef, ArticleDocument } from "@/lib/optimization/types";
import { describeRating } from "@/lib/optimization/article-view";
import { documentSchema } from "@/lib/optimization/schema";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { findEditionAccent } from "@/styles/edition-accent";
import { captureRpgbotEvent } from "@/lib/monitoring/rpgbot-analytics";
import { buildRpgbotCtaProps, type RpgbotPlacement } from "@/lib/monitoring/rpgbot-analytics-model";
import { useRpgbotSurfaceView } from "@/lib/monitoring/use-rpgbot-surface-view";
import { AnalystAvatar } from "./AnalystAvatar";
import { ModalArticle } from "./ModalArticle";
import { RatingBadge } from "./RatingBadge";
import { useSubclassAnalysis } from "./SubclassAnalysisContext";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useReadingDialogFocus } from "@/hooks/useReadingDialogFocus";

export function SubclassAnalysis({ entity, placement }: { entity: EntityRef; placement: RpgbotPlacement }) {
  const { preview, canRead, error: previewError } = useSubclassAnalysis(entity);
  useRpgbotSurfaceView(canRead && preview ? { surface: "subclass_analysis", placement, entity_key: entity.entityKey, class_key: entity.parentKey ?? "", rating_score: preview.rating?.score, feature_count: preview.features.length } : null);
  const [document, setDocument] = useState<ArticleDocument | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [articleOpen, setArticleOpen] = useState(false);
  const focus = useReadingDialogFocus();
  const articleRequest = useRef<AbortController | null>(null);
  const accent = findEditionAccent(entity.ruleset === "RULES_2024" ? "2024" : "2014").solid;
  const identity = JSON.stringify(entity);
  useEffect(() => {
    setDocument(null);
    setError("");
    setArticleOpen(false);
    return () => articleRequest.current?.abort();
  }, [identity, canRead]);

  async function openArticle(trigger: HTMLElement) {
    if (!preview || loading) return;
    focus.rememberTrigger(trigger);
    setLoading(true);
    setError("");
    articleRequest.current?.abort();
    const controller = new AbortController();
    articleRequest.current = controller;
    try {
      const params = new URLSearchParams({ view: "article", ruleset: entity.ruleset, slug: preview.slug });
      const response = await fetch(`/api/optimization?${params}`, { signal: controller.signal });
      if (!response.ok) throw new Error("Не вдалося відкрити статтю. Спробуйте ще раз.");
      const article = documentSchema.parse(await response.json());
      if (controller.signal.aborted) return;
      setDocument(article);
      setArticleOpen(true);
      captureRpgbotEvent("rpgbot_analysis_expanded", { placement, entity_key: entity.entityKey, class_key: entity.parentKey ?? "", rating_score: preview.rating?.score });
    } catch (failure) {
      if (controller.signal.aborted) return;
      captureRpgbotEvent("rpgbot_analysis_failed", { entity_key: entity.entityKey });
      setError(failure instanceof Error ? failure.message : "Не вдалося відкрити статтю.");
    }
    finally { setLoading(false); }
  }

  const visibleError = error || previewError;
  if (!canRead || (!preview && !visibleError)) return null;
  const verdictTone = preview?.rating ? describeRating(preview.rating).tone : "none";
  return <div className={`mt-4 rounded-xl border p-4 ${accent.border} ${accent.fill}`}>
    <div className="mb-3 flex items-center gap-3">
      <AnalystAvatar tone={verdictTone} />
      <div>
        <h3 className="font-rpg-display text-lg text-slate-100">Аналіз RPGbot</h3>
        {entity.ruleset === "RULES_2024" ? <p className="text-xs text-amber-200">Приватна чернетка · 2024</p> : null}
      </div>
    </div>
    {visibleError ? <p role="alert" className="text-sm text-rose-200">{visibleError}</p> : null}
    {preview ? <>
        {preview.rating ? <RatingBadge rating={preview.rating} /> : null}
        <FormattedDescription content={preview.binding.preview} className="text-sm text-slate-300" />
        {preview.rating ? <p className="mt-2 text-xs text-slate-400">Контекст оцінки: {preview.rating.context}.</p> : null}
        <button type="button" aria-disabled={loading} onClick={(event) => openArticle(event.currentTarget)} className={`mt-3 min-h-11 underline ${accent.text}`}>{loading ? "Завантаження…" : "Читати повний аналіз"}</button>
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <ModeLink prefetch={false} href={preview.href} {...buildRpgbotCtaProps("open_article", "subclass_analysis", preview.slug)} className={`min-h-11 py-2 underline ${accent.text}`}>Відкрити статтю</ModeLink>
        {preview.builds.map((build) => <ModeLink prefetch={false} key={build.buildId} {...buildRpgbotCtaProps(build.buildId === "build-monk-shadow-2014" ? "create_from_preset" : "assemble_build", "subclass_analysis", build.buildId)} href={build.buildId === "build-monk-shadow-2014" ? "/char/create?preset=monk-shadow-2014&from=subclass_analysis" : `${entity.ruleset === "RULES_2024" ? "/2024" : ""}/optimization/build?build=${build.buildId}`} className={`min-h-11 rounded-lg border px-3 py-2 ${accent.border} ${accent.text}`}>{build.buildId === "build-monk-shadow-2014" ? "Створити Монаха тіні за готовим білдом" : `Зібрати цей варіант: ${build.title}`}</ModeLink>)}
      </div>
    </> : null}
    <Dialog open={articleOpen} onOpenChange={setArticleOpen}>
      <DialogContent {...focus.dialogProps} className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto">
        <DialogTitle>Аналіз RPGbot: {document?.article.titleUk}</DialogTitle>
        {document && preview ? <ModalArticle document={document} sectionId={preview.binding.sectionId} /> : null}
      </DialogContent>
    </Dialog>
  </div>;
}
