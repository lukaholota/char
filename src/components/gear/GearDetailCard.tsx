"use client";

import { ModeLink as Link } from "@/components/no-ai/ModeLink";

import { CatalogProse } from "@/components/catalogs/CatalogProse";
import { cn } from "@/lib/utils";
import { findAccentVariant } from "@/styles/edition-accent";
import type { GearItem } from "@/rules/adventuring-gear";

export function GearDetailCard({ item, is2024 }: { item: GearItem; is2024: boolean }) {
  const facts = [item.price && `Ціна: ${item.price}`, item.weight && `Вага: ${item.weight}`, item.group].filter(Boolean);

  return (
    <article className="glass-card max-w-full overflow-hidden break-words rounded-2xl border border-white/10 bg-slate-950/60 p-4 backdrop-blur-xl sm:p-6">
      <h1
        className={cn(
          "bg-clip-text font-rpg-display text-xl font-bold uppercase tracking-wider text-transparent sm:text-2xl",
          findAccentVariant(is2024, { prism: "bg-gradient-to-r from-prism-300 via-prism-200 to-prism-500", arcane: "bg-gradient-to-r from-arcane-300 via-arcane-100 to-violet-300" }),
        )}
      >
        {item.name}
      </h1>
      {facts.length > 0 && <p className="mt-2 text-sm text-slate-300">{facts.join(" · ")}</p>}
      <div className="mt-4 overflow-x-auto">
        {item.description ? <CatalogProse content={item.description} /> : <p className="text-sm text-slate-400">Окремих правил у цієї речі немає.</p>}
      </div>
      <Link
        href={`${is2024 ? "/2024" : ""}/rules/equipment#adventuring-gear`}
        className="mt-4 inline-flex min-h-11 items-center text-sm text-slate-300 underline decoration-slate-500 underline-offset-4 hover:text-white"
      >
        Увесь розділ у правилах
      </Link>
    </article>
  );
}
