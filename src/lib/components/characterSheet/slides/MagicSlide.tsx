"use client";

import { PersWithRelations } from "@/lib/actions/pers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAbilityMod, formatModifier, getProficiencyBonus } from "@/lib/logic/utils";
import { Sparkles } from "lucide-react";

interface MagicSlideProps {
  pers: PersWithRelations;
}

export default function MagicSlide({ pers }: MagicSlideProps) {
  const spellcastingAbility = pers.class?.primaryCastingStat;
  const pb = getProficiencyBonus(pers.level);
  
  let spellAttackBonus = 0;
  let spellSaveDC = 8;
  
  if (spellcastingAbility) {
    const abilityScore = pers[spellcastingAbility.toLowerCase() as keyof typeof pers] as number;
    const abilityMod = getAbilityMod(abilityScore);
    spellAttackBonus = abilityMod + pb;
    spellSaveDC = 8 + abilityMod + pb;
  }

  const spellsByLevel = [
    { level: 0, name: "Заклинання-заговори", spells: pers.spells.filter(s => s.level === 0) },
    { level: 1, name: "1 рівень", spells: pers.spells.filter(s => s.level === 1) },
    { level: 2, name: "2 рівень", spells: pers.spells.filter(s => s.level === 2) },
    { level: 3, name: "3 рівень", spells: pers.spells.filter(s => s.level === 3) },
    { level: 4, name: "4 рівень", spells: pers.spells.filter(s => s.level === 4) },
    { level: 5, name: "5 рівень", spells: pers.spells.filter(s => s.level === 5) },
  ];

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Spell Stats */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="glass-card bg-fuchsia-500/20 border-fuchsia-400/40">
          <CardContent className="p-3 text-center">
            <div className="text-[10px] font-bold uppercase tracking-wide text-fuchsia-300">Бонус атаки</div>
            <div className="text-2xl font-bold text-fuchsia-50 drop-shadow-[0_0_8px_rgba(217,70,239,0.4)]">{formatModifier(spellAttackBonus)}</div>
          </CardContent>
        </Card>
        <Card className="glass-card bg-fuchsia-500/20 border-fuchsia-400/40">
          <CardContent className="p-3 text-center">
            <div className="text-[10px] font-bold uppercase tracking-wide text-fuchsia-300">DC рятунку</div>
            <div className="text-2xl font-bold text-fuchsia-50 drop-shadow-[0_0_8px_rgba(217,70,239,0.4)]">{spellSaveDC}</div>
          </CardContent>
        </Card>
      </div>

      {/* Spell List */}
      <Card className="glass-card bg-white/5 border-purple-300/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-purple-50">
            <Sparkles className="w-5 h-5" />
            <span className="uppercase tracking-wide text-indigo-300">Заклинання</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {spellsByLevel.map(({ level, name, spells }) => {
            if (spells.length === 0) return null;
            
            return (
              <div key={level}>
                <div className="text-xs font-bold uppercase tracking-wide text-purple-300 mb-2">{name}</div>
                <div className="space-y-1">
                  {spells.map((spell) => (
                    <div
                      key={spell.spellId}
                      className="text-sm text-purple-100 border-b border-purple-400/20 last:border-0 py-1.5 hover:text-purple-50 transition cursor-pointer"
                    >
                      {spell.name}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {pers.spells.length === 0 && (
            <div className="text-purple-300/60 text-sm text-center py-8">Заклинання відсутні</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
