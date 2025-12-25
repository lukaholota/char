"use client";

import { PersWithRelations } from "@/lib/actions/pers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAbilityMod, formatModifier, getProficiencyBonus, skillAbilityMap } from "@/lib/logic/utils";
import { Badge } from "@/components/ui/badge";
import { Skills } from "@prisma/client";

export default function StatsPage({ pers }: { pers: PersWithRelations }) {
  const pb = getProficiencyBonus(pers.level);

  // Group all skills by ability score
  const skillsByAbility = {
    STR: [
      { skill: Skills.ATHLETICS, name: "Атлетика" }
    ],
    DEX: [
      { skill: Skills.ACROBATICS, name: "Акробатика" },
      { skill: Skills.SLEIGHT_OF_HAND, name: "Спритність рук" },
      { skill: Skills.STEALTH, name: "Непомітність" }
    ],
    INT: [
      { skill: Skills.ARCANA, name: "Магія" },
      { skill: Skills.HISTORY, name: "Історія" },
      { skill: Skills.INVESTIGATION, name: "Розслідування" },
      { skill: Skills.NATURE, name: "Природа" },
      { skill: Skills.RELIGION, name: "Релігія" }
    ],
    WIS: [
      { skill: Skills.ANIMAL_HANDLING, name: "Поводження з тваринами" },
      { skill: Skills.INSIGHT, name: "Аналіз поведінки" },
      { skill: Skills.MEDICINE, name: "Медицина" },
      { skill: Skills.PERCEPTION, name: "Уважність" },
      { skill: Skills.SURVIVAL, name: "Виживання" }
    ],
    CHA: [
      { skill: Skills.DECEPTION, name: "Обман" },
      { skill: Skills.INTIMIDATION, name: "Залякування" },
      { skill: Skills.PERFORMANCE, name: "Виступ" },
      { skill: Skills.PERSUASION, name: "Переконання" }
    ]
  };

  const abilityGroups = [
    { ability: "STR", name: "Сила", score: pers.str },
    { ability: "DEX", name: "Спритність", score: pers.dex },
    { ability: "INT", name: "Інтелект", score: pers.int },
    { ability: "WIS", name: "Мудрість", score: pers.wis },
    { ability: "CHA", name: "Харизма", score: pers.cha }
  ] as const;

  const getSkillProficiency = (skillName: Skills) => {
    const persSkill = pers.skills.find(ps => ps.name === skillName);
    return persSkill?.proficiencyType || 'NONE';
  };

  const calculateSkillModifier = (skillName: Skills, abilityScore: number) => {
    const abilityMod = getAbilityMod(abilityScore);
    const proficiency = getSkillProficiency(skillName);
    let total = abilityMod;
    if (proficiency === 'PROFICIENT') total += pb;
    if (proficiency === 'EXPERTISE') total += pb * 2;
    return { total, proficiency };
  };

  return (
    <div className="space-y-3">
      {abilityGroups.map(({ ability, name, score }) => (
        <Card key={ability} className="bg-white/10 border-purple-300/30 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between text-purple-50">
              <span>{name}</span>
              <span className="text-2xl font-bold text-purple-200">{formatModifier(getAbilityMod(score))}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {skillsByAbility[ability as keyof typeof skillsByAbility].map(({ skill, name: skillName }) => {
              const { total, proficiency } = calculateSkillModifier(skill, score);
              const isProficient = proficiency !== 'NONE';
              
              return (
                <div 
                  key={skill} 
                  className={`flex justify-between items-center border-b border-purple-400/20 last:border-0 py-1.5 ${!isProficient ? 'opacity-40' : ''}`}
                >
                  <span className="text-sm text-purple-100">{skillName}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-purple-200">{formatModifier(total)}</span>
                    {proficiency !== 'NONE' && (
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-purple-500/30 text-purple-100 border-purple-400/30">
                        {proficiency === 'EXPERTISE' ? 'Експ' : 'Проф'}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
