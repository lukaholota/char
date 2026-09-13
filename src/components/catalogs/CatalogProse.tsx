"use client";

import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { cn } from "@/lib/utils";

export function CatalogProse({ content, className }: { content: string | null; className?: string }) {
  if (!content) return null;

  return (
    <div data-catalog-prose className={cn("text-sm leading-relaxed text-slate-300", className)}>
      <FormattedDescription content={content} className="space-y-2" />
    </div>
  );
}
