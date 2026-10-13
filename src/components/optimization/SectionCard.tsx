import { ArrowRight } from "lucide-react";
import { findHeadingLevel, findHeadingRating, type OutlineNode, type OutlineSection } from "@/lib/optimization/article-view";
import { cn } from "@/lib/utils";
import { findAccentVariant } from "@/styles/edition-accent";
import { ArticleBlock, type BlockContext } from "./ArticleBlocks";
import { RatingBadge } from "./RatingBadge";
import { CatalogMention } from "./CatalogMention";
import type { SubclassCardLink } from "@/lib/optimization/article-catalog-links.server";

type SectionCardProps = {
  node: OutlineNode;
  is2024: boolean;
  contextFor: (section: OutlineSection) => BlockContext;
  headingLinks?: Readonly<Record<string, SubclassCardLink>>;
};

type HeadingTag = "h2" | "h3" | "h4" | "h5" | "h6";

export function SectionCard({ node, is2024, contextFor, headingLinks = {} }: SectionCardProps) {
  const Heading = `h${findHeadingLevel(node.depth)}` as HeadingTag;
  const context = contextFor(node);
  const headingRating = findHeadingRating(context.ratings, node.sectionId);
  const ratingBadge = headingRating ? <RatingBadge rating={headingRating} className="ml-2 mr-0" /> : null;
  const heading = <CatalogMention href={headingLinks[node.sectionId]?.href ?? null} title={node.heading}>{node.heading}</CatalogMention>;
  const children = node.children.map((child) => <SectionCard key={child.sectionId} node={child} is2024={is2024} contextFor={contextFor} headingLinks={headingLinks} />);

  if (node.depth === 0) {
    return (
      <section id={node.sectionId} aria-labelledby={`${node.sectionId}-heading`} className="glass-card scroll-mt-24 rounded-2xl border border-white/10 bg-slate-950/60 p-6 shadow-xl md:p-8">
        <Heading id={`${node.sectionId}-heading`} tabIndex={-1} className="border-b border-white/10 pb-4 font-rpg-display text-2xl tracking-wide text-slate-100 outline-none md:text-3xl">
          {heading}
          {ratingBadge}
        </Heading>
        <div className="mt-5 font-sans">
          {node.blocks.map((block) => <ArticleBlock key={block.blockId} block={block} context={context} />)}
        </div>
        {children.length ? <div className="mt-6 space-y-6">{children}</div> : null}
      </section>
    );
  }

  return (
    <section
      id={node.sectionId}
      aria-labelledby={`${node.sectionId}-heading`}
      className="scroll-mt-24 rounded-xl border border-l-2 border-white/10 border-l-white/20 bg-slate-900/60 p-5 shadow-md md:p-6"
    >
      <Heading id={`${node.sectionId}-heading`} tabIndex={-1} className="flex items-center gap-2 border-b border-white/5 pb-2 font-rpg-display text-lg font-semibold tracking-wide text-slate-100 outline-none md:text-xl">
        <ArrowRight className={cn("h-4 w-4 shrink-0", findAccentVariant(is2024, { prism: "text-prism-400", arcane: "text-arcane-400" }))} />
        <span>{heading}</span>
        {ratingBadge}
      </Heading>
      <div className="mt-4 font-sans">
        {node.blocks.map((block) => <ArticleBlock key={block.blockId} block={block} context={context} />)}
      </div>
      {children.length ? <div className="mt-5 space-y-5">{children}</div> : null}
    </section>
  );
}
