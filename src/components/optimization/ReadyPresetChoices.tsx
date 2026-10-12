"use client";

import { useState } from "react";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import type { ReadyPresetPageData } from "@/lib/optimization/ready-preset.server";
import type { ChoiceGroup } from "@/lib/optimization/ready-preset-identity";
import { ClassChoiceOptionGroups } from "@/lib/components/characterCreator/ClassChoiceOptionGroups";
import { RaceChoiceOptionGroups } from "@/lib/components/characterCreator/RaceChoiceOptionGroups";
import { ChoiceOptionFeaturesDialog, type ChoiceOptionInfo } from "@/lib/components/characterCreator/ChoiceOptionFeaturesDialog";

type ChoiceKind = "classOptions" | "subclassOptions" | "raceOptions";
type ChoiceField = "classChoiceSelections" | "subclassChoiceSelections" | "raceChoiceSelections";
type PresetChoiceData = Pick<ReadyPresetPageData, "preset" | "options"> & { creator: { race: Pick<ReadyPresetPageData["creator"]["race"], "raceChoiceOptions"> } };
type ChoiceProps = { data: PresetChoiceData; draft: Partial<PersFormData>; update: (changes: Partial<PersFormData>) => void };
type Rows = PresetChoiceData["options"]["choiceRows"] & { raceOptions: PresetChoiceData["creator"]["race"]["raceChoiceOptions"] };

const CHOICE_FIELDS: Record<ChoiceKind, ChoiceField> = {
  classOptions: "classChoiceSelections",
  subclassOptions: "subclassChoiceSelections",
  raceOptions: "raceChoiceSelections",
};
const CHOICE_KINDS = Object.keys(CHOICE_FIELDS) as ChoiceKind[];
const AUTHOR_NOTE = "Цей вибір уже заповнений за авторським прикладом RPGbot.";
const PLATFORM_NOTE = "Автор прикладу цього не називає — вибір зробила платформа. Його можна змінити.";

export function ReadyPresetChoices({ data, draft, update }: ChoiceProps) {
  const [info, setInfo] = useState<ChoiceOptionInfo | null>(null);
  const platformKinds = data.preset.platformChoices ?? [];
  const rows: Rows = { ...data.options.choiceRows, raceOptions: data.creator.race.raceChoiceOptions };
  return <>
    {CHOICE_KINDS.flatMap((kind) => data.options.choiceGroups[kind].map((group) => {
      const field = CHOICE_FIELDS[kind];
      const selections = draft[field] ?? {};
      const selected = selections[group.group];
      const note = platformKinds.includes(kind) ? PLATFORM_NOTE : AUTHOR_NOTE;
      const select = (optionId: number) => update({ [field]: { ...selections, [group.group]: optionId } });
      const isEditable = typeof selected === "number" && group.options.length > 1 && !group.isLocked;
      return <section key={`${kind}-${group.group}`} className="space-y-2">
        {isEditable
          ? <EditableGroup kind={kind} group={group} rows={rows} selected={selected} onSelect={select} onShowFeatures={(title, features) => setInfo({ title, features })} />
          : <FixedGroup group={group} selected={selected} />}
        <p className="text-sm leading-relaxed text-slate-400">{note}</p>
        {group.isLocked ? <p className="text-sm leading-relaxed text-slate-400">Цей вибір змінює навички, Експертизу або мови, тож у готовому персонажі його не міняють: для іншого варіанта скористайтеся звичайним конструктором.</p> : null}
      </section>;
    }))}
    <ChoiceOptionFeaturesDialog info={info} onClose={() => setInfo(null)} />
  </>;
}

type EditableProps = { kind: ChoiceKind; group: ChoiceGroup; rows: Rows; selected: number; onSelect: (optionId: number) => void; onShowFeatures: (title: string, features?: ChoiceOptionInfo["features"]) => void };

function EditableGroup({ kind, group, rows, selected, onSelect, onShowFeatures }: EditableProps) {
  const ids = new Set(group.options.map((option) => option.id));
  const selections = { [group.group]: selected };
  if (kind === "raceOptions") {
    const options = rows.raceOptions.filter((row) => ids.has(row.optionId));
    return <RaceChoiceOptionGroups groupedOptions={[{ groupName: group.group, options }]} selections={selections} onSelectOption={(_group, optionId) => onSelect(optionId)} />;
  }
  const options = (kind === "classOptions" ? rows.classOptions : rows.subclassOptions).filter((row) => ids.has(row.choiceOptionId));
  return <ClassChoiceOptionGroups groupedOptions={[{ groupName: group.group, options }]} selectionState={{ charLevel: 1, pickCount: 1, selections }}
    onSelectOption={(_group, optionId) => onSelect(optionId)} onShowFeatures={onShowFeatures} />;
}

function FixedGroup({ group, selected }: { group: ChoiceGroup; selected: number | number[] | undefined }) {
  const labels = [selected ?? []].flat().map((id) => group.options.find((option) => option.id === id)?.label).filter(Boolean).join(" · ");
  return <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
    <h3 className="text-sm text-slate-400">{group.group}</h3>
    <p className="mt-1 text-lg text-white">{labels}</p>
  </div>;
}
