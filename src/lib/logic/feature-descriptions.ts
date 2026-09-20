import { stripGlossaryMarkers } from "@/lib/refs/glossary-marker";

export const FEATURE_DESCRIPTION_KINDS = ["FEATURE", "FEAT", "INFUSION"] as const;
export const MAX_CUSTOM_DESCRIPTION_LENGTH = 10_000;

export type FeatureDescriptionKind = (typeof FEATURE_DESCRIPTION_KINDS)[number];

export type FeatureDescriptionTarget = { kind: FeatureDescriptionKind; refId: number };

export type StoredFeatureDescription = { kind: string; refId: number; description: string };

export type CustomDescriptionInput =
  | { action: "SAVE"; description: string }
  | { action: "RESET" }
  | { action: "INVALID"; error: string };

export function isFeatureDescriptionKind(value: unknown): value is FeatureDescriptionKind {
  return (FEATURE_DESCRIPTION_KINDS as readonly unknown[]).includes(value);
}

export function findCustomDescription(stored: readonly StoredFeatureDescription[] | undefined, target: FeatureDescriptionTarget): string | null {
  return stored?.find((entry) => entry.kind === target.kind && entry.refId === target.refId)?.description ?? null;
}

export function readCustomDescriptionInput(raw: string): CustomDescriptionInput {
  const description = raw.replace(/\r\n/g, "\n").trim();
  if (!description) return { action: "RESET" };
  if (description.length > MAX_CUSTOM_DESCRIPTION_LENGTH) {
    return { action: "INVALID", error: `Опис задовгий: до ${MAX_CUSTOM_DESCRIPTION_LENGTH} символів` };
  }
  return { action: "SAVE", description };
}

export function buildEditableDescription(description: string, isCustom: boolean): string {
  if (isCustom) return description;
  return stripGlossaryMarkers(description)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ");
}
