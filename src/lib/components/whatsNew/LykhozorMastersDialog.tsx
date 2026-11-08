"use client";

import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { LYKHOZOR_CAREERS_URL, LYKHOZOR_LOGO_SRC } from "@/lib/whats-new/release-notes";

const MASTER_FORMATS = [
  {
    title: "Офлайн у Києві, на вихідних",
    details: [
      "Метро Університет. Водите D&D 5e (2014) принаймні рік, українською, і готові відкривати гру новачкам.",
      "Графік партій на вибір, безкоштовна підтримка юриста, бонуси й щорічна індексація виплат, майстер-класи.",
    ],
  },
  {
    title: "Онлайн",
    details: ["Про-акаунт у Roll20 від клубу й графік партій на вибір."],
  },
] as const;

export function LykhozorMastersDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog open={isOpen} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent
        className="max-h-[88svh] max-w-md gap-5 overflow-y-auto border-lykhozor-rust/40 bg-lykhozor-parchment bg-none p-5 text-lykhozor-moss backdrop-blur-none sm:p-7"
        closeLabel="Закрити"
      >
        <img
          src={LYKHOZOR_LOGO_SRC}
          alt="Дід Лихозор, київський клуб D&D"
          width={256}
          height={62}
          className="mx-auto mt-3 h-auto w-60 sm:w-64"
        />

        <DialogTitle className="text-center text-2xl font-normal leading-tight tracking-[0.14em] text-lykhozor-rust sm:text-3xl">
          Шукаємо майстрів
        </DialogTitle>

        <DialogDescription
          asChild
          className="border-y border-lykhozor-rust/30 py-3 text-center text-base italic leading-relaxed text-lykhozor-moss"
        >
          <blockquote>«Всі матеріали для майстра вже є — мініатюри, цифровий стіл, анімовані карти, терейн.»</blockquote>
        </DialogDescription>

        <div className="space-y-4">
          {MASTER_FORMATS.map((format) => (
            <section key={format.title} className="space-y-1">
              <h3 className="font-rpg-display text-lg text-lykhozor-rust">{format.title}</h3>
              {format.details.map((detail) => (
                <p key={detail} className="text-sm leading-relaxed">
                  {detail}
                </p>
              ))}
            </section>
          ))}
        </div>

        <Button asChild className="w-full bg-lykhozor-moss text-lykhozor-parchment hover:bg-lykhozor-moss/90">
          <a href={LYKHOZOR_CAREERS_URL} target="_blank" rel="noreferrer" onClick={onClose}>
            Умови й заявка
            <ExternalLink aria-hidden className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
