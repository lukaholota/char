"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { SessionContext } from "next-auth/react";
import { isSiteOwnerEmail } from "@/lib/logic/site-owner";
import { slicePreviewSchema } from "@/lib/optimization/schema";
import type { EntityRef } from "@/lib/optimization/types";
import type { SlicePreview } from "@/lib/optimization/slice-reader";
import type { RpgbotPlacement } from "@/lib/monitoring/rpgbot-analytics-model";

type PreviewState = { preview: SlicePreview | null; error: string; canRead: boolean; placement?: RpgbotPlacement; entity?: EntityRef };
export const SubclassAnalysisContext = createContext<PreviewState | null>(null);

async function readSubclassPreview(entity: EntityRef, signal: AbortSignal) {
  const params = new URLSearchParams({ view: "preview", ruleset: entity.ruleset, classKey: entity.parentKey ?? "", subclassKey: entity.entityKey });
  const response = await fetch(`/api/optimization?${params}`, { signal });
  if (!response.ok) throw new Error("Не вдалося завантажити аналіз.");
  const payload: unknown = await response.json();
  return payload === null ? null : slicePreviewSchema.parse(payload);
}

function useLoadSubclassPreview(entity: EntityRef, enabled: boolean): PreviewState {
  const session = useContext(SessionContext)?.data;
  const canRead = entity.ruleset === "RULES_2014" || isSiteOwnerEmail(session?.user?.email);
  const [response, setResponse] = useState<{ identity: string; preview: SlicePreview | null; error: string } | null>(null);
  const identity = JSON.stringify(entity);
  useEffect(() => {
    if (!canRead || !enabled) return;
    const controller = new AbortController();
    readSubclassPreview(JSON.parse(identity), controller.signal).then((preview) => {
      if (!controller.signal.aborted) setResponse({ identity, preview, error: "" });
    }).catch((failure: Error) => {
      if (!controller.signal.aborted) setResponse({ identity, preview: null, error: failure.message });
    });
    return () => controller.abort();
  }, [identity, canRead, enabled]);
  return { canRead, preview: canRead && response?.identity === identity ? response.preview : null, error: canRead && response?.identity === identity ? response.error : "" };
}

export function SubclassAnalysisProvider({ entity, placement, children }: { entity?: EntityRef; placement: RpgbotPlacement; children: ReactNode }) {
  return entity ? <LoadSubclassAnalysis entity={entity} placement={placement}>{children}</LoadSubclassAnalysis> : <>{children}</>;
}

function LoadSubclassAnalysis({ entity, placement, children }: { entity: EntityRef; placement: RpgbotPlacement; children: ReactNode }) {
  const preview = useLoadSubclassPreview(entity, true);
  return <SubclassAnalysisContext.Provider value={{ ...preview, placement, entity }}>{children}</SubclassAnalysisContext.Provider>;
}

export function useSubclassAnalysis(entity: EntityRef) {
  const shared = useContext(SubclassAnalysisContext);
  const local = useLoadSubclassPreview(entity, shared === null);
  return shared ?? local;
}
