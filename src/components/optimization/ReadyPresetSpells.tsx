"use client";

import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import type { ReadyPresetPageData } from "@/lib/optimization/ready-preset.server";
import { findCommonSpellLists2014 } from "@/rules/feat-spells-2014";
import { buildFeatSpellsForList, buildPresetSpellChoicePatch, buildPresetSpellGroups, isPresetSpellLevelOpen, listPresetPreparedPool, listPresetSpellGroupCandidates, type PresetSpellGroupState } from "@/lib/optimization/ready-preset-spells";
import { PresetOptionPicker } from "./PresetOptionPicker";
import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import { PresetSpellPicker } from "./PresetSpellPicker";
import { BuildSource } from "./BuildSource";
import { findInitialListPreparedLimit, findInitialWizardPreparedLimit } from "@/rules/initial-prepared-spells-2014";
import { buildPresetAbilityScores } from "@/lib/optimization/ready-preset-abilities";

type SpellProps = { data: Pick<ReadyPresetPageData, "preset" | "recipe" | "options" | "draft">; draft: Partial<PersFormData>; update: (changes: Partial<PersFormData>) => void };

const LIST_PREPARATION_NOTE = "Цей клас готує заклинання зі свого списку. У конструкторі їх не обирають: підготовлені заклинання ви виберете на листі персонажа.";

export function ReadyPresetSpells({ data, draft, update, hidePreparedEditor = false }: SpellProps & { hidePreparedEditor?: boolean }) {
  const preset = data.preset.spells;
  if (!preset) return null;
  const options = data.options.spells;
  const groups = buildPresetSpellGroups(options, draft);
  const taken = groups.flatMap((group) => group.selected);
  const platformGroups = preset.platformChoices ?? [];
  const hasListPreparation = options.preparation === "list" && preset.preparedSpellKeys.length === 0;
  const hasPreparedEditor = !hidePreparedEditor && (options.usesSpellbook || (options.preparation === "list" && !hasListPreparation));
  const defaults = buildPresetSpellGroups(options, data.draft);
  return <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
    <h3 className="text-lg text-white">Заклинання</h3>
    <p className="mt-2 text-sm leading-relaxed text-slate-400">{preset.explanation}</p>
    {hasListPreparation ? <p className="mt-2 text-sm leading-relaxed text-slate-300">{LIST_PREPARATION_NOTE}</p> : null}
    <FeatSpellSummary data={data} draft={draft} update={update} taken={taken} />
    <div className="mt-4 space-y-8">{groups.filter((group) => defaults.find((entry) => entry.id === group.id)!.selected.length).map((group) => {
      const original = defaults.find((entry) => entry.id === group.id)!;
      const candidates = listPresetSpellGroupCandidates(options, group, taken);
      return <div key={group.id}><SpellGroupOrigin isPlatformChoice={platformGroups.includes(group.id)} /><PresetSpellPicker label={group.label} spells={candidates} selectedIds={group.selected} ratedCaster={{ className: data.options.className }}
        limit={original.selected.length} isSelectable={(spell) => isPresetSpellLevelOpen(options, group, original, spell.level)} onChange={(ids) => update(buildPresetSpellChoicePatch(draft, group, ids))} /></div>;
    })}</div>
    {hasPreparedEditor ? <PreparedSpellEditor data={data} draft={draft} update={update} isPlatformChoice={platformGroups.includes("preparedSpells")} /> : null}
    <BuildSource text="Стартові замовляння й заклинання автора." refs={[{ ...data.recipe.sourceRefs[0], sectionId: preset.sectionId }]} ruleset="RULES_2014" />
  </section>;
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
    <div className="mt-4"><PresetSpellPicker label="Підготовлені заклинання" spells={book} selectedIds={selected} limit={limit} ratedCaster={{ className: data.options.className }} onChange={(initialPreparedSpellIds) => update({ initialPreparedSpellIds })} /></div>
    {selected.length > limit ? <p role="alert" className="mt-2 text-sm text-rose-200">Приберіть зайві заклинання: характеристика класу дозволяє підготувати {limit}.</p> : null}
  </fieldset>;
}
