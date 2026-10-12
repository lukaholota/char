"use client";

import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import type { ReadyPresetPageData } from "@/lib/optimization/ready-preset.server";
import type { PresetSpellGroup, ReadyPresetSpellOptions } from "@/lib/optimization/ready-preset-spells";
import { isSpellChoiceCandidate, type SpellChoiceFilter } from "@/rules/spell-choice-filter";
import { buildFeatSpellFilter, type FeatSpellPickRule } from "@/rules/feat-spell-choices";
import { findCommonSpellLists2014, listFeatSpellFilters2014 } from "@/rules/feat-spells-2014";
import { buildFeatSpellsForList, listPresetPreparedPool } from "@/lib/optimization/ready-preset-spells";
import { PresetOptionPicker } from "./PresetOptionPicker";
import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import { PresetSpellPicker } from "./PresetSpellPicker";
import { BuildSource } from "./BuildSource";
import { findInitialListPreparedLimit, findInitialWizardPreparedLimit } from "@/rules/initial-prepared-spells-2014";
import { buildPresetAbilityScores } from "@/lib/optimization/ready-preset-abilities";

type SpellProps = { data: Pick<ReadyPresetPageData, "preset" | "recipe" | "options" | "draft">; draft: Partial<PersFormData>; update: (changes: Partial<PersFormData>) => void };
type SpellField = "cantripIds" | "preparedIds" | "spellbookIds" | "raceSpellIds" | "classOptionSpellIds" | "featSpellIds";
type SpellGroup = { id: PresetSpellGroup; field: SpellField; label: string; selected: number[]; filters: SpellChoiceFilter[] };

const LIST_PREPARATION_NOTE = "Цей клас готує заклинання зі свого списку. У конструкторі їх не обирають: підготовлені заклинання ви виберете на листі персонажа.";

export function ReadyPresetSpells({ data, draft, update, hidePreparedEditor = false }: SpellProps & { hidePreparedEditor?: boolean }) {
  const preset = data.preset.spells;
  if (!preset) return null;
  const options = data.options.spells;
  const groups = buildSpellGroups(options, draft);
  const taken = groups.flatMap((group) => group.selected);
  const platformGroups = preset.platformChoices ?? [];
  const hasListPreparation = options.preparation === "list" && preset.preparedSpellKeys.length === 0;
  const hasPreparedEditor = !hidePreparedEditor && (options.usesSpellbook || (options.preparation === "list" && !hasListPreparation));
  function chooseSpells(group: SpellGroup, ids: number[]) {
    if (group.field === "featSpellIds") update({ featSpellSelections: { ...draft.featSpellSelections, CLASS_ASI: ids } });
    else if (group.field === "raceSpellIds" || group.field === "classOptionSpellIds") update({ [group.field]: ids });
    else update({ classSpells: { ...draft.classSpells!, [group.field]: ids }, ...(group.field === "spellbookIds" ? { initialPreparedSpellIds: draft.initialPreparedSpellIds?.filter((id) => ids.includes(id)) } : {}) });
  }
  const defaults = buildSpellGroups(options, data.draft);
  return <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
    <h3 className="text-lg text-white">Заклинання</h3>
    <p className="mt-2 text-sm leading-relaxed text-slate-400">{preset.explanation}</p>
    {hasListPreparation ? <p className="mt-2 text-sm leading-relaxed text-slate-300">{LIST_PREPARATION_NOTE}</p> : null}
    <FeatSpellSummary data={data} draft={draft} update={update} taken={taken} />
    <div className="mt-4 space-y-8">{groups.filter((group) => defaults.find((entry) => entry.id === group.id)!.selected.length).map((group) => {
      const original = defaults.find((entry) => entry.id === group.id)!;
      const selectedSpells = options.candidates.filter((spell) => group.selected.includes(spell.spellId));
      const candidates = options.candidates.filter((spell) => group.filters.some((filter) => isSpellChoiceCandidate(filter, spell)) && (group.selected.includes(spell.spellId) || !taken.includes(spell.spellId)) && (group.id !== "featSpells" || !options.featChoice?.rule.sharedSpellLists || findCommonSpellLists2014(options.featChoice.rule, [...selectedSpells, spell]).length > 0));
      return <div key={group.id}><SpellGroupOrigin isPlatformChoice={platformGroups.includes(group.id)} /><PresetSpellPicker label={group.label} spells={candidates} selectedIds={group.selected}
        limit={original.selected.length} isSelectable={(spell) => selectedSpells.filter((entry) => entry.level === spell.level).length < options.candidates.filter((entry) => original.selected.includes(entry.spellId) && entry.level === spell.level).length} onChange={(ids) => chooseSpells(group, ids)} /></div>;
    })}</div>
    {hasPreparedEditor ? <PreparedSpellEditor data={data} draft={draft} update={update} isPlatformChoice={platformGroups.includes("preparedSpells")} /> : null}
    <BuildSource text="Стартові замовляння й заклинання автора." refs={[{ ...data.recipe.sourceRefs[0], sectionId: preset.sectionId }]} ruleset="RULES_2014" />
  </section>;
}

function buildSpellGroups(options: ReadyPresetSpellOptions, draft: Partial<PersFormData>): SpellGroup[] {
  const classFilters = (filter: SpellChoiceFilter | undefined) => filter ? [filter] : [];
  const pickFilters = (picks: FeatSpellPickRule[] | undefined) => (picks ?? []).map(buildFeatSpellFilter);
  return [
    { id: "classCantrips", field: "cantripIds", label: "Замовляння класу", selected: draft.classSpells?.cantripIds ?? [], filters: classFilters(options.filters?.cantrips) },
    { id: "knownSpells", field: "preparedIds", label: "Відомі заклинання", selected: draft.classSpells?.preparedIds ?? [], filters: classFilters(options.filters?.spells) },
    { id: "spellbook", field: "spellbookIds", label: "Заклинання книги", selected: draft.classSpells?.spellbookIds ?? [], filters: classFilters(options.filters?.spells) },
    { id: "raceSpells", field: "raceSpellIds", label: options.raceChoice?.label ?? "Расові заклинання", selected: draft.raceSpellIds ?? [], filters: pickFilters(options.raceChoice?.rule.picks) },
    { id: "classOptionSpells", field: "classOptionSpellIds", label: options.classOptionChoice?.label ?? "Заклинання підкласу", selected: draft.classOptionSpellIds ?? [], filters: pickFilters(options.classOptionChoice?.rule.picks) },
    { id: "featSpells", field: "featSpellIds", label: options.featChoice ? `Заклинання риси: ${options.featChoice.rule.label}` : "Заклинання риси", selected: draft.featSpellSelections?.CLASS_ASI ?? [], filters: options.featChoice ? listFeatSpellFilters2014(options.featChoice.rule) : [] },
  ];
}

function FeatSpellSummary({ data, draft, update, taken }: SpellProps & { taken: number[] }) {
  const choice = data.options.spells.featChoice;
  if (!choice) return null;
  const rule = choice.rule;
  const selected = data.options.spells.candidates.filter((spell) => draft.featSpellSelections?.CLASS_ASI?.includes(spell.spellId));
  const currentList = findCommonSpellLists2014(rule, selected)[0] ?? "";
  return <div className="mt-3 text-sm leading-relaxed text-slate-300">
    {choice.namedSpells.length ? <p>Риса «{rule.label}» додатково дає: {choice.namedSpells.map((spell) => spell.name).join(", ")}.</p> : null}
    {rule.sharedSpellLists ? <PresetOptionPicker label="Список класу для риси" selected={currentList} options={rule.sharedSpellLists.map((list) => ({ value: list, label: translateValue(list) }))}
      onChange={(list) => update({ featSpellSelections: { ...draft.featSpellSelections, CLASS_ASI: buildFeatSpellsForList(rule, list, data.options.spells.candidates, taken.filter((spellId) => !selected.some((spell) => spell.spellId === spellId))) } })} /> : null}
  </div>;
}

function SpellGroupOrigin({ isPlatformChoice }: { isPlatformChoice: boolean }) {
  return <span className={`ml-1 rounded-md px-2 py-0.5 text-xs ${isPlatformChoice ? "bg-amber-400/10 text-amber-200" : "bg-white/5 text-slate-400"}`}>
    {isPlatformChoice ? "вибір платформи: автор цього не називає" : "вибір автора RPGbot"}
  </span>;
}

function PreparedSpellEditor({ data, draft, update, isPlatformChoice }: SpellProps & { isPlatformChoice: boolean }) {
  const selected = draft.initialPreparedSpellIds ?? [];
  const scores = buildPresetAbilityScores(draft, data.options.abilitySources);
  const limit = data.options.spells.usesSpellbook ? findInitialWizardPreparedLimit(scores.INT) : findInitialListPreparedLimit(data.options.className, scores);
  const book = data.options.spells.usesSpellbook ? data.options.spells.candidates.filter((spell) => draft.classSpells?.spellbookIds.includes(spell.spellId)) : listPresetPreparedPool(data.options.spells);
  return <fieldset className="mt-5">
    <legend className="text-sm text-slate-300">Підготовлені заклинання · {selected.length} з {limit} <SpellGroupOrigin isPlatformChoice={isPlatformChoice} /></legend>
    <div className="mt-4"><PresetSpellPicker label="Підготовлені заклинання" spells={book} selectedIds={selected} limit={limit} onChange={(initialPreparedSpellIds) => update({ initialPreparedSpellIds })} /></div>
    {selected.length > limit ? <p role="alert" className="mt-2 text-sm text-rose-200">Приберіть зайві заклинання: характеристика класу дозволяє підготувати {limit}.</p> : null}
  </fieldset>;
}
