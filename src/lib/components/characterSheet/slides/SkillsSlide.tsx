"use client";

import { useState, useCallback, memo } from "react";
import { PersWithRelations } from "@/lib/actions/pers";
import { formatModifier } from "@/lib/logic/utils";
import { Skills } from "@/lib/prisma-enums";
import { ModifyConfig } from "../ModifyStatModal";
import ModifyStatModal from "../ModifyStatModal";
import {
  calculateFinalSkill,
  findSkillAbility,
  hasSkillBonus,
} from "@/lib/logic/bonus-calculator";
import { bonusTranslations, skillTranslations } from "@/lib/refs/translation";
import { BEAST_VALUE_RING, OwnValue, isBeastAbility, type BeastFormView } from "@/lib/components/characterSheet/BeastFormMarks";
import type { Ability, PersCustomSkill } from "@prisma/client";
import { useDiceUIStore } from "@/lib/stores/diceUIStore";
import { RollPill } from "@/lib/components/dice/RollPill";
import { buildSkillRollContext } from "@/lib/components/dice/roll-contexts";
import { describeRollState } from "@/lib/logic/state-labels";
import { AddCustomSkillButton, CustomSkillRow } from "@/lib/components/characterSheet/custom/CustomSkillRow";
import { CustomSkillDialog, type CustomSkillTarget } from "@/lib/components/characterSheet/custom/CustomSkillDialog";
import { MAX_CUSTOM_SKILLS } from "@/rules/pers-custom-content";

interface SkillsSlideProps {
  pers: PersWithRelations;
  onPersUpdate?: (next: PersWithRelations) => void;
  isReadOnly?: boolean;
  /// Володіння лишаються персонажеві, а модифікатор рахується від характеристики звіра —
  /// 2014 зберігає володіння «де застосовно», а не бере їх зі статблока.
  beastForm?: BeastFormView;
}

const SkillsSlide = memo(function SkillsSlide({ pers, onPersUpdate, isReadOnly, beastForm }: SkillsSlideProps) {
  const editablePers = beastForm?.ownPers ?? pers;
  const openRoll = useDiceUIStore((state) => state.openRoll);
  // Bonus modification modal state
  const [modifyOpen, setModifyOpen] = useState(false);
  const [modifyConfig, setModifyConfig] = useState<ModifyConfig | null>(null);
  const [customSkillTarget, setCustomSkillTarget] = useState<CustomSkillTarget>(null);

  // Helper to open modify modal
  const openModify = useCallback((skill: Skills) => {
    setModifyConfig({ type: 'skill', skill });
    setModifyOpen(true);
  }, []);

  // Helper for pers updates
  const handlePersUpdate = useCallback((next: PersWithRelations) => {
    onPersUpdate?.(next);
  }, [onPersUpdate]);

  const customSkills = editablePers.persCustomSkills ?? [];
  const canAddCustomSkill = !isReadOnly && customSkills.length < MAX_CUSTOM_SKILLS;

  const renderSkillGroup = ({ ability, skills }: SkillGroup) => {
    const groupCustomSkills = customSkills.filter((skill) => skill.ability === ability);
    if (!skills.length && !groupCustomSkills.length) return null;
    return (
      <div key={ability}>
        <div className="text-xs font-bold uppercase tracking-wider text-indigo-400/80 mt-3 mb-1 px-2">
          {bonusTranslations.statNames[ability]}
        </div>
        {skills.map((skill) => renderSkillRow(ability, skill))}
        {groupCustomSkills.map((skill) => (
          <CustomSkillRow key={`custom-${skill.id}`} pers={pers} skill={skill} beastForm={beastForm} onEdit={isReadOnly ? undefined : () => setCustomSkillTarget(skill)} />
        ))}
      </div>
    );
  };

  const renderSkillRow = (ability: Ability, skill: Skills) => {
    const { total, proficiency } = calculateFinalSkill(pers, skill);
    const isProficient = proficiency !== "NONE";
    const hasBonus = hasSkillBonus(pers, skill);
    const fromBeast = isBeastAbility(beastForm, ability);
    const skillName = skillTranslations[skill] ?? skill;
    const abilityName = bonusTranslations.statNames[ability];
    const canEdit = !isReadOnly && !fromBeast;
    const rollAbility = findSkillAbility(pers, skill) ?? ability;
    const rollState = describeRollState(pers, { kind: "check", ability: rollAbility, skill });
    const rollContext = buildSkillRollContext(skillName, abilityName, total, canEdit ? () => openModify(skill) : undefined, rollState);

    return (
      <div
        key={skill}
        className={`flex items-center gap-1 rounded py-1 pl-2 pr-1 ${
          isProficient
            ? "bg-cyan-500/10 border-l-2 border-cyan-400/60"
            : "bg-slate-800/25 border-l-2 border-slate-700/40"
        } ${fromBeast ? BEAST_VALUE_RING : hasBonus ? "ring-1 ring-amber-400/40" : ""}`}
      >
        <button
          type="button"
          onClick={() => (canEdit ? openModify(skill) : openRoll(rollContext))}
          aria-label={canEdit ? `Редагувати: ${skillName}` : `Перевірка: ${skillName}`}
          className="flex min-h-7 min-w-0 flex-1 items-center rounded text-left hover:bg-white/5"
        >
          <span
            className={`text-sm transition ${
              isProficient ? "text-slate-50 opacity-100 font-medium" : "text-slate-300/80"
            }`}
          >
            {skillName}
          </span>
        </button>
        {fromBeast && beastForm && (
          <OwnValue value={formatModifier(calculateFinalSkill(beastForm.ownPers, skill).total)} />
        )}
        <RollPill
          size="sm"
          value={formatModifier(total)}
          label={`Перевірка: ${skillName} ${formatModifier(total)}`}
          onRoll={() => openRoll(rollContext)}
          mode={rollState.mode}
          valueClassName={
            fromBeast
              ? "text-emerald-300"
              : proficiency === "EXPERTISE"
                ? "text-amber-300"
                : proficiency === "PROFICIENT"
                  ? "text-cyan-300"
                  : "text-slate-200"
          }
        />
      </div>
    );
  };

  const showSavedCustomSkills = (persCustomSkills: PersCustomSkill[]) => {
    onPersUpdate?.({ ...editablePers, persCustomSkills });
    setCustomSkillTarget(null);
  };

  return (
    <div className="p-3">
      <div className="grid grid-cols-2 gap-x-3 gap-y-0">
        {SKILL_COLUMNS.map((groups, index) => (
          <div key={index} className="min-w-0 space-y-0">
            {groups.map(renderSkillGroup)}
          </div>
        ))}
      </div>

      {canAddCustomSkill ? <AddCustomSkillButton onAdd={() => setCustomSkillTarget("new")} /> : null}
      <CustomSkillDialog pers={editablePers} target={customSkillTarget} onClose={() => setCustomSkillTarget(null)} onSaved={showSavedCustomSkills} />

      <ModifyStatModal
        open={modifyOpen}
        onOpenChange={setModifyOpen}
        pers={editablePers}
        onPersUpdate={handlePersUpdate}
        config={modifyConfig}
      />
    </div>
  );
});

type SkillGroup = { ability: Ability; skills: Skills[] };

/// Статура не має стандартних навичок, тож її власні навички стоять окремою групою в кінці.
const SKILL_COLUMNS: SkillGroup[][] = [
  [
    { ability: "STR", skills: [Skills.ATHLETICS] },
    { ability: "DEX", skills: [Skills.ACROBATICS, Skills.SLEIGHT_OF_HAND, Skills.STEALTH] },
    { ability: "INT", skills: [Skills.ARCANA, Skills.HISTORY, Skills.INVESTIGATION, Skills.NATURE, Skills.RELIGION] },
  ],
  [
    { ability: "WIS", skills: [Skills.ANIMAL_HANDLING, Skills.INSIGHT, Skills.MEDICINE, Skills.PERCEPTION, Skills.SURVIVAL] },
    { ability: "CHA", skills: [Skills.DECEPTION, Skills.INTIMIDATION, Skills.PERFORMANCE, Skills.PERSUASION] },
    { ability: "CON", skills: [] },
  ],
];

export default SkillsSlide;
