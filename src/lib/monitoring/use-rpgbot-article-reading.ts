"use client";

import { useEffect } from "react";
import { captureRpgbotEvent } from "@/lib/monitoring/rpgbot-analytics";
import { findLinkKind, findReachedReadDepth, type ReadDepthMilestone } from "@/lib/monitoring/rpgbot-analytics-model";
import type { ContentReference } from "@/lib/optimization/types";
import { findSpellLinkInHref } from "@/lib/spell-link";
import { findTermLinkInHref } from "@/lib/term-link";

const CONTENT_SELECTOR = "[data-article-content]";
const SECTION_SELECTOR = `${CONTENT_SELECTOR} section[id]`;

export function useRpgbotArticleReading(articleSlug: string, references?: readonly ContentReference[]): void {
  useEffect(() => {
    const stopDepth = trackReadDepth(articleSlug);
    const stopLinks = trackLinkClicks(articleSlug, buildReferenceCheck(references));
    return () => { stopDepth(); stopLinks(); };
  }, [articleSlug, references]);
}

function buildReferenceCheck(references: readonly ContentReference[] = []): (href: string) => boolean {
  const referenceHrefs = new Set(references.map((reference) => reference.href));
  return (href) => referenceHrefs.has(href) || findSpellLinkInHref(href) !== null || findTermLinkInHref(href) !== null;
}

function trackReadDepth(articleSlug: string): () => void {
  const sections = [...document.querySelectorAll<HTMLElement>(SECTION_SELECTOR)];
  if (sections.length === 0 || typeof IntersectionObserver === "undefined") return () => undefined;
  const seen = new Set<Element>();
  const reported: ReadDepthMilestone[] = [];
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      seen.add(entry.target);
      observer.unobserve(entry.target);
    }
    for (const depth_percent of findReachedReadDepth(seen.size, sections.length, reported)) {
      reported.push(depth_percent);
      captureRpgbotEvent("rpgbot_article_read_depth", { article_slug: articleSlug, depth_percent, section_count: sections.length });
    }
  }, { rootMargin: "0px 0px -30% 0px" });
  sections.forEach((section) => observer.observe(section));
  return () => observer.disconnect();
}

function trackLinkClicks(articleSlug: string, isReferenceHref: (href: string) => boolean): () => void {
  const content = document.querySelector(CONTENT_SELECTOR);
  if (!content) return () => undefined;
  const onClick = (event: Event) => {
    const href = event.target instanceof Element ? event.target.closest("a[href]")?.getAttribute("href") : null;
    if (href) captureRpgbotEvent("rpgbot_article_link_clicked", { article_slug: articleSlug, link_kind: findLinkKind(href, isReferenceHref) });
  };
  content.addEventListener("click", onClick, { passive: true });
  return () => content.removeEventListener("click", onClick);
}
