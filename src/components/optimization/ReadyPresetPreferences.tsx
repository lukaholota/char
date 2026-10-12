"use client";

import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import type { ReadyPresetPageData } from "@/lib/optimization/ready-preset.server";
import type { ReadyEquipmentGroup } from "@/lib/optimization/ready-preset-options";
import { buildEquipmentSelection, findSelectedEquipmentChoice } from "@/lib/optimization/ready-preset-equipment";
import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import { BuildSource } from "./BuildSource";

const SELECT_STYLE = "mt-2 min-h-12 w-full rounded-xl border border-white/20 bg-slate-950 px-3 text-slate-100";
type PreferencesProps = { data: ReadyPresetPageData; draft: Partial<PersFormData>; update: (changes: Partial<PersFormData>) => void };

export function ReadyPresetPreferences({ data, draft, update }: PreferencesProps) {
  const equipment = draft.equipmentSchema!;
  const customized = JSON.stringify(equipment) !== JSON.stringify(data.draft.equipmentSchema);
  return <section className="mt-4 rounded-2xl border border-arcane-400/25 bg-arcane-500/5 p-5">
    <h3 className="text-lg text-white">Мови й спорядження</h3>
    <p className="mt-2 text-sm leading-relaxed text-slate-400">{customized ? "Це ваше спорядження. Вихідний набір RPGbot можна прочитати нижче." : data.preset.equipmentExplanation}</p>
    <p className="mt-4 text-sm text-slate-300">Мови, які ви вже знаєте: {data.options.knownLanguages.map((language) => translateValue(language)).join(", ")}.</p>
    {draft.languagesSchema!.languages.map((language, index) => <label key={index} className="mt-4 block text-sm text-slate-300">Додаткова мова<select aria-label={index ? "Додаткова мова · " + (index + 1) : "Додаткова мова"} className={SELECT_STYLE} value={language} onChange={(event) => update({ languagesSchema: { languages: draft.languagesSchema!.languages.map((entry, position) => position === index ? event.target.value : entry) } })}>{data.options.languages.filter((option) => option === language || !draft.languagesSchema!.languages.includes(option)).map((option) => <option key={option} value={option}>{translateValue(option)}</option>)}</select></label>)}
    <h4 className="mt-5 text-slate-200">Стартове спорядження вже обране</h4>
    <ul className="mt-3 space-y-2 text-sm text-slate-300">{data.options.equipmentGroups.map((group) => {
      const choice = findSelectedEquipmentChoice(equipment, group)!;
      const weapons = (equipment.anyWeaponSelection[group.group] ?? []).map((id) => choice.weapons.find((weapon) => weapon.id === id)!.label);
      return <li key={group.group}>{choice.label}{weapons.length ? " — " + weapons.join(", ") : ""}</li>;
    })}</ul>
    <details className="mt-4"><summary className="min-h-11 cursor-pointer py-2 text-sm text-arcane-200 underline">Змінити спорядження</summary><div className="mt-3 space-y-4">{data.options.equipmentGroups.map((group) => <EquipmentGroupEditor key={group.group} group={group} draft={draft} update={update} />)}</div></details>
    <BuildSource text="Стартове спорядження й пояснення тактики автора." refs={[{ ...data.recipe.sourceRefs[0], sectionId: data.preset.equipmentSection }]} ruleset="RULES_2014" />
    <details className="mt-2 text-sm text-slate-400"><summary className="min-h-11 cursor-pointer py-2">Показати речі від передісторії</summary><ul className="mt-2 space-y-1">{data.belongings.map((item) => <li key={item.name}>{item.name} · {item.quantity}</li>)}</ul></details>
  </section>;
}

function EquipmentGroupEditor({ group, draft, update }: { group: ReadyEquipmentGroup; draft: Partial<PersFormData>; update: PreferencesProps["update"] }) {
  const equipment = draft.equipmentSchema!;
  const selected = findSelectedEquipmentChoice(equipment, group)!;
  function chooseOption(option: string) {
    const choice = group.choices.find((entry) => entry.option === option)!;
    const previous = equipment.anyWeaponSelection[group.group] ?? [];
    const weaponIds = Array.from({ length: choice.weaponCount }, (_, index) => choice.weapons.find((weapon) => weapon.id === previous[index])?.id ?? choice.weapons[index % choice.weapons.length].id);
    update({ equipmentSchema: buildEquipmentSelection(equipment, group.group, choice, weaponIds) });
  }
  function chooseWeapon(index: number, id: number) {
    const weaponIds = equipment.anyWeaponSelection[group.group].map((entry, position) => position === index ? id : entry);
    update({ equipmentSchema: buildEquipmentSelection(equipment, group.group, selected, weaponIds) });
  }
  return <div>
    {group.choices.length > 1 ? <label className="block text-sm text-slate-300">{group.label}<select aria-label={group.label + " · " + group.group} className={SELECT_STYLE} value={selected.option} onChange={(event) => chooseOption(event.target.value)}>{group.choices.map((choice) => <option key={choice.option} value={choice.option}>{choice.label}</option>)}</select></label> : <p className="text-sm text-slate-400">{selected.label}</p>}
    {(equipment.anyWeaponSelection[group.group] ?? []).map((id, index) => <label key={index} className="mt-3 block text-sm text-slate-300">Зброя{selected.weaponCount > 1 ? " · " + (index + 1) : ""}<select aria-label={"Зброя · " + group.group + " · " + (index + 1)} className={SELECT_STYLE} value={id} onChange={(event) => chooseWeapon(index, Number(event.target.value))}>{selected.weapons.map((weapon) => <option key={weapon.id} value={weapon.id}>{weapon.label}</option>)}</select></label>)}
  </div>;
}
