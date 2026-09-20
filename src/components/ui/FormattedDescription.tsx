"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { expandGlossaryMarkersToHtml } from "@/lib/refs/glossary-marker";
import { GlossaryTerm } from "@/components/ui/GlossaryTerm";
import { findSpellLinkInHref } from "@/lib/spell-link";
import { SpellAnchor } from "@/components/ui/SpellAnchor";
import { RuleTermAnchor } from "@/components/ui/RuleTermAnchor";
import { findTermLinkInHref } from "@/lib/term-link";

const sanitizeSchema = {
  ...defaultSchema,
  tagNames: Array.from(
    new Set([
      ...(defaultSchema.tagNames ?? []),
      "a",
      "p",
      "br",
      "hr",
      "strong",
      "em",
      "ul",
      "ol",
      "li",
      "blockquote",
      "code",
      "pre",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "abbr",
    ])
  ),
  attributes: {
    ...(defaultSchema.attributes ?? {}),
    a: ["href", "title", "target", "rel"],
    abbr: ["title"],
  },
} as const;

function preserveSingleLineBreaks(markdown?: string | null): string {
  const safe = typeof markdown === "string" ? markdown : "";
  const normalized = safe.replace(/\r\n/g, "\n");
  if (!normalized.includes("\n")) return normalized;

  // Preserve formatting inside fenced code blocks.
  const parts = normalized.split(/```/);
  return parts
    .map((part, idx) => {
      if (idx % 2 === 1) return part;
      // Convert single newlines to Markdown hard breaks.
      return part.replace(/([^\n])\n(?!\n)/g, "$1  \n");
    })
    .join("```");
}

export const FormattedDescription = React.memo(function FormattedDescription({
  content,
  className,
}: {
  content?: string | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeRaw], [rehypeSanitize, sanitizeSchema]]}
        components={{
          strong: ({ children }) => <span className="accent-strong font-semibold">{children}</span>,
          a: ({ href, children }) => {
            const spellLink = findSpellLinkInHref(href);
            const termLink = spellLink ? null : findTermLinkInHref(href);

            if (termLink) {
              return (
                <RuleTermAnchor href={href ?? ""} termLink={termLink}>
                  {children}
                </RuleTermAnchor>
              );
            }

            if (!spellLink) {
              return (
                <a
                  href={href}
                  className="accent-link underline underline-offset-2 hover:opacity-80"
                  target={href?.startsWith("http") ? "_blank" : undefined}
                  rel={href?.startsWith("http") ? "noreferrer" : undefined}
                >
                  {children}
                </a>
              );
            }

            return <SpellAnchor spellLink={spellLink}>{children}</SpellAnchor>;
          },
          p: ({ children }) => <p className="mb-3 text-sm leading-relaxed text-inherit last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-inherit">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-inherit">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-slate-950/40">{children}</thead>,
          tr: ({ children }) => <tr className="border-b border-slate-600/60">{children}</tr>,
          th: ({ children }) => (
            <th className="border border-slate-600 px-3 py-2 text-left font-semibold text-inherit">{children}</th>
          ),
          td: ({ children }) => <td className="border border-slate-600 px-3 py-2 text-inherit">{children}</td>,
          abbr: ({ title, children }) => <GlossaryTerm original={title ?? ""}>{children}</GlossaryTerm>,
        }}
      >
        {expandGlossaryMarkersToHtml(preserveSingleLineBreaks(content))}
      </ReactMarkdown>
    </div>
  );
});
