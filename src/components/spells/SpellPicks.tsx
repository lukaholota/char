"use client";

import { useState } from "react";
import { Lock, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SpellChoiceCard, SpellChoiceGrid, type SpellPickTracking } from "@/components/spells/SpellChoiceGrid";
import type { SpellRatingMatch } from "@/lib/optimization/spell-rating-lookup";
import { cn } from "@/lib/utils";
import type { SpellChoiceOption } from "@/rules/spell-choice-filter";
import { findAccentVariant } from "@/styles/edition-accent";

const BOTTOM_SHEET =
  "top-auto bottom-0 left-0 flex max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-b-none border-x-0 border-b-0 bg-slate-950/95 p-0 pb-[env(safe-area-inset-bottom)] h-[88dvh] sm:bottom-auto sm:left-[50%] sm:top-[50%] sm:h-[80vh] sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl sm:border";

interface Props {
  title: string;
  spells: readonly SpellChoiceOption[];
  selectedIds: readonly number[];
  limit: number;
  onChange: (spellIds: number[]) => void;
  findGroupLabel: (spell: SpellChoiceOption) => string;
  grantedSpells?: readonly SpellChoiceOption[];
  /** Межа шкіл підкласу залежить від решти вибору: при заміні замінюване не рахується. */
  findSelectableGate?: (keptIds: number[]) => ((spell: SpellChoiceOption) => boolean) | undefined;
  highestLevelFirst?: boolean;
  findRatingMatches?: (spell: SpellChoiceOption) => SpellRatingMatch[];
  pickTracking?: SpellPickTracking;
}

type Sheet = { replacedId: number | null };

/** Обране — картками каталогу, нове — в аркуші зі списком. Тап по обраному одразу відкриває заміну. */
export function SpellPicks(props: Props) {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const chosen = sortForDisplay(props.spells.filter((spell) => props.selectedIds.includes(spell.spellId)), props.highestLevelFirst);
  const is2024 = props.spells[0]?.ruleset === "RULES_2024";
  const remaining = props.limit - props.selectedIds.length;
  const findRatingMatches = (spell: SpellChoiceOption) => props.findRatingMatches?.(spell) ?? [];

  return (
    <>
      <div className="grid gap-2">
        {props.grantedSpells?.map((spell) => (
          <SpellChoiceCard key={spell.spellId} spell={spell} ratingMatches={findRatingMatches(spell)} note={<GrantedNote />} />
        ))}
        {chosen.map((spell) => (
          <SpellChoiceCard
            key={spell.spellId}
            spell={spell}
            ratingMatches={findRatingMatches(spell)}
            onPress={() => setSheet({ replacedId: spell.spellId })}
            pressLabel={`${spell.name}: замінити або прибрати`}
          />
        ))}
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => setSheet({ replacedId: null })}
            aria-label={`Додати: ${props.title}`}
            className={cn(
              "flex min-h-12 items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-2 text-sm font-semibold transition-colors",
              findAccentVariant(is2024, {
                prism: "border-prism-400/50 bg-prism-500/10 text-prism-200 hover:bg-prism-500/15",
                arcane: "border-arcane-400/50 bg-arcane-500/10 text-arcane-200 hover:bg-arcane-500/15",
              }),
            )}
          >
            <Plus className="h-4 w-4" aria-hidden />
            <span>
              Додати
              {chosen.length > 0 && <span className="ml-1 font-normal opacity-80">ще {remaining}</span>}
            </span>
          </button>
        )}
      </div>
      {sheet && <SpellPickSheet {...props} replacedId={sheet.replacedId} onClose={() => setSheet(null)} />}
    </>
  );
}

function SpellPickSheet(props: Props & { replacedId: number | null; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const replaced = props.replacedId === null ? null : props.spells.find((spell) => spell.spellId === props.replacedId) ?? null;
  const keptIds = props.selectedIds.filter((id) => id !== props.replacedId);
  const candidates = replaced ? props.spells.filter((spell) => !props.selectedIds.includes(spell.spellId)) : props.spells;
  const shown = filterByName(candidates, query);

  const replaceWith = (spellIds: number[]) => {
    const [addedId] = spellIds;
    if (addedId === undefined) return;
    props.onChange(props.selectedIds.map((id) => (id === props.replacedId ? addedId : id)));
    props.onClose();
  };
  const remove = () => {
    props.onChange(keptIds);
    props.onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && props.onClose()}>
      {/* data-safe-dialog у globals.css центрує через top/left і перебиває притискання аркуша до низу */}
      <DialogContent className={BOTTOM_SHEET} data-safe-dialog={undefined} onOpenAutoFocus={(event) => event.preventDefault()}>
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/20 sm:hidden" aria-hidden />
        <div className="shrink-0 space-y-3 border-b border-white/10 px-4 pb-3 pt-3">
          <DialogTitle className="pr-10 text-left text-lg normal-case tracking-normal">{replaced ? `Замінити «${replaced.name}»` : props.title}</DialogTitle>
          <DialogDescription className="sr-only">
            {replaced ? "Оберіть заклинання, яке стане на його місце, або приберіть його." : "Натисніть на заклинання, щоб обрати або зняти його."}
          </DialogDescription>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Пошук за назвою"
              aria-label="Пошук заклинання"
              autoComplete="off"
              className="h-10 border-white/10 bg-white/5 pl-9 text-base text-slate-100 placeholder:text-slate-400 focus-visible:ring-arcane-400/30 md:text-sm"
            />
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {shown.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">{query ? `Нічого не знайдено за «${query}»` : "Більше нічого обрати"}</p>
          ) : (
            <SpellChoiceGrid
              spells={shown}
              selectedIds={replaced ? [] : props.selectedIds}
              limit={replaced ? 1 : props.limit}
              onChange={replaced ? replaceWith : props.onChange}
              findGroupLabel={props.findGroupLabel}
              isSelectable={props.findSelectableGate?.(keptIds)}
              highestLevelFirst={props.highestLevelFirst}
              findRatingMatches={props.findRatingMatches}
              pickTracking={props.pickTracking}
            />
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3 border-t border-white/10 px-4 py-3">
          {replaced ? (
            <Button type="button" variant="outline" onClick={remove} className="w-full border-rose-400/40 text-rose-200 hover:bg-rose-500/10">
              <Trash2 className="h-4 w-4" aria-hidden />
              Прибрати «{replaced.name}»
            </Button>
          ) : (
            <>
              <span className="flex-1 text-sm text-slate-400 tabular-nums">
                {props.selectedIds.length} з {props.limit}
              </span>
              <Button type="button" onClick={props.onClose}>
                Готово
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GrantedNote() {
  return (
    <span className="flex items-center gap-1 text-xs text-slate-400">
      <Lock className="h-3 w-3 shrink-0" aria-hidden />
      від раси, поза лімітом
    </span>
  );
}

function filterByName(spells: readonly SpellChoiceOption[], query: string): readonly SpellChoiceOption[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return spells;
  return spells.filter((spell) => spell.name.toLowerCase().includes(needle) || spell.engName.toLowerCase().includes(needle));
}

function sortForDisplay(spells: SpellChoiceOption[], highestLevelFirst = false): SpellChoiceOption[] {
  const rank = (level: number) => (level === 0 ? -1000 : highestLevelFirst ? -level : level);
  return [...spells].sort((a, b) => rank(a.level) - rank(b.level));
}
