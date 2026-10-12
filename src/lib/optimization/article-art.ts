import { getSubclassImagePath } from "@/lib/assets/image-manifest";
import { getAllClasses } from "@/lib/classesData";
import type { DraftSummary } from "./article-view";

const CLASS_GUIDE_TOPIC = "класовий гайд";

export type SubclassKeyBySlug = Readonly<Record<string, string>>;

type ArtSubject = Pick<DraftSummary, "slug" | "ruleset" | "topics">;

export function findArticleImageSrc(summary: ArtSubject, subclassKeyBySlug: SubclassKeyBySlug): string | null {
  const subclassKey = subclassKeyBySlug[summary.slug];
  if (subclassKey) return getSubclassImagePath(subclassKey);
  return isClassGuide(summary) ? findClassImageSrc(summary) : null;
}

function isClassGuide(summary: ArtSubject): boolean {
  return summary.topics[1] === CLASS_GUIDE_TOPIC;
}

function findClassImageSrc(summary: ArtSubject): string | null {
  const className = summary.topics[0];
  return getAllClasses(summary.ruleset).find((characterClass) => characterClass.name === className)?.imageSrc ?? null;
}
