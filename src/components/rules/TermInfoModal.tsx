"use client";

import { useEffect, useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { ModeLink } from "@/components/no-ai/ModeLink";
import { findTermCard } from "@/lib/term-catalog-chunk";
import { listDictionaryFormsUnlikeTerm, type TermCard } from "@/lib/term-card";
import {
  closeTermLink,
  findTermLinkInSearch,
  isSameTermLink,
  TERM_OPEN_EVENT,
  type TermLink,
} from "@/lib/term-link";
import type { Ruleset } from "@prisma/client";

/// Модалка терміна за маркером `термін{{Original}}` (KR30.3) — той самий механізм, що й у
/// заклинань (KR25.1): адреса несе `?term=Insight`, дані приїжджають окремим чанком, кнопка
/// «назад» закриває. Стан і стаття довідника йдуть одразу під заголовком; словникова форма —
/// лише коли статті немає й вона відрізняється від натиснутого слова (у 97 % випадків вона
/// повторювала заголовок, виміряно 2026-09-18); далі інші написання й запис каталогу.
export function TermInfoModal() {
  const [termLink, setTermLink] = useState<TermLink | null>(() => findTermLinkInLocation());
  const [clickedTerm, setClickedTerm] = useState("");
  const [card, setCard] = useState<TermCard | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const syncFromUrl = () => applyTermLink(findTermLinkInLocation());
    const onTermOpen = (event: Event) => {
      const detail = (event as CustomEvent).detail as TermOpenDetail | undefined;
      if (typeof detail?.original !== "string" || detail.original === "") return;
      setClickedTerm(typeof detail.term === "string" ? detail.term : "");
      applyTermLink({ original: detail.original, ruleset: findRulesetInDetail(detail) });
    };

    window.addEventListener("popstate", syncFromUrl);
    window.addEventListener("locationchange", syncFromUrl);
    window.addEventListener(TERM_OPEN_EVENT, onTermOpen);
    return () => {
      window.removeEventListener("popstate", syncFromUrl);
      window.removeEventListener("locationchange", syncFromUrl);
      window.removeEventListener(TERM_OPEN_EVENT, onTermOpen);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!termLink) {
      setCard(null);
      setLoading(false);
      return;
    }

    setCard(null);
    setLoading(true);
    void findTermCard(termLink).then((next) => {
      if (cancelled) return;
      setCard(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [termLink]);

  const applyTermLink = (next: TermLink | null) =>
    setTermLink((prev) => (isSameTermLink(prev, next) ? prev : next));

  const onClose = () => {
    setTermLink(null);
    setClickedTerm("");
    closeTermLink();
  };

  const title = clickedTerm || card?.dictionary[0]?.term || card?.condition?.name || termLink?.original || "Термін";
  const dictionaryForms = card ? listDictionaryFormsUnlikeTerm(card, title) : [];
  const hasNothing = card !== null && dictionaryForms.length === 0 && !card.article && !card.condition && !card.catalog;

  return (
    <Dialog
      open={Boolean(termLink)}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-2xl overflow-y-auto p-0 bg-gradient-to-b from-slate-950/18 to-slate-950/12">
        <div className="min-w-0 px-4 py-5 sm:p-6">
          <DialogTitle className="min-w-0 bg-gradient-to-r from-arcane-400 to-violet-400 bg-clip-text font-sans text-lg font-semibold uppercase tracking-wider text-transparent sm:text-xl">
            {title}
          </DialogTitle>
          <div className="mt-1 font-mono text-sm text-arcane-200">{termLink?.original}</div>

          {loading && (
            <div className="glass-panel mt-4 rounded-lg border border-slate-700/50 p-3 sm:p-4">
              <div className="animate-pulse space-y-3">
                <div className="h-4 w-2/3 rounded bg-slate-700/40" />
                <div className="h-4 w-full rounded bg-slate-700/30" />
              </div>
            </div>
          )}

          {card?.condition && (
            <TermSection label={`Стан · довідник ${labelForRuleset(card.condition.ruleset)}`}>
              <div className="text-sm font-medium text-slate-200">{card.condition.name}</div>
              <FormattedDescription content={card.condition.description} className="mt-1 text-sm text-slate-300" />
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                {card.condition.bulletPoints.map((point) => (
                  <li key={point}>
                    <FormattedDescription content={point} />
                  </li>
                ))}
              </ul>
              <TermSectionLink href={card.condition.href}>Відкрити в довіднику</TermSectionLink>
            </TermSection>
          )}

          {card?.article && (
            <TermSection label={`Довідник ${labelForRuleset(card.article.ruleset)}`}>
              <div className="text-sm font-medium text-slate-200">
                {card.article.title}
                {card.article.subsection ? ` · ${card.article.subsection.title}` : ""}
              </div>
              <FormattedDescription
                content={card.article.subsection?.content ?? card.article.summary}
                className="mt-1 text-sm leading-relaxed text-slate-300 break-words"
              />
              <TermSectionLink href={card.article.href}>Відкрити статтю</TermSectionLink>
            </TermSection>
          )}

          {card?.otherEdition && (
            <TermSection label={`Довідник ${labelForRuleset(card.ruleset)}`}>
              <p className="text-sm text-slate-300">
                Статті {labelForRuleset(card.ruleset)} про це немає. У довіднику{" "}
                {labelForRuleset(card.otherEdition.ruleset)} є, але правило там може відрізнятися.
              </p>
              <TermSectionLink href={card.otherEdition.href}>
                Відкрити статтю {labelForRuleset(card.otherEdition.ruleset)}
              </TermSectionLink>
            </TermSection>
          )}

          {dictionaryForms.length > 0 && (
            <TermSection label="У словнику">
              <div className="text-sm text-slate-200">{dictionaryForms.join(", ")}</div>
            </TermSection>
          )}

          {card && card.aliases.length > 0 && (
            <TermSection label="Інші написання, за якими це шукають">
              <div className="text-sm text-slate-300">{card.aliases.join(", ")}</div>
            </TermSection>
          )}

          {card?.catalog && (
            <TermSection label="У каталозі">
              <TermSectionLink href={card.catalog.href}>{card.catalog.name}</TermSectionLink>
            </TermSection>
          )}

          {hasNothing && (
            <p className="mt-4 text-sm text-slate-400">
              Окремої статті в довіднику про цей термін немає. Оригінал поруч — щоб звірити переклад із книгою.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

type TermOpenDetail = { original?: unknown; ruleset?: unknown; term?: unknown };

function findTermLinkInLocation(): TermLink | null {
  if (typeof window === "undefined") return null;
  return findTermLinkInSearch(window.location.search);
}

function findRulesetInDetail(detail: TermOpenDetail): Ruleset {
  return detail.ruleset === "RULES_2024" ? "RULES_2024" : "RULES_2014";
}

function labelForRuleset(ruleset: Ruleset): string {
  return ruleset === "RULES_2024" ? "2024" : "2014";
}

function TermSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="glass-panel mt-4 rounded-lg border border-slate-700/50 bg-slate-900/20 p-3 sm:p-4">
      <div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function TermSectionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <ModeLink href={href} className="mt-2 inline-block text-sm text-arcane-300 underline decoration-dotted hover:text-arcane-200">
      {children} →
    </ModeLink>
  );
}
