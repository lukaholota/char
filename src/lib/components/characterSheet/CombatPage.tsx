"use client";

import { PersWithRelations } from "@/lib/actions/pers";
import { Card, CardContent } from "@/components/ui/card";
import { getAbilityMod, formatModifier, getProficiencyBonus } from "@/lib/logic/utils";

export default function CombatPage({ pers }: { pers: PersWithRelations }) {
  const dexMod = getAbilityMod(pers.dex);
  const initiative = dexMod; 
  const pb = getProficiencyBonus(pers.level);
  const hitDice = `${pers.level}d${pers.class.hitDie}`;
  
  const ac = 10 + dexMod + (pers.wearsShield ? 2 : 0) + pers.additionalShieldBonus + pers.armorBonus;

  const attributes = [
    { name: "Сила", score: pers.str, key: "str" },
    { name: "Спритність", score: pers.dex, key: "dex" },
    { name: "Статура", score: pers.con, key: "con" },
    { name: "Інтелект", score: pers.int, key: "int" },
    { name: "Мудрість", score: pers.wis, key: "wis" },
    { name: "Харизма", score: pers.cha, key: "cha" },
  ] as const;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-emerald-500/20 border-emerald-400/40 backdrop-blur">
            <CardContent className="p-2 text-center flex flex-col justify-center items-center h-20">
                <div className="text-xs font-bold uppercase text-emerald-200">Ініціатива</div>
                <div className="text-2xl font-bold text-emerald-50">{formatModifier(initiative)}</div>
            </CardContent>
        </Card>
        <Card className="bg-rose-500/20 border-rose-400/40 backdrop-blur">
            <CardContent className="p-2 text-center flex flex-col justify-center items-center h-20">
                <div className="text-xs font-bold uppercase text-rose-200">ХП</div>
                <div className="text-2xl font-bold text-rose-50">{pers.currentHp}</div>
                <div className="text-xs text-rose-200">/ {pers.maxHp}</div>
            </CardContent>
        </Card>
        <Card className="bg-cyan-500/20 border-cyan-400/40 backdrop-blur">
            <CardContent className="p-2 text-center flex flex-col justify-center items-center h-20">
                <div className="text-xs font-bold uppercase text-cyan-200">Швидкість</div>
                <div className="text-xl font-bold text-cyan-50">30 фт</div>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-violet-500/20 border-violet-400/40 backdrop-blur">
            <CardContent className="p-2 text-center flex flex-col justify-center items-center h-20">
                <div className="text-xs font-bold uppercase text-violet-200">КЗ</div>
                <div className="text-2xl font-bold text-violet-50">{ac}</div>
            </CardContent>
        </Card>
        <Card className="bg-amber-500/20 border-amber-400/40 backdrop-blur">
            <CardContent className="p-2 text-center flex flex-col justify-center items-center h-20">
                <div className="text-xs font-bold uppercase text-amber-200">Хіт Дайси</div>
                <div className="text-xl font-bold text-amber-50">{hitDice}</div>
            </CardContent>
        </Card>
        <Card className="bg-indigo-500/20 border-indigo-400/40 backdrop-blur">
            <CardContent className="p-2 text-center flex flex-col justify-center items-center h-20">
                <div className="text-xs font-bold uppercase text-indigo-200">Майстерність</div>
                <div className="text-xl font-bold text-indigo-50">{formatModifier(pb)}</div>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {attributes.map((attr) => {
            const mod = getAbilityMod(attr.score);
            return (
                <Card key={attr.name} className="bg-white/10 border-purple-300/30 backdrop-blur">
                    <CardContent className="p-3 text-center">
                        <div className="text-xs font-bold uppercase text-purple-300">{attr.name}</div>
                        <div className="flex items-center justify-center gap-2">
                          <div className="text-xl font-bold text-purple-50">{attr.score}</div>
                          <div className="text-sm font-medium text-purple-200">
                              ({formatModifier(mod)})
                          </div>
                        </div>
                    </CardContent>
                </Card>
            );
        })}
      </div>
    </div>
  );
}
