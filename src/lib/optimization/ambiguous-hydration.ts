import { collectSectionTargets, filterMentionedTargets, normalizeContentName, type HydrationTarget } from "./content-hydration";
import type { ContentBlock, ContentReference, TranslationRevision } from "./types";

function collectCandidates(targets: readonly HydrationTarget[], sectionText: string) {
  const candidates = new Map<string, HydrationTarget[]>();
  for (const target of targets) for (const name of [target.name, target.engName]) {
    const key = normalizeContentName(name);
    if (!key || !sectionText.includes(key)) continue;
    const previous = candidates.get(key) ?? [];
    const priority = target.priority ?? 0;
    const previousPriority = previous[0]?.priority ?? 0;
    if (previous.length && priority < previousPriority) continue;
    candidates.set(key, priority > previousPriority ? [target] : [...previous, target]);
  }
  return candidates;
}

function buildAlternativeReference(name: string, sectionId: string, candidates: HydrationTarget[], references: ReadonlyMap<string, ContentReference>): ContentReference | null {
  const options = [...new Map(candidates.flatMap((target) => {
    const reference = references.get(target.href);
    return reference?.description ? [[target.href, reference] as const] : [];
  })).values()];
  if (options.length < 2) return null;
  return { kind: options[0].kind, name: options[0].name, engName: candidates[0].engName,
    href: `/classes?reference=${encodeURIComponent(name)}&section=${encodeURIComponent(sectionId)}`, details: [], options };
}

export function collectAmbiguousHydration(revisions: readonly TranslationRevision[], targets: readonly HydrationTarget[], references: readonly ContentReference[]) {
  const referenceIndex = new Map(references.map((reference) => [reference.href, reference]));
  const alternatives: ContentReference[] = [];
  const alternativeTargets: HydrationTarget[] = [];
  const sectionTexts = collectSectionTexts(revisions);
  const mentionedTargets = filterMentionedTargets(targets, [...sectionTexts.values()].join(" "));
  for (const [sectionId, sectionText] of sectionTexts) {
    for (const [name, candidates] of collectCandidates(collectSectionTargets(mentionedTargets, sectionId), sectionText)) {
      const reference = buildAlternativeReference(name, sectionId, candidates, referenceIndex);
      if (!reference) continue;
      alternatives.push(reference);
      alternativeTargets.push({ name, engName: name, href: reference.href, sectionId, priority: (candidates[0].priority ?? 0) + 1 });
    }
  }
  return { references: alternatives, targets: alternativeTargets };
}


function collectSectionTexts(revisions: readonly TranslationRevision[]): Map<string, string> {
  const texts = new Map<string, string>();
  for (const revision of revisions) for (const section of revision.sections) {
    const text = section.blocks.flatMap(collectBlockText).join(" ");
    texts.set(section.sectionId, `${texts.get(section.sectionId) ?? ""} ${normalizeContentName(text)}`);
  }
  return texts;
}

function collectBlockText(block: ContentBlock): string[] {
  const nodes = block.type === "rating" ? [] : block.type === "list" ? block.items.flat()
    : block.type === "table" ? [...(block.caption ?? []), ...block.headers.flat(), ...block.rows.flat(2)] : block.content;
  return nodes.map((node) => node.text);
}
