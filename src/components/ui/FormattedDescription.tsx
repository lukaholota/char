"use client";

import React from "react";
import clsx from "clsx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

function extractSpellIdFromHref(href: string | undefined): string | null {
  if (!href) return null;

  const trimmed = href.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("spell:")) {
    const value = trimmed.slice("spell:".length).trim();
    return /^\d+$/.test(value) ? value : null;
  }

  try {
    const url = new URL(trimmed, "https://local.invalid");
    const spell = url.searchParams.get("spell");
    if (spell && /^\d+$/.test(spell)) return spell;

    const parts = url.pathname.split("/").filter(Boolean);
    const idxSpell = parts.findIndex((p) => p === "spell" || p === "spells");
    const candidate = idxSpell >= 0 ? parts[idxSpell + 1] : null;
    return candidate && /^\d+$/.test(candidate) ? candidate : null;
  } catch {
    const withoutHash = trimmed.split("#")[0];
    const withoutQuery = withoutHash.split("?")[0];
    const parts = withoutQuery.split("/").filter(Boolean);
    const idxSpell = parts.findIndex((p) => p === "spell" || p === "spells");
    const candidate = idxSpell >= 0 ? parts[idxSpell + 1] : null;
    return candidate && /^\d+$/.test(candidate) ? candidate : null;
  }
}

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
    ])
  ),
  attributes: {
    ...(defaultSchema.attributes ?? {}),
    a: ["href", "title", "target", "rel"],
  },
} as const;

export function FormattedDescription({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const dispatchLocationChangeAsync = () => {
    if (typeof window === "undefined") return;
    const fire = () => window.dispatchEvent(new Event("locationchange"));
    if (typeof queueMicrotask === "function") queueMicrotask(fire);
    else window.setTimeout(fire, 0);
  };

  const openSpell = (spellId: string) => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    url.searchParams.set("spell", spellId);
    window.history.pushState({}, "", url);
    window.dispatchEvent(new CustomEvent("spell:open", { detail: { spellId } }));
    dispatchLocationChangeAsync();
  };

  return (
    <div className={clsx("whitespace-pre-line", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeRaw], [rehypeSanitize, sanitizeSchema]]}
        components={{
          strong: ({ children }) => <span className="font-semibold text-teal-400">{children}</span>,
          a: ({ href, children }) => {
            const spellId = extractSpellIdFromHref(href);

            if (!spellId) {
              return (
                <a
                  href={href}
                  className="text-teal-400 underline underline-offset-2 hover:text-teal-300"
                  target={href?.startsWith("http") ? "_blank" : undefined}
                  rel={href?.startsWith("http") ? "noreferrer" : undefined}
                >
                  {children}
                </a>
              );
            }

            return (
              <a
                href={href}
                className="text-teal-400 underline underline-offset-2 hover:text-teal-300"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  openSpell(String(spellId));
                }}
              >
                {children}
              </a>
            );
          },
          p: ({ children }) => <div className="mb-3 text-sm leading-relaxed text-inherit last:mb-0 break-words max-w-full whitespace-pre-line">{children}</div>,
          ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-inherit break-words max-w-full">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-inherit break-words max-w-full">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed break-words">{children}</li>,
          table: ({ children }) => (
             <div className="mb-3 w-full overflow-x-hidden">
               <table className="w-full table-fixed border-collapse text-sm">{children}</table>
             </div>
           ),
          thead: ({ children }) => <thead className="bg-slate-950/40">{children}</thead>,
          tr: ({ children }) => <tr className="border-b border-slate-600/60">{children}</tr>,
          th: ({ children }) => (
            <th className="border border-slate-600 px-2 py-2 text-left font-semibold text-inherit break-words whitespace-normal align-top">{children}</th>
          ),
          td: ({ children }) => <td className="border border-slate-600 px-2 py-2 text-inherit break-words whitespace-normal align-top">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
