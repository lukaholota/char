"use client";

import { Fragment } from "react";
import { findSpellLinkInHref } from "@/lib/spell-link";
import { findTermLinkInHref } from "@/lib/term-link";
import { SpellAnchor } from "@/components/ui/SpellAnchor";
import { RuleTermAnchor } from "@/components/ui/RuleTermAnchor";
import { CreatureAnchor, findCreatureReadingLink } from "@/components/ui/CreatureAnchor";
import { LeavingLink } from "./LeavingLink";
import { useOpenContentReference } from "./ContentReferenceContext";
import { ModeLink } from "@/components/no-ai/ModeLink";
import { GlossaryTerm } from "@/components/ui/GlossaryTerm";
import type { ResolvedLink } from "@/lib/optimization/article-view";
import { joinLeadingMarkers, splitJargon, splitLineBreaks } from "@/lib/optimization/inline-view";
import type { InlineNode } from "@/lib/optimization/types";
import { splitGlossaryMarkers } from "@/lib/refs/glossary-marker";

type InlineContentProps = {
  nodes: readonly InlineNode[];
  resolveLink: (href: string) => ResolvedLink;
  linkClassName: string;
};

export function InlineContent({ nodes, resolveLink, linkClassName }: InlineContentProps) {
  return (
    <>
      {joinLeadingMarkers(nodes).map((node, index) => (
        <InlineNodeView key={index} node={node} resolveLink={resolveLink} linkClassName={linkClassName} />
      ))}
    </>
  );
}

function InlineNodeView({ node, resolveLink, linkClassName }: { node: InlineNode } & Omit<InlineContentProps, "nodes">) {
  switch (node.type) {
    case "text":
    case "rating":
      return <GlossaryText text={node.text} />;
    case "emphasis":
      return <em><GlossaryText text={node.text} /></em>;
    case "strong":
      return <strong className="font-semibold text-slate-50"><GlossaryText text={node.text} /></strong>;
    case "superscript":
      return <sup><GlossaryText text={node.text} /></sup>;
    case "subscript":
      return <sub><GlossaryText text={node.text} /></sub>;
    case "link":
      return <ArticleLink node={node} resolveLink={resolveLink} className={linkClassName} />;
  }
}

function ArticleLink({ node, resolveLink, className }: { node: Extract<InlineNode, { type: "link" }>; resolveLink: InlineContentProps["resolveLink"]; className: string }) {
  const openReference = useOpenContentReference();
  const link = resolveLink(node.href);
  const linkClassName = `${className} underline underline-offset-2 hover:opacity-80`;
  const content = splitGlossaryMarkers(node.text).map((segment, index) =>
    segment.original === undefined ? segment.text : <abbr key={index} title={segment.original}>{segment.text}</abbr>
  );
  const children = node.format === "strong" ? <strong>{content}</strong> : node.format === "emphasis" ? <em>{content}</em> : content;
  const spellLink = findSpellLinkInHref(link.href);
  if (spellLink) return <SpellAnchor spellLink={spellLink}>{children}</SpellAnchor>;
  const termLink = findTermLinkInHref(link.href);
  if (termLink) return <RuleTermAnchor href={link.href} termLink={termLink}>{children}</RuleTermAnchor>;
  const creatureLink = findCreatureReadingLink(link.href);
  if (creatureLink) return <CreatureAnchor href={link.href} creatureLink={creatureLink}>{children}</CreatureAnchor>;
  if (link.isSamePage) return <ModeLink prefetch={false} href={link.href} className={linkClassName}>{children}</ModeLink>;
  if (openReference?.has(link.href)) return <ModeLink prefetch={false} href={link.href} className={linkClassName} onClick={(event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (openReference.open(link.href)) { event.preventDefault(); event.stopPropagation(); }
  }}>{children}</ModeLink>;
  return <LeavingLink href={link.href} isNewTab={link.isExternal} className={className}>{children}</LeavingLink>;
}

function GlossaryText({ text }: { text: string }) {
  return (
    <>
      {splitLineBreaks(text).map((part, index) => {
        if (part.kind === "line") return <br key={index} />;
        if (part.kind === "paragraph") return <span key={index} aria-hidden className="block h-3" />;
        return <MarkedText key={index} text={part.text} />;
      })}
    </>
  );
}

function MarkedText({ text }: { text: string }) {
  return (
    <>
      {splitGlossaryMarkers(text).map((segment, index) =>
        segment.original === undefined ? <JargonText key={index} text={segment.text} /> : <GlossaryTerm key={index} original={segment.original}>{segment.text}</GlossaryTerm>
      )}
    </>
  );
}

function JargonText({ text }: { text: string }) {
  return (
    <>
      {splitJargon(text).map((part, index) => (
        <Fragment key={index}>
          {part.jargon ? <GlossaryTerm original={part.jargon.expansion} hint={part.jargon.explanation}>{part.text}</GlossaryTerm> : part.text}
        </Fragment>
      ))}
    </>
  );
}
