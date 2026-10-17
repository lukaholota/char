import { buildListTree, describeRating, findCellRating, findHeaderRating, findRating, groupListNodesByKind, type ListNode, type RatingIndex, type ResolvedLink } from "@/lib/optimization/article-view";
import { describeLinkCard, findLegendRating, findLinkCards, findLoneLink, isOwnArticleLink, splitRatedLabel, type LinkCardView } from "@/lib/optimization/inline-view";
import type { AnalysisRating, ContentBlock, InlineNode, OptimizationRuleset } from "@/lib/optimization/types";
import { cn } from "@/lib/utils";
import { findSpellLinkInHref } from "@/lib/spell-link";
import { findTermLinkInHref } from "@/lib/term-link";
import { InlineContent } from "./InlineContent";
import { LinkCard, LinkCardGrid } from "./LinkCards";
import { RATING_LABEL_CLASSES, RatingBadge } from "./RatingBadge";

export type BlockContext = {
  ratingIndex: RatingIndex;
  ratings: readonly AnalysisRating[];
  resolveLink: (href: string) => ResolvedLink;
  linkClassName: string;
  ownArticlePath: string;
  headingLevel: number;
  sectionHeading: string;
  ruleset: OptimizationRuleset;
};

const TEXT_CLASSES = "text-sm leading-relaxed text-slate-300 md:text-[15px]";

export function ArticleBlock({ block, context }: { block: ContentBlock; context: BlockContext }) {
  switch (block.type) {
    case "paragraph":
      return <ParagraphBlock block={block} context={context} />;
    case "heading":
      return <BlockHeading content={block.content} level={Math.max(block.level, context.headingLevel + 1)} context={context} />;
    case "list":
      return <ListBlock block={block} context={context} />;
    case "table":
      return <TableBlock block={block} context={context} />;
    case "rating": {
      const rating = context.ratings.find((entry) => entry.ratingId === block.ratingId);
      return rating ? <p className="mb-4"><RatingBadge rating={rating} /></p> : null;
    }
  }
}

function Inline({ nodes, context }: { nodes: readonly InlineNode[]; context: BlockContext }) {
  const resolveLink = (href: string) => {
    const link = context.resolveLink(href);
    return { ...link, isSamePage: isOwnArticleLink(link.href, context.ownArticlePath) };
  };
  return <InlineContent nodes={nodes} resolveLink={resolveLink} linkClassName={context.linkClassName} ruleset={context.ruleset} />;
}

type RatingLike = Pick<AnalysisRating, "score" | "context">;

function RatedInline({ nodes, rating, context }: { nodes: readonly InlineNode[]; rating: RatingLike | undefined; context: BlockContext }) {
  const split = rating ? splitRatedLabel(nodes) : undefined;
  if (!rating || !split) return <Inline nodes={nodes} context={context} />;
  return (
    <>
      <span data-rating-label className={cn("font-semibold", RATING_LABEL_CLASSES[describeRating(rating).tone])}>
        <Inline nodes={split.label} context={context} />
      </span>
      <Inline nodes={split.rest} context={context} />
    </>
  );
}

function findLoneLinkCard(nodes: readonly InlineNode[], context: BlockContext): LinkCardView | undefined {
  const link = findLoneLink(nodes);
  if (!link) return undefined;
  const card = describeLinkCard(link, context.resolveLink(link.href));
  if (isContentModalHref(card.href)) return undefined;
  return isOwnArticleLink(card.href, context.ownArticlePath) ? undefined : card;
}

function isContentModalHref(href: string) {
  return !!findSpellLinkInHref(href) || !!findTermLinkInHref(href) || /^\/(?:2024\/)?(?:classes\?|races\?|feats\?|bestiary\?|weapons\/|armor\/|magic-items\/|backgrounds\/|invocations\/|infusions\/|metamagic\/|rules\/(?!optimization))/.test(href);
}

function ParagraphBlock({ block, context }: { block: Extract<ContentBlock, { type: "paragraph" }>; context: BlockContext }) {
  const rating = findRating(context.ratingIndex, block.blockId);
  const card = findLoneLinkCard(block.content, context);
  if (card) return <p id={block.blockId} className="mb-4 last:mb-0 sm:max-w-md"><LinkCard card={card} accentClassName={context.linkClassName} className="w-full" rating={rating} /></p>;
  return (
    <p id={block.blockId} className={`mb-4 last:mb-0 ${TEXT_CLASSES}`}>
      {rating ? <RatingBadge rating={rating} /> : null}
      <RatedInline nodes={block.content} rating={rating} context={context} />
    </p>
  );
}

function BlockHeading({ content, level, context }: { content: readonly InlineNode[]; level: number; context: BlockContext }) {
  const Tag = `h${Math.min(level, 6)}` as "h3" | "h4" | "h5" | "h6";
  return <Tag className="mb-2 mt-5 font-rpg-display text-lg tracking-wide text-slate-100"><Inline nodes={content} context={context} /></Tag>;
}

function ListBlock({ block, context }: { block: Extract<ContentBlock, { type: "list" }>; context: BlockContext }) {
  const isFlat = block.depths?.every((depth) => depth === 0) ?? true;
  const hasModalLink = block.items.flat().some((node) => node.type === "link" && isContentModalHref(context.resolveLink(node.href).href));
  const cards = isFlat && !hasModalLink ? findLinkCards(block.items, context.resolveLink, context.ownArticlePath) : undefined;
  return (
    <div id={block.blockId} className="mb-4 last:mb-0">
      {cards ? <LinkCardGrid cards={cards} accentClassName={context.linkClassName} /> : <ListGroups nodes={buildListTree(block)} blockId={block.blockId} context={context} />}
    </div>
  );
}

function ListGroups({ nodes, blockId, context }: { nodes: readonly ListNode[]; blockId: string; context: BlockContext }) {
  return (
    <>
      {groupListNodesByKind(nodes).map((group, index) => {
        const Tag = group.ordered ? "ol" : "ul";
        return (
          <Tag key={index} className={`${group.ordered ? "list-decimal" : "list-disc"} space-y-2 pl-5 marker:text-slate-500 ${TEXT_CLASSES}`}>
            {group.nodes.map((node) => <ListItem key={node.itemIndex} node={node} blockId={blockId} context={context} />)}
          </Tag>
        );
      })}
    </>
  );
}

function ListItem({ node, blockId, context }: { node: ListNode; blockId: string; context: BlockContext }) {
  const rating = findRating(context.ratingIndex, blockId, node.itemIndex) ?? findLegendRating(node.content);
  return (
    <li>
      {rating ? <RatingBadge rating={rating} /> : null}
      <RatedInline nodes={node.content} rating={rating} context={context} />
      {node.children.length ? <div className="mt-2"><ListGroups nodes={node.children} blockId={blockId} context={context} /></div> : null}
    </li>
  );
}

function TableCellRating({ block, rowIndex, cellIndex, context }: { block: Extract<ContentBlock, { type: "table" }>; rowIndex: number; cellIndex: number; context: BlockContext }) {
  const rating = findCellRating(context.ratingIndex, block.blockId, rowIndex, cellIndex);
  return rating ? <RatingBadge rating={rating} /> : null;
}

function TableBlock({ block, context }: { block: Extract<ContentBlock, { type: "table" }>; context: BlockContext }) {
  return (
    <div id={block.blockId} role="region" aria-label={`Таблиця: ${context.sectionHeading}`} tabIndex={0} className="mb-4 overflow-x-auto rounded-lg border border-white/10 last:mb-0">
      <table className="w-full min-w-max border-collapse text-sm text-slate-300">
        {block.caption ? <caption className="px-3 py-2 text-left text-slate-400"><Inline nodes={block.caption} context={context} /></caption> : null}
        <thead className="bg-slate-950/40">
          <tr className="border-b border-slate-600/60">
            {block.headers.map((cell, index) => (
              <th key={index} scope="col" className="border border-slate-600 px-3 py-2 text-left font-semibold text-inherit">
                <TableHeaderRating blockId={block.blockId} cellIndex={index} context={context} />
                <Inline nodes={cell} context={context} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-slate-600/60">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="border border-slate-600 px-3 py-2 align-top text-inherit">
                  <TableCellRating block={block} rowIndex={rowIndex} cellIndex={cellIndex} context={context} />
                  <Inline nodes={cell} context={context} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableHeaderRating({ blockId, cellIndex, context }: { blockId: string; cellIndex: number; context: BlockContext }) {
  const rating = findHeaderRating(context.ratingIndex, blockId, cellIndex);
  return rating ? <RatingBadge rating={rating} /> : null;
}
