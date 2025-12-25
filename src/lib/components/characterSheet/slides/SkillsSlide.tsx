"use client";

import { PersWithRelations } from "@/lib/actions/pers";
import { getAbilityMod, formatModifier, getProficiencyBonus } from "@/lib/logic/utils";
import { Skills } from "@prisma/client";

interface SkillsSlideProps {
  pers: PersWithRelations;
}

export default function SkillsSlide({ pers }: SkillsSlideProps) {
  const pb = getProficiencyBonus(pers.level);

  const allSkills = [
    // STR
    { ability: "STR", abilityName: "СИЛА", skill: Skills.ATHLETICS, name: "Атлетика", score: pers.str },
    // DEX
    { ability: "DEX", abilityName: "СПРИТНІСТЬ", skill: Skills.ACROBATICS, name: "Акробатика", score: pers.dex },
    { ability: "DEX", abilityName: "СПРИТНІСТЬ", skill: Skills.SLEIGHT_OF_HAND, name: "Спритність рук", score: pers.dex },
    { ability: "DEX", abilityName: "СПРИТНІСТЬ", skill: Skills.STEALTH, name: "Непомітність", score: pers.dex },
    // INT
    { ability: "INT", abilityName: "ІНТЕЛЕКТ", skill: Skills.ARCANA, name: "Магія", score: pers.int },
    { ability: "INT", abilityName: "ІНТЕЛЕКТ", skill: Skills.HISTORY, name: "Історія", score: pers.int },
    { ability: "INT", abilityName: "ІНТЕЛЕКТ", skill: Skills.INVESTIGATION, name: "Розслідування", score: pers.int },
    { ability: "INT", abilityName: "ІНТЕЛЕКТ", skill: Skills.NATURE, name: "Природа", score: pers.int },
    { ability: "INT", abilityName: "ІНТЕЛЕКТ", skill: Skills.RELIGION, name: "Релігія", score: pers.int },
    // WIS
    { ability: "WIS", abilityName: "МУДРІСТЬ", skill: Skills.ANIMAL_HANDLING, name: "Поводження з тваринами", score: pers.wis },
    { ability: "WIS", abilityName: "МУДРІСТЬ", skill: Skills.INSIGHT, name: "Аналіз поведінки", score: pers.wis },
    { ability: "WIS", abilityName: "МУДРІСТЬ", skill: Skills.MEDICINE, name: "Медицина", score: pers.wis },
    { ability: "WIS", abilityName: "МУДРІСТЬ", skill: Skills.PERCEPTION, name: "Уважність", score: pers.wis },
    { ability: "WIS", abilityName: "МУДРІСТЬ", skill: Skills.SURVIVAL, name: "Виживання", score: pers.wis },
    // CHA
    { ability: "CHA", abilityName: "ХАРИЗМА", skill: Skills.DECEPTION, name: "Обман", score: pers.cha },
    { ability: "CHA", abilityName: "ХАРИЗМА", skill: Skills.INTIMIDATION, name: "Залякування", score: pers.cha },
    { ability: "CHA", abilityName: "ХАРИЗМА", skill: Skills.PERFORMANCE, name: "Виступ", score: pers.cha },
    { ability: "CHA", abilityName: "ХАРИЗМА", skill: Skills.PERSUASION, name: "Переконання", score: pers.cha },
  ];

  const getSkillProficiency = (skillName: Skills) => {
    const persSkill = pers.skills.find((ps) => ps.name === skillName);
    return persSkill?.proficiencyType || "NONE";
  };

  const calculateSkillModifier = (skillName: Skills, abilityScore: number) => {
    const abilityMod = getAbilityMod(abilityScore);
    const proficiency = getSkillProficiency(skillName);
    let total = abilityMod;
    if (proficiency === "PROFICIENT") total += pb;
    if (proficiency === "EXPERTISE") total += pb * 2;
    return { total, proficiency };
  };

  let lastAbility = "";

  return (
    <div className="h-full p-4">
      <div className="space-y-0">
        {allSkills.map((skillInfo) => {
          const { total, proficiency } = calculateSkillModifier(skillInfo.skill, skillInfo.score);
          const isProficient = proficiency !== "NONE";
          const showHeader = lastAbility !== skillInfo.ability;
          if (showHeader) lastAbility = skillInfo.ability;

          return (
            <div key={skillInfo.skill}>
              {showHeader && (
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400/80 mt-3 mb-1 px-2">
                  {skillInfo.abilityName}
                </div>
              )}
              <div
                className={`flex justify-between items-center h-8 px-3 rounded transition-all ${
                  isProficient
                    ? "bg-cyan-500/10 border-l-2 border-cyan-400/60"
                    : "bg-slate-800/25 border-l-2 border-slate-700/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  {proficiency === "EXPERTISE" && (
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.8)]" />
                  )}
                  {proficiency === "PROFICIENT" && (
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.6)]" />
                  )}
                  <span
                    className={`text-sm transition ${
                      isProficient ? "text-slate-50 opacity-100 font-medium" : "text-slate-300/80"
                    }`}
                  >
                    {skillInfo.name}
                  </span>
                </div>
                <span
                  className={`text-sm font-bold transition ${
                    proficiency === "EXPERTISE"
                      ? "text-amber-300 opacity-100"
                      : proficiency === "PROFICIENT"
                        ? "text-cyan-300 opacity-100"
                        : "text-slate-300/70"
                  }`}
                >
                  {formatModifier(total)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
