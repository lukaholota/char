"use client";

import dynamic from "next/dynamic";

/** Редактор — ~0,5 МБ tiptap/prosemirror; листу він потрібен лише тоді, коли хтось редагує опис. */
export const LazyRichTextEditor = dynamic(() => import("./RichTextEditor").then((module) => module.RichTextEditor), {
  ssr: false,
  loading: () => <div className="min-h-[45dvh] animate-pulse rounded-md border border-white/10 bg-white/5 sm:min-h-72" />,
});
