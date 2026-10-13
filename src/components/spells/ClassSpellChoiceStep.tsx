"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { useSpellRatingContextStore } from "@/lib/stores/spellRatingContextStore";
import { RpgbotRecommendationToggle } from "@/components/spells/RpgbotRecommendationToggle";
import { SpellChoiceGrid, type SpellPickTracking } from "@/components/spells/SpellChoiceGrid";
import { readRpgbotRecommendationsPreference, useRpgbotRecommendationsPreference } from "@/hooks/useRpgbotRecommendationsPreference";
import { captureRpgbotEvent, type SpellPickSection } from "@/lib/monitoring/rpgbot-analytics";
import { useSpellRatingFinder } from "@/hooks/useSpellRatingFinder";
import { hasRatingList } from "@/lib/optimization/spell-rating-casters";
import type { SpellRatingMatch } from "@/lib/optimization/spell-rating-lookup";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { findPreparableSpells, keepOfferedSpells } from "@/rules/class-spell-offer-selection";
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
import type { UkrainianWordForms } from "@/lib/ukrainian-plural";
import { useNextStepHint } from "@/lib/components/wizard/next-step-hint";
import { buildPickHint, CANTRIP_FORMS, findFirstHint, SPELL_FORMS } from "@/lib/components/wizard/pick-hint";

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
  const selectionHint = findSelectionHint(selection, offer);
  const isComplete = selectionHint === null;
  useNextStepHint(selectionHint);
  const preparable = findPreparableSpells(offer, selection);
  const usesBook = offer.quota.spellbook > 0 || offer.bookSpells.length > 0;
  const is2014 = offer.ruleset === "RULES_2014";
  const canTakeOutsideSchools = buildSchoolGate(offer, selection);
  const ratings = useRpgbotRatings(offer);

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

      {ratings.isAvailable && <RpgbotRecommendationToggle isOn={ratings.isOn} onChange={ratings.toggle} />}

      {limits.cantrips.max > 0 && (
        <SpellChoiceSection title="Замовляння" chosen={selection.cantripIds.length} limit={limits.cantrips} catchUp={offer.catchUp.cantrips}>
          <SpellChoiceGrid
            spells={offer.cantrips}
            selectedIds={selection.cantripIds}
            limit={limits.cantrips.max}
            onChange={(cantripIds) => updateSelection({ cantripIds })}
            findGroupLabel={findLevelLabel}
            highestLevelFirst={highestLevelFirst}
            findRatingMatches={ratings.findMatches}
            pickTracking={ratings.trackPicks("cantrip")}
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
            findRatingMatches={ratings.findMatches}
            pickTracking={ratings.trackPicks("spellbook")}
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
              findRatingMatches={ratings.findMatches}
              pickTracking={ratings.trackPicks("prepared")}
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
          findRatingMatches={ratings.findMatches}
          pickTracking={ratings.trackPicks("cantrip_swap")}
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
          findRatingMatches={ratings.findMatches}
          pickTracking={ratings.trackPicks("prepared_swap")}
        />
      )}
    </div>
  );
}

function useRpgbotRatings(offer: ClassSpellOffer) {
  const casters = useMemo(() => [{ className: offer.className, subclassName: offer.subclassName }], [offer.className, offer.subclassName]);
  const isAvailable = offer.ruleset === "RULES_2014" && hasRatingList(casters);
  const [isOn, setIsOn] = useRpgbotRecommendationsPreference();
  useEffect(() => {
    if (isAvailable) reportSpellPickerViewOnce(offer.className);
  }, [isAvailable, offer.className]);
  const toggle = (enabled: boolean) => {
    setIsOn(enabled);
    captureRpgbotEvent("rpgbot_spell_recommendations_toggled", { enabled, class_key: offer.className });
  };
  const trackPicks = (section: SpellPickSection): SpellPickTracking | undefined =>
    isAvailable ? { section, class_key: offer.className, recommendations_on: isOn } : undefined;
  const findForEnglishName = useSpellRatingFinder(casters, isAvailable && isOn);
  const setModalCasters = useSpellRatingContextStore((state) => state.setCasters);
  useEffect(() => {
    if (!isAvailable || !isOn) return;
    setModalCasters(casters);
    return () => setModalCasters([]);
  }, [isAvailable, isOn, casters, setModalCasters]);
  const findMatches = useMemo(
    () => (findForEnglishName ? (spell: SpellChoiceOption) => findForEnglishName(spell.engName) : undefined),
    [findForEnglishName],
  );
  return { isAvailable, isOn, toggle, findMatches, trackPicks };
}

// Per page and class for the tab's lifetime: going back and forth between wizard steps remounts this step.
const viewedSpellPickers = new Set<string>();

function reportSpellPickerViewOnce(classKey: string) {
  const key = `${window.location.pathname}|${classKey}`;
  if (viewedSpellPickers.has(key)) return;
  viewedSpellPickers.add(key);
  captureRpgbotEvent("rpgbot_surface_viewed", { surface: "spell_picker", class_key: classKey, recommendations_on: readRpgbotRecommendationsPreference() });
}

function SpellSwapSection(props: {
  title: string;
  droppable: SpellChoiceOption[];
  candidates: SpellChoiceOption[];
  swap: SpellSwap | null | undefined;
  onChange: (swap: SpellSwap | null) => void;
  isSelectable?: (spell: SpellChoiceOption) => boolean;
  highestLevelFirst?: boolean;
  findRatingMatches?: (spell: SpellChoiceOption) => SpellRatingMatch[];
  pickTracking?: SpellPickTracking;
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
        findRatingMatches={props.findRatingMatches}
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
            findRatingMatches={props.findRatingMatches}
            pickTracking={props.pickTracking}
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

function findSelectionHint(selection: ClassSpellSelection, offer: ClassSpellOffer): string | null {
  const limits = findSelectionLimits(offer.quota, offer.catchUp, offer.canSkipPrepared);
  const preparedSuffix = offer.ruleset === "RULES_2014" ? "" : "для підготовки";
  return findFirstHint([
    buildSpellCountHint(selection.cantripIds, limits.cantrips, CANTRIP_FORMS, ""),
    buildSpellCountHint(selection.spellbookIds, limits.spellbook, SPELL_FORMS, "для книги заклинань"),
    buildSpellCountHint(selection.preparedIds, limits.prepared, SPELL_FORMS, preparedSuffix),
    isSwapFinished(selection.cantripSwap) && isSwapFinished(selection.preparedSwap) ? null : "Завершіть заміну: оберіть, що стане на місце прибраного заклинання.",
    withFullStop(findSchoolLimitProblem({ limit: offer.schoolLimit, selection, candidates: offer.spells, droppable: offer.swap?.droppableSpells ?? [] })),
  ]);
}

function buildSpellCountHint(spellIds: readonly number[], limit: SpellCountLimit, forms: UkrainianWordForms, suffix: string): string | null {
  if (isSpellCountWithinLimit(spellIds, limit)) return null;
  if (new Set(spellIds).size !== spellIds.length) return "Одне заклинання обрано двічі — приберіть повтор.";
  return buildPickHint(spellIds.length, spellIds.length < limit.min ? limit.min : limit.max, forms, suffix);
}

function withFullStop(problem: string | null): string | null {
  return problem ? `${problem}.` : null;
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
  return `${offer.classLabel} обирає ${offer.spellListNote ?? "зі свого списку"} — ${parts.join(", ")}. Заклинання від раси й класових рис додаються самі.`;
}

function findLevelLabel(spell: SpellChoiceOption): string {
  return spell.level === 0 ? "Замовляння" : `${spell.level}-й рівень`;
}
