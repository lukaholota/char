import { splitGlossaryMarkers } from "@/lib/refs/glossary-marker";
import { joinLeadingMarkers } from "./inline-view";
import { collectBlockText } from "./block-text";
import type { ContentBlock, ContentReference, InlineNode, TranslationRevision } from "./types";

export type HydrationTarget = { name: string; engName: string; href: string; sectionId?: string; linkPlainText?: boolean; markerOnly?: boolean; priority?: number; kind?: ContentReference["kind"] | "spell" | "term" };
type HydrationIndex = { targets: ReadonlyMap<string, HydrationTarget | null>; plainTermPattern: RegExp | null; abilities: ReadonlyMap<string, readonly HydrationTarget[]> };
type CreatureSlugs = ReadonlySet<string>;

const NO_CREATURES: CreatureSlugs = new Set();
const CREATURE_LINK = /^(?:\/2024)?\/bestiary\?creature=([^&]+)(&feature=)?/;
const CHOOSER_LINK = /[?&]reference=[^&]*&section=/;
const SECTION_CREATURE_ABILITY_PRIORITY = -0.5;

const normalizedNames = new Map<string, string>();

export function normalizeContentName(name: string) {
  // Catalog names repeat for every section; whole article texts are not kept.
  if (name.length > 200) return normalizeName(name);
  let normalized = normalizedNames.get(name);
  if (normalized === undefined) normalizedNames.set(name, normalized = normalizeName(name));
  return normalized;
}

function normalizeName(name: string) {
  return name.replace(/[’‘ʼ]/g, "'").replace(/^«|»$/g, "").trim().toLocaleLowerCase("uk");
}

export function buildHydrationIndex(targets: readonly HydrationTarget[]): HydrationIndex {
  const index = new Map<string, HydrationTarget | null>();
  const priorities = new Map<string, number>();
  for (const target of targets) for (const name of [target.name, target.engName]) {
    const key = normalizeContentName(name);
    const priority = target.priority ?? 0;
    const previousPriority = priorities.get(key);
    if (previousPriority !== undefined && previousPriority > priority) continue;
    const previous = index.get(key);
    index.set(key, previousPriority === undefined || previousPriority < priority || previous?.href === target.href ? target : null);
    priorities.set(key, priority);
  }
  const plainNames = [...index.entries()].filter(([name, target]) => target?.linkPlainText && normalizeContentName(target.name) === name).map(([name]) => name).sort((a, b) => b.length - a.length);
  const plainTermPattern = plainNames.length ? new RegExp(plainNames.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "giu") : null;
  return { targets: index, plainTermPattern, abilities: buildCreatureAbilityIndex(targets) };
}

function buildCreatureAbilityIndex(targets: readonly HydrationTarget[]) {
  const abilities = new Map<string, HydrationTarget[]>();
  for (const target of targets) if (findAbilityOwner(target.href)) for (const name of new Set([target.name, target.engName].map(normalizeContentName))) {
    const owners = abilities.get(name);
    if (owners) owners.push(target);
    else abilities.set(name, [target]);
  }
  return abilities;
}

function findAbilityOwner(href: string) {
  const match = CREATURE_LINK.exec(href);
  return match?.[2] ? match[1] : undefined;
}

function findLinkedCreature(href: string) {
  const match = CREATURE_LINK.exec(href);
  return match && !match[2] ? match[1] : undefined;
}

function collectLinkedCreatures(nodes: readonly InlineNode[]): CreatureSlugs {
  return new Set(nodes.flatMap((node) => node.type === "link" ? findLinkedCreature(node.href) ?? [] : []));
}

export function hydrateArticleRevision(revision: TranslationRevision, targets: readonly HydrationTarget[]) {
  const text = normalizeContentName(revision.sections.flatMap((section) => section.blocks.flatMap(collectBlockText)).join(" "));
  const mentionedTargets = filterMentionedTargets(targets, text);
  return { ...revision, sections: revision.sections.map((section) => {
    const scopedTargets = collectSectionTargets(mentionedTargets, section.sectionId);
    const index = buildHydrationIndex(scopedTargets);
    return { ...section, blocks: section.blocks.map((block) => hydrateContentBlock(block, index)) };
  }) };
}

export function filterMentionedTargets(targets: readonly HydrationTarget[], text: string) {
  const textChunks = collectTextChunks(text);
  const mentionedNames = new Map<string, boolean>();
  const isMentioned = (name: string) => {
    let isFound = mentionedNames.get(name);
    if (isFound === undefined) mentionedNames.set(name, isFound = !!name && isNameInText(normalizeContentName(name), text, textChunks));
    return isFound;
  };
  return targets.filter((target) => isMentioned(target.name) || isMentioned(target.engName));
}

const CHUNK_LENGTH = 4;

function collectTextChunks(text: string) {
  const chunks = new Set<string>();
  for (let start = 0; start + CHUNK_LENGTH <= text.length; start++) chunks.add(text.slice(start, start + CHUNK_LENGTH));
  return chunks;
}

// Tens of thousands of catalog names are checked against the whole article; most fail on the chunk lookup.
function isNameInText(name: string, text: string, textChunks: ReadonlySet<string>) {
  if (name.length >= CHUNK_LENGTH && (!textChunks.has(name.slice(0, CHUNK_LENGTH)) || !textChunks.has(name.slice(-CHUNK_LENGTH)))) return false;
  return text.includes(name);
}

export function collectSectionTargets(targets: readonly HydrationTarget[], sectionId: string) {
  const kind = findSectionEntityKind(sectionId);
  return targets.filter((target) => !target.sectionId || target.sectionId === sectionId)
    .map((target) => kind && target.kind === kind ? { ...target, priority: Math.max(target.priority ?? 0, 3) } : target);
}

export function collectSectionCreatureAbilities(revisions: readonly TranslationRevision[], targets: readonly HydrationTarget[]): HydrationTarget[] {
  const abilities = new Map<string, HydrationTarget>();
  for (const revision of revisions) {
    const mentionedTargets = filterMentionedTargets(targets, normalizeContentName(revision.sections.flatMap((section) => section.blocks.flatMap(collectBlockText)).join(" ")));
    for (const section of revision.sections) {
      const index = buildHydrationIndex(collectSectionTargets(mentionedTargets, section.sectionId));
      const creatures = collectLinkedCreatures(section.blocks.flatMap((block) => collectBlockNodes(mapBlockNodes(block, (nodes) => hydrateNodes(nodes, index, NO_CREATURES)))));
      for (const ability of [...index.abilities.values()].flat()) if (creatures.has(findAbilityOwner(ability.href)!))
        abilities.set(`${section.sectionId} ${ability.href}`, { ...ability, sectionId: section.sectionId, priority: SECTION_CREATURE_ABILITY_PRIORITY });
    }
  }
  return [...abilities.values()];
}

function isReplaceableByCreatureAbility(target: HydrationTarget) {
  return !target.sectionId && (target.priority ?? 0) <= 0 && !isKeptBesideCreature(target);
}

function isKeptBesideCreature(target: HydrationTarget) {
  return /^(?:\/2024)?\/(?:spells|rules|weapons|armor|invocations|bestiary)\b/.test(target.href);
}

function canYieldToCreatureAbility(target: HydrationTarget) {
  return !!findAbilityOwner(target.href) || CHOOSER_LINK.test(target.href) || isReplaceableByCreatureAbility(target);
}

function preferOwnedCreatureAbility(target: HydrationTarget | null | undefined, names: readonly string[], index: HydrationIndex, creatures: CreatureSlugs) {
  if (!creatures.size || (target && !canYieldToCreatureAbility(target))) return target;
  const owners = findCreatureAbilityOwners(names, creatures, index.abilities);
  if (!owners) return target;
  if (owners.owned.length === 1) return owners.owned[0];
  return target && CHOOSER_LINK.test(target.href) && isSameHrefSet(owners.owned, owners.inSection) ? target : null;
}

function findCreatureAbilityOwners(names: readonly string[], creatures: CreatureSlugs, abilities: HydrationIndex["abilities"]) {
  for (const name of names) {
    const candidates = abilities.get(normalizeContentName(name)) ?? [];
    const owned = [...new Map(candidates.filter((ability) => creatures.has(findAbilityOwner(ability.href)!)).map((ability) => [ability.href, ability])).values()];
    if (owned.length) return { owned, inSection: candidates.filter((ability) => ability.sectionId) };
  }
  return undefined;
}

function isSameHrefSet(left: readonly HydrationTarget[], right: readonly HydrationTarget[]) {
  const rightHrefs = new Set(right.map((target) => target.href));
  return left.length === rightHrefs.size && left.every((target) => rightHrefs.has(target.href));
}

function findSectionEntityKind(sectionId: string): HydrationTarget["kind"] {
  const sections = { feats: "feat", spells: "spell", weapons: "weapon", armor: "armor", backgrounds: "background", races: "race", "magic-items": "magic-item" } as const;
  return Object.entries(sections).find(([name]) => new RegExp(`^section-(?:.+-)?${name}(?:-|$)`).test(sectionId))?.[1];
}

function hydrateContentBlock(block: ContentBlock, index: HydrationIndex): ContentBlock {
  return mapBlockNodes(block, (nodes) => hydrateNodesBesideCreatures(nodes, index));
}

function mapBlockNodes(block: ContentBlock, hydrate: (nodes: readonly InlineNode[]) => InlineNode[]): ContentBlock {
  switch (block.type) {
    case "rating": return block;
    case "list": return { ...block, items: block.items.map(hydrate) };
    case "table": return { ...block, caption: block.caption && hydrate(block.caption), headers: block.headers.map(hydrate), rows: block.rows.map((row) => row.map(hydrate)) };
    default: return { ...block, content: hydrate(block.content) };
  }
}

function collectBlockNodes(block: ContentBlock): InlineNode[] {
  if (block.type === "rating") return [];
  if (block.type === "list") return block.items.flat();
  if (block.type === "table") return [...(block.caption ?? []), ...block.headers.flat(), ...block.rows.flat(2)];
  return block.content;
}

function hydrateNodesBesideCreatures(nodes: readonly InlineNode[], index: HydrationIndex) {
  const hydrated = hydrateNodes(nodes, index, NO_CREATURES);
  const creatures = index.abilities.size ? collectLinkedCreatures(hydrated) : NO_CREATURES;
  return creatures.size ? hydrateNodes(nodes, index, creatures) : hydrated;
}

function hydrateNodes(nodes: readonly InlineNode[], index: HydrationIndex, creatures: CreatureSlugs) {
  return joinLeadingMarkers(nodes).flatMap((node) => hydrateInlineNode(node, index, creatures));
}

function hydrateInlineNode(node: InlineNode, index: HydrationIndex, creatures: CreatureSlugs): InlineNode[] {
  if (node.type === "link") return [hydrateSourceLink(node, index, creatures)];
  if (!["text", "strong", "emphasis"].includes(node.type)) return [node];
  const heading = node.text.replace(/[.:]\s*$/, "");
  const named = (node.type === "strong" || node.type === "emphasis") && preferOwnedCreatureAbility(index.targets.get(normalizeContentName(heading)), [heading], index, creatures);
  if (named && (!named.markerOnly || normalizeContentName(node.text) === normalizeContentName(named.engName))) return [buildContentLink(node, node.text, named.href)];
  return splitGlossaryMarkers(node.text).flatMap((segment): InlineNode[] => {
    const target = segment.original && findMarkedTarget(segment.original, segment.text, index, creatures);
    if (target) return [buildContentLink(node, segment.text || target.name, target.href)];
    if (segment.original) return [{ ...node, text: `{{${segment.text}|${segment.original}}}` }];
    return hydrateNamedText(segment.text, node, index, creatures);
  });
}

function findMarkedTarget(original: string, text: string, index: HydrationIndex, creatures: CreatureSlugs): HydrationTarget | null | undefined {
  return preferOwnedCreatureAbility(findIndexedMarkedTarget(original, text, index), [original, text], index, creatures);
}

function findIndexedMarkedTarget(original: string, text: string, index: HydrationIndex): HydrationTarget | null | undefined {
  const key = normalizeContentName(original);
  const target = index.targets.get(key);
  if (target || !index.targets.has(key)) return target;
  const named = index.targets.get(normalizeContentName(text));
  return named && normalizeContentName(named.engName) === key ? named : null;
}

function hydrateSourceLink(node: Extract<InlineNode, { type: "link" }>, index: HydrationIndex, creatures: CreatureSlugs): InlineNode {
  const marked = splitGlossaryMarkers(node.text);
  const originals = marked.filter((segment) => segment.original);
  const markedRpgbotEntity = /^https:\/\/(?:www\.)?rpgbot\.net\//.test(node.href) && originals.length === 1;
  const markedLegacySource = /^https:\/\/(?:www\.)?dndbeyond\.com\/sources\//.test(node.href) && originals.length === 1;
  const supportedEntityLink = /^https:\/\/(?:www\.)?dndbeyond\.com\/(?:spells|equipment|magic-items|feats|classes|subclasses|species|races|backgrounds|monsters)\//.test(node.href);
  if (!markedRpgbotEntity && !markedLegacySource && !supportedEntityLink) return node;
  const name = node.text.match(/\[([^\]]+)\]$/)?.[1]
    ?? (originals.length === 1 ? originals[0].original! : marked.length === 1 ? marked[0].text : node.text);
  const target = findMarkedTarget(name, originals[0]?.text ?? node.text, index, creatures);
  const sourceRuleset = findExplicitSourceRuleset(node.href);
  if (target && sourceRuleset && sourceRuleset !== (target.href.startsWith("/2024/") ? "RULES_2024" : "RULES_2014")) return node;
  return target ? { ...node, text: target.name, href: target.href } : node;
}

function findExplicitSourceRuleset(href: string): "RULES_2014" | "RULES_2024" | undefined {
  if (/^https:\/\/(?:www\.)?rpgbot\.net\/(?:2024-dnd|2024)(?:[/?#]|$)/.test(href)
    || /^https:\/\/(?:www\.)?dndbeyond\.com\/sources\/(?:dnd\/)?(?:free-rules|(?:phb|dmg|mm|br)-2024)(?:[/?#]|$)/.test(href)) return "RULES_2024";
  if (/^https:\/\/(?:www\.)?rpgbot\.net\/dnd5\/characters(?:[/?#]|$)/.test(href)
    || /^https:\/\/(?:www\.)?dndbeyond\.com\/sources\/(?:dnd\/)?(?:phb|dmg|mm|br)-2014(?:[/?#]|$)/.test(href)) return "RULES_2014";
  return undefined;
}

function hydrateNamedText(text: string, node: InlineNode, index: HydrationIndex, creatures: CreatureSlugs): InlineNode[] {
  const output: InlineNode[] = [];
  const names = /«([^«»]+)»|\[([A-Za-z][A-Za-z’ʼ'\s\/-]+)\]/gu;
  let cursor = 0;
  for (const match of text.matchAll(names)) {
    const quotedOriginal = match[1]?.match(/\[([^\]]+)\]$/)?.[1];
    const name = match[2] ?? quotedOriginal ?? match[1];
    const target = preferOwnedCreatureAbility(index.targets.get(normalizeContentName(name)), [name], index, creatures);
    if (!target || (target.markerOnly && !match[2] && !quotedOriginal)) continue;
    const preceding = text.slice(cursor, match.index!).trimEnd();
    const hasNamedPrefix = !!match[2] && normalizeContentName(preceding.slice(-target.name.length)) === normalizeContentName(target.name);
    const start = hasNamedPrefix ? cursor + preceding.length - target.name.length : match.index!;
    const before = text.slice(cursor, start);
    if (before) output.push({ ...node, text: before });
    output.push(buildContentLink(node, match[2] && !hasNamedPrefix ? match[2] : target.name, target.href));
    cursor = match.index! + match[0].length;
  }
  if (cursor < text.length) output.push({ ...node, text: text.slice(cursor) });
  return output.flatMap((segment) => segment.type === "link" ? [segment] : hydratePlainTerms(segment, index));
}

function hydratePlainTerms(node: InlineNode, index: HydrationIndex): InlineNode[] {
  if (!index.plainTermPattern) return [node];
  const output: InlineNode[] = [];
  let cursor = 0;
  for (const match of node.text.matchAll(index.plainTermPattern)) {
    const start = match.index!;
    const end = start + match[0].length;
    if (/[\p{L}\p{N}]/u.test(node.text[start - 1] ?? "") || /[\p{L}\p{N}]/u.test(node.text[end] ?? "")) continue;
    if (start > cursor) output.push({ ...node, text: node.text.slice(cursor, start) });
    output.push(buildContentLink(node, match[0], index.targets.get(normalizeContentName(match[0]))!.href));
    cursor = end;
  }
  if (cursor < node.text.length) output.push({ ...node, text: node.text.slice(cursor) });
  return output;
}

function buildContentLink(node: InlineNode, text: string, href: string): InlineNode {
  return { type: "link", text, href, ...(node.type === "strong" || node.type === "emphasis" ? { format: node.type } : {}) };
}
