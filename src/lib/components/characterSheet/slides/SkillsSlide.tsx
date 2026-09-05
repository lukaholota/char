"use client";

import { useState, useCallback, memo } from "react";
import { PersWithRelations } from "@/lib/actions/pers";
import { formatModifier } from "@/lib/logic/utils";
import { Skills } from "@prisma/client";
import { ModifyConfig } from "../ModifyStatModal";
import ModifyStatModal from "../ModifyStatModal";
import {
  calculateFinalSkill,
  hasSkillBonus,
} from "@/lib/logic/bonus-calculator";
import { bonusTranslations, skillTranslations } from "@/lib/refs/translation";
import { BEAST_VALUE_RING, OwnValue, isBeastAbility, type BeastFormView } from "@/lib/components/characterSheet/BeastFormMarks";
import type { Ability } from "@prisma/client";

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

      return (
        <div key={skillInfo.skill}>
          {showHeader && (
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400/80 mt-3 mb-1 px-2">
              {bonusTranslations.statNames[skillInfo.ability as keyof typeof bonusTranslations.statNames]}
            </div>
          )}
          <button
            type="button"
            onClick={() => !isReadOnly && !fromBeast && openModify(skillInfo.skill)}
            className={`w-full text-left ${isReadOnly ? 'cursor-default' : ''}`}
          >
            <div
              className={`flex justify-between items-center py-2 px-2 rounded transition-all hover:bg-white/5 ${
                isProficient
                  ? "bg-cyan-500/10 border-l-2 border-cyan-400/60"
                  : "bg-slate-800/25 border-l-2 border-slate-700/40"
              } ${fromBeast ? BEAST_VALUE_RING : hasBonus ? "ring-1 ring-amber-400/40" : ""}`}
            >
              <div className="flex items-center gap-2 mr-2">
                <span
                  className={`text-sm transition ${
                    isProficient ? "text-slate-50 opacity-100 font-medium" : "text-slate-300/80"
                  }`}
                >
                  {skillTranslations[skillInfo.skill] ?? skillInfo.skill}
                </span>
              </div>
              <span className="flex items-baseline gap-1">
                <span
                  className={`text-sm font-bold transition ${
                    fromBeast
                      ? "text-emerald-300"
                      : proficiency === "EXPERTISE"
                        ? "text-amber-300 opacity-100"
                        : proficiency === "PROFICIENT"
                          ? "text-cyan-300 opacity-100"
                          : "text-slate-300/70"
                  }`}
                >
                  {formatModifier(total)}
                </span>
                {fromBeast && beastForm && (
                  <OwnValue value={formatModifier(calculateFinalSkill(beastForm.ownPers, skillInfo.skill).total)} />
                )}
              </span>
            </div>
          </button>
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
