"use client";

import { Plus } from "lucide-react";
import type { PersCustomSkill } from "@prisma/client";
import type { PersWithRelations } from "@/lib/actions/pers";
import { BEAST_VALUE_RING, OwnValue, isBeastAbility, type BeastFormView } from "@/lib/components/characterSheet/BeastFormMarks";
import { RollPill } from "@/lib/components/dice/RollPill";
import { buildSkillRollContext } from "@/lib/components/dice/roll-contexts";
import { calculateCustomSkillTotal } from "@/lib/logic/bonus-calculator";
import { describeRollState } from "@/lib/logic/state-labels";
import { formatModifier } from "@/lib/logic/utils";
import { bonusTranslations } from "@/lib/refs/translation";
import { useDiceUIStore } from "@/lib/stores/diceUIStore";

export function CustomSkillRow({ pers, skill, beastForm, onEdit }: { pers: PersWithRelations; skill: PersCustomSkill; beastForm?: BeastFormView; onEdit?: () => void }) {
  const openRoll = useDiceUIStore((state) => state.openRoll);
  const total = calculateCustomSkillTotal(pers, skill);
  const fromBeast = isBeastAbility(beastForm, skill.ability);
  const isProficient = skill.proficiencyType !== "NONE";
  const abilityName = bonusTranslations.statNames[skill.ability];
  const rollState = describeRollState(pers, { kind: "check", ability: skill.ability });
  const rollContext = buildSkillRollContext(skill.name, abilityName, total, onEdit, rollState);
  return (
    <div className={`flex min-w-0 items-center gap-1 rounded border-l-2 border-arcane-400/70 py-1 pl-2 pr-1 ${isProficient ? "bg-arcane-500/15" : "bg-arcane-500/5"} ${fromBeast ? BEAST_VALUE_RING : ""}`}>
      <button type="button" onClick={onEdit ?? (() => openRoll(rollContext))} aria-label={onEdit ? `Редагувати власну навичку: ${skill.name}` : `Перевірка: ${skill.name}`} className="flex min-h-7 min-w-0 flex-1 items-center rounded text-left hover:bg-white/5">
        <span className={`min-w-0 hyphens-auto break-words text-sm ${isProficient ? "font-medium text-slate-50" : "text-arcane-100/80"}`}>{skill.name}</span>
      </button>
      {fromBeast && beastForm ? <OwnValue value={formatModifier(calculateCustomSkillTotal(beastForm.ownPers, skill))} /> : null}
      <RollPill size="sm" value={formatModifier(total)} label={`Перевірка: ${skill.name} ${formatModifier(total)}`} onRoll={() => openRoll(rollContext)} mode={rollState.mode} valueClassName={fromBeast ? "text-emerald-300" : findProficiencyColor(skill.proficiencyType)} />
    </div>
  );
}

export function AddCustomSkillButton({ onAdd }: { onAdd: () => void }) {
  return (
    <button type="button" onClick={onAdd} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded border border-dashed border-arcane-400/40 text-sm text-arcane-100 hover:bg-arcane-500/10">
      <Plus className="h-4 w-4" aria-hidden />
      Додати власну навичку
    </button>
  );
}

function findProficiencyColor(proficiencyType: PersCustomSkill["proficiencyType"]): string {
  if (proficiencyType === "EXPERTISE") return "text-amber-300";
  return proficiencyType === "PROFICIENT" ? "text-cyan-300" : "text-slate-200";
}
