"use client";

import type { ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { findAccentVariant } from "@/styles/edition-accent";

export type ReadingSection<T extends string> = { value: T; label: string; content: ReactNode };

export function ReadingSectionTabs<T extends string>({
  label,
  sections,
  value,
  onValueChange,
  is2024,
}: {
  label: string;
  sections: readonly ReadingSection<T>[];
  value: T;
  onValueChange: (value: T) => void;
  is2024: boolean;
}) {
  return (
    <Tabs value={value} onValueChange={(next) => onValueChange(next as T)} className="mt-4">
      <TabsList aria-label={label} className="h-auto flex-wrap justify-start gap-1.5 bg-transparent p-0">
        {sections.map((section) => (
          <TabsTrigger
            key={section.value}
            value={section.value}
            className={cn(
              "min-h-10 rounded-lg border border-white/10 bg-slate-900/40 px-3 text-xs font-medium text-slate-400 data-[state=active]:bg-white/[0.06] data-[state=active]:shadow-none",
              findAccentVariant(is2024, {
                prism: "data-[state=active]:border-prism-500/40 data-[state=active]:text-prism-200",
                arcane: "data-[state=active]:border-arcane-500/40 data-[state=active]:text-arcane-200",
              }),
            )}
          >
            {section.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {sections.map((section) => (
        <TabsContent key={section.value} value={section.value} className="mt-4">
          {section.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
