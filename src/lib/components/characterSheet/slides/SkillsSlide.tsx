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
import type { Ability } from "@prisma/client";
import { useDiceUIStore } from "@/lib/stores/diceUIStore";
import { RollPill } from "@/lib/components/dice/RollPill";
import { buildSkillRollContext } from "@/lib/components/dice/roll-contexts";
import { describeRollState } from "@/lib/logic/state-labels";

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

  // Helper to open modify modal
  const openModify = useCallback((skill: Skills) => {
    setModifyConfig({ type: 'skill', skill });
    setModifyOpen(true);
  }, []);

  // Helper for pers updates
  const handlePersUpdate = useCallback((next: PersWithRelations) => {
    onPersUpdate?.(next);
  }, [onPersUpdate]);

  const column1Skills = [
    // STR
    { ability: "STR", skill: Skills.ATHLETICS },
    // DEX
    { ability: "DEX", skill: Skills.ACROBATICS },
    { ability: "DEX", skill: Skills.SLEIGHT_OF_HAND },
    { ability: "DEX", skill: Skills.STEALTH },
    // INT
    { ability: "INT", skill: Skills.ARCANA },
    { ability: "INT", skill: Skills.HISTORY },
    { ability: "INT", skill: Skills.INVESTIGATION },
    { ability: "INT", skill: Skills.NATURE },
    { ability: "INT", skill: Skills.RELIGION },
  ];

  const column2Skills = [
    // WIS
    { ability: "WIS", skill: Skills.ANIMAL_HANDLING },
    { ability: "WIS", skill: Skills.INSIGHT },
    { ability: "WIS", skill: Skills.MEDICINE },
    { ability: "WIS", skill: Skills.PERCEPTION },
    { ability: "WIS", skill: Skills.SURVIVAL },
    // CHA
    { ability: "CHA", skill: Skills.DECEPTION },
    { ability: "CHA", skill: Skills.INTIMIDATION },
    { ability: "CHA", skill: Skills.PERFORMANCE },
    { ability: "CHA", skill: Skills.PERSUASION },
  ];

  const renderSkillGroup = (skills: { ability: string; skill: Skills }[]) => {
    let lastAbility = "";
    return skills.map((skillInfo) => {
      const { total, proficiency } = calculateFinalSkill(pers, skillInfo.skill);
      const isProficient = proficiency !== "NONE";
      const hasBonus = hasSkillBonus(pers, skillInfo.skill);
      const fromBeast = isBeastAbility(beastForm, skillInfo.ability as Ability);
      const showHeader = lastAbility !== skillInfo.ability;
      if (showHeader) lastAbility = skillInfo.ability;
      const skillName = skillTranslations[skillInfo.skill] ?? skillInfo.skill;
      const abilityName = bonusTranslations.statNames[skillInfo.ability as keyof typeof bonusTranslations.statNames];
      const canEdit = !isReadOnly && !fromBeast;
      const rollAbility = findSkillAbility(pers, skillInfo.skill) ?? (skillInfo.ability as Ability);
      const rollState = describeRollState(pers, { kind: "check", ability: rollAbility, skill: skillInfo.skill });
      const rollContext = buildSkillRollContext(skillName, abilityName, total, canEdit ? () => openModify(skillInfo.skill) : undefined, rollState);

      return (
        <div key={skillInfo.skill}>
          {showHeader && (
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400/80 mt-3 mb-1 px-2">
              {bonusTranslations.statNames[skillInfo.ability as keyof typeof bonusTranslations.statNames]}
            </div>
          )}
          <div
            className={`flex items-center gap-1 rounded py-1 pl-2 pr-1 transition-all ${
              isProficient
                ? "bg-cyan-500/10 border-l-2 border-cyan-400/60"
                : "bg-slate-800/25 border-l-2 border-slate-700/40"
            } ${fromBeast ? BEAST_VALUE_RING : hasBonus ? "ring-1 ring-amber-400/40" : ""}`}
          >
            <button
              type="button"
              onClick={() => (canEdit ? openModify(skillInfo.skill) : openRoll(rollContext))}
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
              <OwnValue value={formatModifier(calculateFinalSkill(beastForm.ownPers, skillInfo.skill).total)} />
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
        </div>
      );
    });
  };

  return (
    <div className="p-3">
      <div className="grid grid-cols-2 gap-x-3 gap-y-0">
        <div className="space-y-0">
          {renderSkillGroup(column1Skills)}
        </div>
        <div className="space-y-0">
          {renderSkillGroup(column2Skills)}
        </div>
      </div>

      {/* Modify Skill Modal */}
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

export default SkillsSlide;
