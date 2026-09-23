"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { SpellChoiceGrid } from "@/components/spells/SpellChoiceGrid";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import {
  EMPTY_CLASS_SPELL_SELECTION,
  findSelectionLimits,
  isSpellCountWithinLimit,
  type ClassSpellOffer,
  type ClassSpellSelection,
  type SpellCountLimit,
} from "@/rules/class-spell-choices-2024";
import { countOutsideSchools, describeSchoolLimit2014, findSchoolLimitProblem, isOutsideSchools } from "@/rules/class-spell-choices-2014";
import { isSwapStarted, type SpellSwap } from "@/rules/class-spell-swaps-2024";
import type { SpellChoiceOption, SpellSchoolLimit } from "@/rules/spell-choice-filter";

interface Props {
  offer: ClassSpellOffer;
  onNextDisabledChange?: (disabled: boolean) => void;
  highestLevelFirst?: boolean;
}

/**
 * Замовляння, книга чарівника й підготовлені (у 2014 — відомі), які клас дає обрати: конструктор 2024 (Р43)
 * і майстер підвищення обох редакцій. Обовʼязкова квота — мінімум, доганяння таблиці 2014 — понад нього.
 */
export function ClassSpellChoiceStep({ offer, onNextDisabledChange, highestLevelFirst = false }: Props) {
  const { formData, updateFormData } = usePersFormStore();
  const limits = findSelectionLimits(offer.quota, offer.catchUp, offer.canSkipPrepared);
  const selection = useMemo(() => keepOfferedSpells(formData.classSpells ?? EMPTY_CLASS_SPELL_SELECTION, offer), [formData.classSpells, offer]);
  const isComplete = isSelectionComplete(selection, offer);
  const preparable = findPreparableSpells(offer, selection);
  const usesBook = offer.quota.spellbook > 0 || offer.bookSpells.length > 0;
  const is2014 = offer.ruleset === "RULES_2014";
  const canTakeOutsideSchools = buildSchoolGate(offer, selection);

  useEffect(() => {
    onNextDisabledChange?.(!isComplete);
  }, [isComplete, onNextDisabledChange]);

  const updateSelection = (patch: Partial<ClassSpellSelection>) => {
    const next = { ...selection, ...patch };
    updateFormData({ classSpells: keepOfferedSpells(next, offer) });
  };

  return (
    <div className="space-y-6">
      <p className="text-center text-sm text-slate-400">{describeQuota(offer)}</p>

      {limits.cantrips.max > 0 && (
        <SpellChoiceSection title="Замовляння" chosen={selection.cantripIds.length} limit={limits.cantrips} catchUp={offer.catchUp.cantrips}>
          <SpellChoiceGrid
            spells={offer.cantrips}
            selectedIds={selection.cantripIds}
            limit={limits.cantrips.max}
            onChange={(cantripIds) => updateSelection({ cantripIds })}
            findGroupLabel={findLevelLabel}
            highestLevelFirst={highestLevelFirst}
          />
        </SpellChoiceSection>
      )}

      {limits.spellbook.max > 0 && (
        <SpellChoiceSection title="Книга заклинань" chosen={selection.spellbookIds.length} limit={limits.spellbook} catchUp={offer.catchUp.spellbook}>
          <SpellChoiceGrid
            spells={offer.spells}
            selectedIds={selection.spellbookIds}
            limit={limits.spellbook.max}
            onChange={(spellbookIds) => updateSelection({ spellbookIds })}
            findGroupLabel={findLevelLabel}
            highestLevelFirst={highestLevelFirst}
          />
        </SpellChoiceSection>
      )}

      {limits.prepared.max > 0 && (
        <SpellChoiceSection title={is2014 ? "Нові заклинання" : "Підготовлені заклинання"} chosen={selection.preparedIds.length} limit={limits.prepared} catchUp={offer.catchUp.prepared}>
          {offer.canSkipPrepared && (
            <p className="text-sm text-slate-400">
              Необовʼязково: {offer.classLabel.toLowerCase()} переставляє підготовлені після кожного тривалого відпочинку, тож можна доготувати їх на листі.
            </p>
          )}
          {offer.schoolLimit && <p className="text-sm text-slate-400">{describeSchoolLimit2014(offer.schoolLimit)}</p>}
          {usesBook && preparable.length === 0 ? (
            <p className="text-sm text-slate-400">Спершу оберіть заклинання до книги — готувати можна лише з неї.</p>
          ) : (
            <SpellChoiceGrid
              spells={preparable}
              selectedIds={selection.preparedIds}
              limit={limits.prepared.max}
              onChange={(preparedIds) => updateSelection({ preparedIds })}
              findGroupLabel={findLevelLabel}
              isSelectable={canTakeOutsideSchools}
              highestLevelFirst={highestLevelFirst}
            />
          )}
        </SpellChoiceSection>
      )}

      {offer.swap && offer.swap.droppableCantrips.length > 0 && (
        <SpellSwapSection
          title="Замінити замовляння"
          droppable={offer.swap.droppableCantrips}
          candidates={offer.cantrips.filter((spell) => !selection.cantripIds.includes(spell.spellId))}
          swap={selection.cantripSwap}
          onChange={(cantripSwap) => updateSelection({ cantripSwap })}
          highestLevelFirst={highestLevelFirst}
        />
      )}

      {offer.swap && offer.swap.droppableSpells.length > 0 && (
        <SpellSwapSection
          title={is2014 ? "Замінити відоме заклинання" : "Замінити підготовлене заклинання"}
          droppable={offer.swap.droppableSpells}
          candidates={offer.spells.filter((spell) => !selection.preparedIds.includes(spell.spellId))}
          swap={selection.preparedSwap}
          onChange={(preparedSwap) => updateSelection({ preparedSwap })}
          isSelectable={canTakeOutsideSchools}
          highestLevelFirst={highestLevelFirst}
        />
      )}
    </div>
  );
}

function SpellSwapSection(props: {
  title: string;
  droppable: SpellChoiceOption[];
  candidates: SpellChoiceOption[];
  swap: SpellSwap | null | undefined;
  onChange: (swap: SpellSwap | null) => void;
  isSelectable?: (spell: SpellChoiceOption) => boolean;
  highestLevelFirst?: boolean;
}) {
  const dropId = props.swap?.dropId ?? null;
  const addId = props.swap?.addId ?? null;
  const update = (next: SpellSwap) => props.onChange(isSwapStarted(next) ? next : null);

  return (
    <section aria-label={props.title} className="glass-card space-y-3 rounded-2xl border border-white/10 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-100">{props.title}</h3>
        <span className="text-sm text-slate-400">необовʼязково, одне</span>
      </div>
      <p className="text-sm text-slate-400">Що прибрати</p>
      <SpellChoiceGrid
        spells={props.droppable}
        selectedIds={dropId === null ? [] : [dropId]}
        limit={1}
        onChange={(ids) => update({ dropId: ids[0] ?? null, addId })}
        findGroupLabel={findLevelLabel}
        highestLevelFirst={props.highestLevelFirst}
      />
      {dropId !== null && (
        <>
          <p className="text-sm text-slate-400">Що взяти натомість</p>
          <SpellChoiceGrid
            spells={props.candidates}
            selectedIds={addId === null ? [] : [addId]}
            limit={1}
            onChange={(ids) => update({ dropId, addId: ids[0] ?? null })}
            findGroupLabel={findLevelLabel}
            isSelectable={props.isSelectable}
            highestLevelFirst={props.highestLevelFirst}
          />
        </>
      )}
    </section>
  );
}

function SpellChoiceSection(props: { title: string; chosen: number; limit: SpellCountLimit; catchUp: number; children: ReactNode }) {
  const required = props.limit.max - props.catchUp;
  return (
    <section aria-label={props.title} className="glass-card space-y-3 rounded-2xl border border-white/10 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-100">{props.title}</h3>
        <span className="text-sm text-slate-400">
          {props.chosen} з {props.limit.max}
        </span>
      </div>
      {props.catchUp > 0 && (
        <p className="text-sm text-slate-400">
          {required > 0 ? `Обовʼязково: ${required}. ` : ""}До таблиці бракує ще {props.catchUp} — можна додати зараз.
        </p>
      )}
      {props.children}
    </section>
  );
}

function keepOfferedSpells(selection: ClassSpellSelection, offer: ClassSpellOffer): ClassSpellSelection {
  const limits = findSelectionLimits(offer.quota, offer.catchUp, offer.canSkipPrepared);
  const cantrips = new Set(offer.cantrips.map((spell) => spell.spellId));
  const spells = new Set(offer.spells.map((spell) => spell.spellId));
  const spellbookIds = limits.spellbook.max ? selection.spellbookIds.filter((id) => spells.has(id)).slice(0, limits.spellbook.max) : [];
  const preparable = new Set(findPreparableSpells(offer, { ...selection, spellbookIds }).map((spell) => spell.spellId));

  return {
    cantripIds: selection.cantripIds.filter((id) => cantrips.has(id)).slice(0, limits.cantrips.max),
    spellbookIds,
    preparedIds: selection.preparedIds.filter((id) => preparable.has(id)).slice(0, limits.prepared.max),
    ...withSwap("cantripSwap", keepOfferedSwap(selection.cantripSwap, offer.swap?.droppableCantrips ?? [], cantrips)),
    ...withSwap("preparedSwap", keepOfferedSwap(selection.preparedSwap, offer.swap?.droppableSpells ?? [], spells)),
  };
}

function withSwap(key: "cantripSwap" | "preparedSwap", swap: SpellSwap | null): Partial<ClassSpellSelection> {
  return swap ? { [key]: swap } : {};
}

function keepOfferedSwap(swap: SpellSwap | null | undefined, droppable: SpellChoiceOption[], candidateIds: Set<number>): SpellSwap | null {
  if (!isSwapStarted(swap)) return null;
  const dropId = droppable.some((spell) => spell.spellId === swap.dropId) ? swap.dropId : null;
  const addId = dropId !== null && swap.addId !== null && candidateIds.has(swap.addId) ? swap.addId : null;
  return dropId === null ? null : { dropId, addId };
}

function isSelectionComplete(selection: ClassSpellSelection, offer: ClassSpellOffer): boolean {
  const limits = findSelectionLimits(offer.quota, offer.catchUp, offer.canSkipPrepared);
  return (
    isSpellCountWithinLimit(selection.cantripIds, limits.cantrips) &&
    isSpellCountWithinLimit(selection.spellbookIds, limits.spellbook) &&
    isSpellCountWithinLimit(selection.preparedIds, limits.prepared) &&
    isSwapFinished(selection.cantripSwap) &&
    isSwapFinished(selection.preparedSwap) &&
    findSchoolLimitProblem({ limit: offer.schoolLimit, selection, candidates: offer.spells, droppable: offer.swap?.droppableSpells ?? [] }) === null
  );
}

/** Заклинання поза школами підкласу можна брати, доки їх у виборі менше, ніж дозволено; свої школи — завжди. */
function buildSchoolGate(offer: ClassSpellOffer, selection: ClassSpellSelection): ((spell: SpellChoiceOption) => boolean) | undefined {
  const limit: SpellSchoolLimit | null | undefined = offer.schoolLimit;
  if (!limit) return undefined;
  const outsideTaken = countOutsideSchools(limit, selection, offer.spells, offer.swap?.droppableSpells ?? []);
  return (spell) => !isOutsideSchools(limit.schools, spell.school) || outsideTaken < limit.outsideAllowed;
}

function isSwapFinished(swap: SpellSwap | null | undefined): boolean {
  return !isSwapStarted(swap) || (swap.dropId !== null && swap.addId !== null);
}

function findPreparableSpells(offer: ClassSpellOffer, selection: ClassSpellSelection): SpellChoiceOption[] {
  if (offer.quota.spellbook === 0 && offer.bookSpells.length === 0) return offer.spells;
  const book = new Set(selection.spellbookIds);
  const bookOnly = new Set(offer.bookOnlySpellIds);
  return [...offer.bookSpells, ...offer.spells.filter((spell) => book.has(spell.spellId) && !bookOnly.has(spell.spellId))];
}

function describeQuota(offer: ClassSpellOffer): string {
  const newSpellsLabel = offer.ruleset === "RULES_2014" ? "нових заклинань" : "підготовлених";
  const parts = [
    offer.quota.cantrips > 0 ? `замовлянь: ${offer.quota.cantrips}` : null,
    offer.quota.spellbook > 0 ? `до книги: ${offer.quota.spellbook}` : null,
    offer.quota.prepared > 0 ? `${newSpellsLabel}: ${offer.quota.prepared}` : null,
  ].filter(Boolean);
  const hasCatchUp = offer.catchUp.cantrips + offer.catchUp.prepared + offer.catchUp.spellbook > 0;
  if (parts.length === 0 && hasCatchUp) return `${offer.classLabel}: обовʼязкових нових заклинань на цьому рівні немає, але до таблиці класу можна додати.`;
  if (parts.length === 0) return `${offer.classLabel}: нових заклинань на цьому рівні немає, але одне можна замінити.`;
  return `${offer.classLabel} обирає ${offer.spellListNote ?? "зі свого списку"} — ${parts.join(", ")}. Заклинання від виду й класових рис додаються самі.`;
}

function findLevelLabel(spell: SpellChoiceOption): string {
  return spell.level === 0 ? "Замовляння" : `${spell.level}-й рівень`;
}
