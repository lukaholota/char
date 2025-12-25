"use client";

import { PersWithRelations } from "@/lib/actions/pers";
import { Card, CardContent } from "@/components/ui/card";
import { getAbilityMod, formatModifier, getProficiencyBonus } from "@/lib/logic/utils";
import { Ability } from "@prisma/client";
import {
  attributesUkrShort,
  backgroundTranslations,
  classTranslations,
  raceTranslations,
  subclassTranslations,
  subraceTranslations,
} from "@/lib/refs/translation";
import { Shield } from "lucide-react";
import { useMemo, useState } from "react";
import { EntityInfoDialog, type EntityInfoKind } from "@/lib/components/characterSheet/EntityInfoDialog";

interface MainStatsSlideProps {
  pers: PersWithRelations;
}

export default function MainStatsSlide({ pers }: MainStatsSlideProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKind, setDialogKind] = useState<EntityInfoKind>("race");

  const raceName = useMemo(
    () => raceTranslations[pers.race.name as keyof typeof raceTranslations] || pers.race.name,
    [pers.race.name]
  );
  const className = useMemo(
    () => classTranslations[pers.class.name as keyof typeof classTranslations] || pers.class.name,
    [pers.class.name]
  );
  const subclassName = useMemo(() => {
    if (!pers.subclass) return null;
    return subclassTranslations[pers.subclass.name as keyof typeof subclassTranslations] || pers.subclass.name;
  }, [pers.subclass]);
  const subraceName = useMemo(() => {
    if (!pers.subrace) return null;
    return subraceTranslations[pers.subrace.name as keyof typeof subraceTranslations] || pers.subrace.name;
  }, [pers.subrace]);
  const backgroundName = useMemo(
    () => backgroundTranslations[pers.background.name as keyof typeof backgroundTranslations] || pers.background.name,
    [pers.background.name]
  );

  const dexMod = getAbilityMod(pers.dex);
  const initiative = dexMod;
  const pb = getProficiencyBonus(pers.level);
  const hitDice = `${pers.level}d${pers.class.hitDie}`;
  const ac = 10 + dexMod + (pers.wearsShield ? 2 : 0) + pers.additionalShieldBonus + pers.armorBonus;

  // Get saving throw proficiencies
  const savingThrows: Ability[] = pers.class.savingThrows ?? [];

  const attributes = [
    { name: attributesUkrShort.STR, fullName: "Сила", score: pers.str, key: "str", borderColor: "border-red-500/40" },
    { name: attributesUkrShort.DEX, fullName: "Спритність", score: pers.dex, key: "dex", borderColor: "border-green-500/40" },
    { name: attributesUkrShort.CON, fullName: "Статура", score: pers.con, key: "con", borderColor: "border-orange-500/40" },
    { name: attributesUkrShort.INT, fullName: "Інтелект", score: pers.int, key: "int", borderColor: "border-blue-500/40" },
    { name: attributesUkrShort.WIS, fullName: "Мудрість", score: pers.wis, key: "wis", borderColor: "border-purple-500/40" },
    { name: attributesUkrShort.CHA, fullName: "Харизма", score: pers.cha, key: "cha", borderColor: "border-pink-500/40" },
  ] as const;

  const abilityByKey: Record<(typeof attributes)[number]["key"], Ability> = {
    str: Ability.STR,
    dex: Ability.DEX,
    con: Ability.CON,
    int: Ability.INT,
    wis: Ability.WIS,
    cha: Ability.CHA,
  };

  const openEntity = (kind: EntityInfoKind) => {
    setDialogKind(kind);
    setDialogOpen(true);
  };

  const dialog = useMemo(() => {
    if (dialogKind === "race") {
      return {
        kind: "race" as const,
        title: raceName,
        subtitle: subraceName || undefined,
        entity: pers.race,
      };
    }
    if (dialogKind === "class") {
      return {
        kind: "class" as const,
        title: className,
        subtitle: subclassName || undefined,
        entity: pers.class,
      };
    }
    return {
      kind: "background" as const,
      title: backgroundName,
      subtitle: undefined,
      entity: pers.background,
    };
  }, [backgroundName, className, dialogKind, pers.background, pers.class, pers.race, raceName, subclassName, subraceName]);

  return (
    <div className="h-full flex flex-col gap-4 p-4">
      {/* Race/Class/Background cards (click = modal) */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => openEntity("race")}
          className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition px-3 py-2 text-left"
        >
          <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Раса</div>
          <div className="text-sm font-semibold text-slate-50 truncate">{raceName}</div>
          {subraceName ? <div className="text-xs text-slate-300/70 truncate">{subraceName}</div> : null}
        </button>

        <button
          type="button"
          onClick={() => openEntity("class")}
          className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition px-3 py-2 text-left"
        >
          <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Клас</div>
          <div className="text-sm font-semibold text-slate-50 truncate">{className}</div>
          {subclassName ? <div className="text-xs text-slate-300/70 truncate">{subclassName}</div> : null}
        </button>

        <button
          type="button"
          onClick={() => openEntity("background")}
          className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition px-3 py-2 text-left"
        >
          <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Передісторія</div>
          <div className="text-sm font-semibold text-slate-50 truncate">{backgroundName}</div>
          <div className="text-xs text-slate-300/70 truncate">Рівень {pers.level}</div>
        </button>
      </div>

      {/* HERO SECTION: Combat Stats (HP, AC, Initiative) */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="glass-card bg-indigo-500/15 border-indigo-500/40 h-28">
          <CardContent className="p-3 flex flex-col items-center justify-center h-full">
            <div className="text-xs font-bold uppercase tracking-wide text-indigo-300">Клас Броні</div>
            <div className="text-4xl font-bold text-white mt-1">{ac}</div>
            <Shield className="w-4 h-4 text-indigo-400 opacity-60 mt-1" />
          </CardContent>
        </Card>

        <Card className="glass-card bg-rose-500/20 border-rose-500/50 h-28">
          <CardContent className="p-3 flex flex-col items-center justify-center h-full">
            <div className="text-xs font-bold uppercase tracking-wide text-rose-300">Здоров&apos;я</div>
            <div className="text-5xl font-black text-white mt-1">{pers.currentHp}</div>
            <div className="text-xs text-rose-400">/ {pers.maxHp}</div>
          </CardContent>
        </Card>

        <Card className="glass-card bg-emerald-500/15 border-emerald-500/40 h-28">
          <CardContent className="p-3 flex flex-col items-center justify-center h-full">
            <div className="text-xs font-bold uppercase tracking-wide text-emerald-300">Ініціатива</div>
            <div className="text-4xl font-bold text-white mt-1">{formatModifier(initiative)}</div>
          </CardContent>
        </Card>
      </div>

      {/* SECONDARY STATS ROW: Speed, Hit Dice, Proficiency */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="glass-card bg-cyan-500/15 border-cyan-400/40 h-20">
          <CardContent className="p-2 flex flex-col items-center justify-center h-full">
            <div className="text-[10px] font-bold uppercase tracking-wide text-cyan-300">Швидкість</div>
            <div className="text-2xl font-bold text-cyan-50">30</div>
          </CardContent>
        </Card>
        <Card className="glass-card bg-amber-500/15 border-amber-400/40 h-20">
          <CardContent className="p-2 flex flex-col items-center justify-center h-full">
            <div className="text-[10px] font-bold uppercase tracking-wide text-amber-300">Хіт Дайси</div>
            <div className="text-2xl font-bold text-amber-50">{hitDice}</div>
          </CardContent>
        </Card>
        <Card className="glass-card bg-indigo-500/15 border-indigo-400/40 h-20">
          <CardContent className="p-2 flex flex-col items-center justify-center h-full">
            <div className="text-[10px] font-bold uppercase tracking-wide text-indigo-300">Майстерність</div>
            <div className="text-2xl font-bold text-indigo-50">{formatModifier(pb)}</div>
          </CardContent>
        </Card>
      </div>

      {/* ABILITY SCORES GRID (Perfectly Balanced Layout) */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {attributes.map((attr) => {
          const mod = getAbilityMod(attr.score);
          const hasSaveProficiency = savingThrows.includes(abilityByKey[attr.key]);
          const saveBonus = mod + (hasSaveProficiency ? pb : 0);

          return (
            <Card key={attr.name} className={`glass-card bg-slate-900/60 ${attr.borderColor} border h-18`}>
              <CardContent className="h-full px-1 py-2 grid grid-cols-[1fr_auto_1fr] items-center gap-0">
                {/* Left: Ability Name & Score */}
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{attr.name}</span>
                  <span className="text-[10px] font-mono text-slate-500">{attr.score}</span>
                </div>

                {/* Center: Modifier (Main Focus) */}
                <div className="flex items-center justify-center w-14">
                  <span className="text-3xl font-black text-white tracking-tight">{formatModifier(mod)}</span>
                </div>

                {/* Right: Saving Throw */}
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <span className="text-[9px] text-slate-500 uppercase tracking-tighter">Сейв</span>
                  <div className="flex items-center gap-1">
                    <span className={`text-xs font-bold ${
                      hasSaveProficiency ? "text-indigo-400" : "text-slate-400"
                    }`}>
                      {formatModifier(saveBonus)}
                    </span>
                    {hasSaveProficiency && (
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_5px_rgba(99,102,241,0.5)]" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <EntityInfoDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        kind={dialog.kind}
        title={dialog.title}
        subtitle={dialog.subtitle}
        entity={dialog.entity}
      />
    </div>
  );
}
