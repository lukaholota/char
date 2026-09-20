"use client";

import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { BastionFacilityDetailCard } from "@/components/bastions/BastionFacilityDetailCard";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { BastionFacilityData } from "@/lib/bastion-facility";
import { fetchBastionFacility } from "@/lib/catalog-reads";

/// Опис приміщення живе в каталозі на сервері (гейт KR20.6): картка тягне його лише на відкриття.
export function BastionFacilityDetailDialog({ slug, name }: { slug: string; name: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group inline-flex min-w-0 items-center gap-1.5 text-left text-base font-semibold text-slate-100 hover:text-white"
          aria-label={`Що дає: ${name}`}
        >
          <span className="underline decoration-white/20 underline-offset-4 group-hover:decoration-white/60">{name}</span>
          <BookOpen className="h-3.5 w-3.5 shrink-0 text-slate-500 group-hover:text-emerald-300" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-3xl overflow-y-auto border-0 bg-transparent p-0 pt-10 shadow-none backdrop-blur-none sm:pt-0">
        <DialogTitle className="sr-only">{name}</DialogTitle>
        {isOpen ? <BastionFacilityDetailBody slug={slug} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function BastionFacilityDetailBody({ slug }: { slug: string }) {
  const [facility, setFacility] = useState<BastionFacilityData | null | undefined>(undefined);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    let isStale = false;
    fetchBastionFacility(slug)
      .then((loaded) => {
        if (!isStale) setFacility(loaded);
      })
      .catch(() => {
        if (!isStale) setHasFailed(true);
      });

    return () => {
      isStale = true;
    };
  }, [slug]);

  if (hasFailed) return <DetailPlaceholder text="Не вдалося завантажити опис приміщення" />;
  if (facility === undefined) return <DetailPlaceholder text="Завантаження опису…" />;
  if (facility === null) return <DetailPlaceholder text="Приміщення більше немає в каталозі" />;

  return <BastionFacilityDetailCard facility={facility} />;
}

function DetailPlaceholder({ text }: { text: string }) {
  return <p className="glass-card rounded-2xl border border-white/10 bg-slate-950/80 p-6 text-sm text-slate-300">{text}</p>;
}
