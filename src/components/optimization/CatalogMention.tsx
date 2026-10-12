"use client";

import { useState, type ReactNode } from "react";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { CatalogCardContent } from "./CatalogCardContent";

export function CatalogMention({ href, title, children }: { href: string | null; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  if (!href) return <>{children}</>;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="underline decoration-white/30 underline-offset-4 hover:decoration-arcane-300 focus-visible:outline-arcane-300">{children}</DialogTrigger>
      {open ? <CatalogCardContent href={href} title={title} onClose={() => setOpen(false)} fallback={<p role="alert" className="py-4 text-sm text-slate-300">Не вдалося завантажити опис.</p>} /> : null}
    </Dialog>
  );
}
