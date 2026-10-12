"use client";

import type { ReadyPresetPageData } from "@/lib/optimization/ready-preset.server";
import {
  OPEN_PICK_LABELS, findSlotSchoolLimit, findWizardPreparation, listChosenKeys, listOpenPickCandidates, listOpenPickSlots, listStepsUpTo, listFixedSpells, resolvePreparedKeys,
  type AssemblyChoiceContext, type OpenPickSlot, type WizardPreparation,
} from "@/lib/optimization/ready-preset-levels";
import { describeSchoolLimit2014 } from "@/rules/class-spell-choices-2014";
import { buildSpellSlug } from "@/lib/spell-link";
import { PresetSpellPicker } from "./PresetSpellPicker";
import type { ReadyPresetAssembly } from "@/lib/optimization/use-ready-preset-assembly";

type SpellProps = { data: Pick<ReadyPresetPageData, "options">; assembly: ReadyPresetAssembly; context: AssemblyChoiceContext };


export function ReadyPresetLevelSpells({ data, assembly, context, slotId, characterLevel, preparationOnly = false }: SpellProps & { slotId?: string; characterLevel?: number; preparationOnly?: boolean }) {
  const slots = listOpenPickSlots(context.levels, context.targetLevel).filter((slot) => !preparationOnly && (!slotId || slot.id === slotId) && (!characterLevel || slot.characterLevel === characterLevel));
  const preparation = slotId || characterLevel ? null : findWizardPreparation(context);
  if (!slots.length && !preparation) return null;
  return <div className="mt-5 space-y-5">
    {slots.map((slot) => <OpenPickGroup key={slot.id} slot={slot} assembly={assembly} context={context} />)}
    {preparation ? <PreparedSpellEditor data={data} assembly={assembly} context={context} preparation={preparation} /> : null}
  </div>;
}

function OpenPickGroup({ slot, assembly, context }: { slot: OpenPickSlot; assembly: ReadyPresetAssembly; context: AssemblyChoiceContext }) {
  const chosen = listChosenKeys(context.choices, slot.id);
  const pool = Object.values(context.levels.spellPools).flat();
  const candidates = [...new Map([...pool.filter((spell) => chosen.includes(spell.key)), ...listOpenPickCandidates(context, slot, "")].map((spell) => [spell.key, spell])).values()];
  const label = OPEN_PICK_LABELS[slot.category];
  const schoolLimit = findSlotSchoolLimit(context, slot);
  return <fieldset>
    <legend className="text-sm text-slate-300">{label} · {slot.characterLevel}-й рівень, {slot.className} <span className="ml-1 rounded-md bg-amber-400/10 px-2 py-0.5 text-xs text-amber-200">вибір платформи: автор цього не називає</span></legend>
    {schoolLimit ? <p className="mt-1 text-sm text-slate-400">{describeSchoolLimit2014(schoolLimit)}</p> : null}
    <div className="mt-4"><PresetSpellPicker label={`${label} · ${slot.characterLevel}-й рівень`}
      spells={candidates.filter((spell) => spell.spellId !== undefined).map((spell) => ({ ...spell, school: spell.school ?? null, spellId: spell.spellId!, ruleset: "RULES_2014" }))}
      selectedIds={chosen.flatMap((key) => pool.find((spell) => spell.key === key)?.spellId ?? [])}
      limit={slot.count} onChange={(ids) => assembly.chooseSpells(slot.id, ids.map((id) => pool.find((spell) => spell.spellId === id)!.key))} /></div>
  </fieldset>;
}

function PreparedSpellEditor({ data, assembly, context, preparation }: SpellProps & { preparation: WizardPreparation }) {
  const selected = resolvePreparedKeys(preparation, context);
  const pool = [...data.options.spells.candidates.map((spell) => ({ ...spell, key: buildSpellSlug(spell.engName) })), ...Object.values(context.levels.spellPools).flat(), ...listStepsUpTo(context.levels, context.targetLevel).flatMap(listFixedSpells)];
  const book = [...new Map(pool.filter((spell) => preparation.bookKeys.includes(spell.key) && spell.spellId !== undefined).map((spell) => [spell.key, spell])).values()];
  return <fieldset>
    <legend className="text-sm text-slate-300">Підготовлені заклинання · {selected.length} з {preparation.limit}</legend>
    <p className="mt-1 text-sm text-slate-400">Чарівник готує заклинання з книги: Інтелект {preparation.intelligence} і {preparation.wizardLevel}-й рівень Чарівника дозволяють підготувати {preparation.limit}.</p>
    <PresetSpellPicker label="Підготовлені заклинання" spells={book.map((spell) => ({ ...spell, spellId: spell.spellId!, school: spell.school ?? null }))}
      selectedIds={book.filter((spell) => selected.includes(spell.key)).map((spell) => spell.spellId!)} limit={preparation.limit}
      onChange={(ids) => assembly.choosePreparedSpells(book.filter((spell) => ids.includes(spell.spellId!)).map((spell) => spell.key))} />
  </fieldset>;
}

