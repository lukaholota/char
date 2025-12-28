"use client";

import { PersWithRelations } from "@/lib/actions/pers";
import { Card, CardContent } from "@/components/ui/card";
import { getAbilityMod, formatModifier, getProficiencyBonus } from "@/lib/logic/utils";
import { Ability, Classes } from "@prisma/client";
import { attributesUkrShort, classTranslations } from "@/lib/refs/translation";
import { Heart, Shield, Sword, Edit3 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { applyHpChange, reviveCharacter, setDeathSaves } from "@/lib/actions/combat-actions";
import { updateCharacterAction } from "@/lib/actions/update-character";
import { LanguageTranslations } from "@/lib/refs/translation";
import { useModalBackButton } from "@/hooks/useModalBackButton";
import { toast } from "sonner";
import ModifyStatModal, { ModifyConfig } from "@/lib/components/characterSheet/ModifyStatModal";
import {
  hasStatBonuses,
  hasSimpleBonus,
  calculateFinalAC,
  calculateFinalSpeed,
  calculateFinalInitiative,
  calculateFinalProficiency,
  calculateFinalStat,
  calculateFinalModifier,
  calculateFinalSave,
  getStatBonus,
  getModifierBonus,
  getSaveBonus,
  getSimpleBonus,
} from "@/lib/logic/bonus-calculator";

interface MainStatsSlideProps {
  pers: PersWithRelations;
  onPersUpdate?: (next: PersWithRelations) => void;
  isReadOnly?: boolean;
}

export default function MainStatsSlide({ pers, onPersUpdate, isReadOnly }: MainStatsSlideProps) {
  const router = useRouter();
  const [isHpPending, startHpTransition] = useTransition();
  const [isDetailsPending, startDetailsTransition] = useTransition();

  // Bonus modification modal state
  const [modifyOpen, setModifyOpen] = useState(false);
  const [modifyConfig, setModifyConfig] = useState<ModifyConfig | null>(null);

  // Helper to open modify modal
  const openModify = useCallback((config: ModifyConfig) => {
    setModifyConfig(config);
    setModifyOpen(true);
  }, []);

  // Helper for pers updates
  const handlePersUpdate = useCallback((next: PersWithRelations) => {
    onPersUpdate?.(next);
  }, [onPersUpdate]);

  const [hpOpen, setHpOpen] = useState(false);
  const [hpMode, setHpMode] = useState<"damage" | "heal" | "temp">("damage");
  const [hpAmount, setHpAmount] = useState<string>("");

  const [localCurrentHp, setLocalCurrentHp] = useState<number>(() => pers.currentHp);
  const [localTempHp, setLocalTempHp] = useState<number>(() => (pers as any).tempHp ?? 0);
  const [localMaxHp, setLocalMaxHp] = useState<number>(() => pers.maxHp);
  const [deathSuccesses, setDeathSuccesses] = useState<number>(() => (pers as any).deathSaveSuccesses ?? 0);
  const [deathFailures, setDeathFailures] = useState<number>(() => (pers as any).deathSaveFailures ?? 0);
  const [isDead, setIsDead] = useState<boolean>(() => Boolean((pers as any).isDead));

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [languagesOpen, setLanguagesOpen] = useState(false);
  const [didInitDetails, setDidInitDetails] = useState(false);

  useModalBackButton(hpOpen, () => setHpOpen(false));
  useModalBackButton(languagesOpen, () => setLanguagesOpen(false));

  const [draftProficiencies, setDraftProficiencies] = useState<string>(() => String((pers as any).customProficiencies ?? ""));
  const [draftLanguages, setDraftLanguages] = useState<string>(() => String((pers as any).customLanguagesKnown ?? ""));
  const [draftTraits, setDraftTraits] = useState<string>(() => String(pers.personalityTraits ?? ""));
  const [draftIdeals, setDraftIdeals] = useState<string>(() => String(pers.ideals ?? ""));
  const [draftBonds, setDraftBonds] = useState<string>(() => String(pers.bonds ?? ""));
  const [draftFlaws, setDraftFlaws] = useState<string>(() => String(pers.flaws ?? ""));
  const [draftBackstory, setDraftBackstory] = useState<string>(() => String(pers.backstory ?? ""));
  const [draftNotes, setDraftNotes] = useState<string>(() => String(pers.notes ?? ""));
  const [draftAlignment, setDraftAlignment] = useState<string>(() => String((pers as any).alignment ?? ""));
  const [draftXp, setDraftXp] = useState<string>(() => String((pers as any).xp ?? 0));
  const [draftCp, setDraftCp] = useState<string>(() => String((pers as any).cp ?? "0"));
  const [draftEp, setDraftEp] = useState<string>(() => String((pers as any).ep ?? "0"));
  const [draftSp, setDraftSp] = useState<string>(() => String((pers as any).sp ?? "0"));
  const [draftGp, setDraftGp] = useState<string>(() => String((pers as any).gp ?? "0"));
  const [draftPp, setDraftPp] = useState<string>(() => String((pers as any).pp ?? "0"));

  const [selectedLanguages, setSelectedLanguages] = useState<Set<string>>(() => {
    const raw = String((pers as any).customLanguagesKnown ?? "");
    const tokens = raw
      .split(/[\n,]/g)
      .map((s) => s.trim())
      .filter(Boolean);
    return new Set(tokens);
  });

  useEffect(() => {
    setLocalCurrentHp(pers.currentHp);
    setLocalTempHp(Number.isFinite((pers as any).tempHp) ? Math.max(0, Math.trunc((pers as any).tempHp)) : 0);
    setLocalMaxHp(pers.maxHp);
    setDeathSuccesses(Number.isFinite((pers as any).deathSaveSuccesses) ? Math.max(0, Math.trunc((pers as any).deathSaveSuccesses)) : 0);
    setDeathFailures(Number.isFinite((pers as any).deathSaveFailures) ? Math.max(0, Math.trunc((pers as any).deathSaveFailures)) : 0);
    setIsDead(Boolean((pers as any).isDead));

    // Keep Detailed Info in sync if server data refreshes
    setDraftProficiencies(String((pers as any).customProficiencies ?? ""));
    setDraftLanguages(String((pers as any).customLanguagesKnown ?? ""));
    setDraftTraits(String(pers.personalityTraits ?? ""));
    setDraftIdeals(String(pers.ideals ?? ""));
    setDraftBonds(String(pers.bonds ?? ""));
    setDraftFlaws(String(pers.flaws ?? ""));
    setDraftBackstory(String(pers.backstory ?? ""));
    setDraftNotes(String(pers.notes ?? ""));
    setDraftAlignment(String((pers as any).alignment ?? ""));
    setDraftXp(String((pers as any).xp ?? 0));
    setDraftCp(String((pers as any).cp ?? "0"));
    setDraftEp(String((pers as any).ep ?? "0"));
    setDraftSp(String((pers as any).sp ?? "0"));
    setDraftGp(String((pers as any).gp ?? "0"));
    setDraftPp(String((pers as any).pp ?? "0"));
    setSelectedLanguages(() => {
      const raw = String((pers as any).customLanguagesKnown ?? "");
      const tokens = raw
        .split(/[\n,]/g)
        .map((s) => s.trim())
        .filter(Boolean);
      return new Set(tokens);
    });
    setDidInitDetails(true);
  }, [pers]);

  useEffect(() => {
    if (!didInitDetails) return;

    const isDirty =
      draftProficiencies !== String((pers as any).customProficiencies ?? "") ||
      draftLanguages !== String((pers as any).customLanguagesKnown ?? "") ||
      draftTraits !== String(pers.personalityTraits ?? "") ||
      draftIdeals !== String(pers.ideals ?? "") ||
      draftBonds !== String(pers.bonds ?? "") ||
      draftFlaws !== String(pers.flaws ?? "") ||
      draftBackstory !== String(pers.backstory ?? "") ||
      draftNotes !== String(pers.notes ?? "") ||
      draftAlignment !== String((pers as any).alignment ?? "") ||
      draftXp !== String((pers as any).xp ?? 0) ||
      draftCp !== String((pers as any).cp ?? "0") ||
      draftEp !== String((pers as any).ep ?? "0") ||
      draftSp !== String((pers as any).sp ?? "0") ||
      draftGp !== String((pers as any).gp ?? "0") ||
      draftPp !== String((pers as any).pp ?? "0");

    if (!isDirty) return;

    const handle = window.setTimeout(() => {
      // Save in background; don't block HP modal UX.
      startDetailsTransition(async () => {
        await updateCharacterAction({
          persId: pers.persId,
          data: {
            customProficiencies: draftProficiencies,
            customLanguagesKnown: draftLanguages,
            personalityTraits: draftTraits,
            ideals: draftIdeals,
            bonds: draftBonds,
            flaws: draftFlaws,
            backstory: draftBackstory,
            notes: draftNotes,
            alignment: draftAlignment,
            xp: parseInt(draftXp) || 0,
            cp: draftCp,
            ep: draftEp,
            sp: draftSp,
            gp: draftGp,
            pp: draftPp,
          },
        });
      });
    }, 2000);

    return () => window.clearTimeout(handle);
  }, [
    didInitDetails,
    draftProficiencies,
    draftLanguages,
    draftTraits,
    draftIdeals,
    draftBonds,
    draftFlaws,
    draftBackstory,
    draftNotes,
    draftAlignment,
    draftXp,
    draftCp,
    draftEp,
    draftSp,
    draftGp,
    draftPp,
    pers.persId,
    startDetailsTransition,
  ]);

  const pb = getProficiencyBonus(pers.level);
  
  // Calculate hit dice info per class
  const hitDiceInfo = useMemo(() => {
    const result: Array<{ className: string; current: number; max: number; hitDie: number }> = [];
    
    // Calculate main class level
    const multiclassLevelSum = pers.multiclasses?.reduce((acc, mc) => acc + mc.classLevel, 0) ?? 0;
    const mainClassLevel = pers.level - multiclassLevelSum;
    
    // Get stored hit dice or default to max
    const storedHitDice = (pers as unknown as { currentHitDice?: Record<string, number> }).currentHitDice ?? {};
    
    // Main class
    const mainClassName = classTranslations[pers.class.name as Classes] ?? pers.class.name;
    const mainCurrent = typeof storedHitDice[String(pers.class.classId)] === 'number'
      ? storedHitDice[String(pers.class.classId)]
      : mainClassLevel;
    result.push({
      className: mainClassName,
      current: Math.min(mainCurrent, mainClassLevel),
      max: mainClassLevel,
      hitDie: pers.class.hitDie,
    });
    
    // Multiclasses
    for (const mc of pers.multiclasses ?? []) {
      const mcClassName = classTranslations[mc.class.name as unknown as Classes] ?? 'Клас';
      const mcCurrent = typeof storedHitDice[String(mc.classId)] === 'number'
        ? storedHitDice[String(mc.classId)]
        : mc.classLevel;
      result.push({
        className: mcClassName,
        current: Math.min(mcCurrent, mc.classLevel),
        max: mc.classLevel,
        hitDie: mc.class.hitDie,
      });
    }
    
    return result;
  }, [pers]);
  
  // Format hit dice for display
  const hitDiceDisplay = useMemo(() => {
    if (hitDiceInfo.length === 1) {
      const hd = hitDiceInfo[0];
      return `${hd.current}/${hd.max} d${hd.hitDie}`;
    }
    // Multiclass: show each class separately
    return hitDiceInfo.map(hd => `${hd.current}/${hd.max}d${hd.hitDie}`).join(' | ');
  }, [hitDiceInfo]);

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

  const hpTitle = useMemo(() => {
    if (isDead) return "Персонаж мертвий";
    if (localCurrentHp <= 0) return "0 HP — кидки смерті";
    return "Здоров'я";
  }, [isDead, localCurrentHp]);

  const applyHp = () => {
    setHpOpen(false);
    const amount = Math.max(0, Math.trunc(Number(hpAmount)));
    if (!Number.isFinite(amount) || amount <= 0) return;

    // Optimistic update (mirror server logic in applyHpChange)
    const prev = {
      currentHp: localCurrentHp,
      tempHp: localTempHp,
      maxHp: localMaxHp,
      deathSaveSuccesses: deathSuccesses,
      deathSaveFailures: deathFailures,
      isDead,
    };

    const maxHp = Math.max(1, Math.trunc(Number(localMaxHp) || 1));
    const curHp = Math.max(0, Math.trunc(Number(localCurrentHp) || 0));
    const curTemp = Math.max(0, Math.trunc(Number(localTempHp) || 0));

    let nextHp = curHp;
    let nextTemp = curTemp;

    if (hpMode === "damage") {
      const dmgToTemp = Math.min(nextTemp, amount);
      nextTemp -= dmgToTemp;
      const remaining = amount - dmgToTemp;
      nextHp = Math.max(0, nextHp - remaining);
    } else if (hpMode === "heal") {
      nextHp = Math.min(maxHp, nextHp + amount);
    } else if (hpMode === "temp") {
      nextTemp = Math.max(nextTemp, amount);
    }

    const clearsDeath = nextHp > 0;

    setLocalCurrentHp(nextHp);
    setLocalTempHp(nextTemp);
    setLocalMaxHp(maxHp);
    if (clearsDeath) {
      setDeathSuccesses(0);
      setDeathFailures(0);
      setIsDead(false);
    }
    setHpAmount("");

    startHpTransition(async () => {
      const res = await applyHpChange({ persId: pers.persId, mode: hpMode, amount });
      if (!res.success) {
        // Rollback on failure
        setLocalCurrentHp(prev.currentHp);
        setLocalTempHp(prev.tempHp);
        setLocalMaxHp(prev.maxHp);
        setDeathSuccesses(prev.deathSaveSuccesses);
        setDeathFailures(prev.deathSaveFailures);
        setIsDead(prev.isDead);
        toast.error("Не вдалося оновити HP", { description: res.error });
        router.refresh();
        return;
      }
      setLocalCurrentHp(res.currentHp);
      setLocalTempHp(res.tempHp);
      setLocalMaxHp(res.maxHp);
      setDeathSuccesses(res.deathSaveSuccesses);
      setDeathFailures(res.deathSaveFailures);
      setIsDead(res.isDead);
      router.refresh();
    });
  };

  const setSaves = (nextSuccess: number, nextFail: number) => {
    const s = Math.max(0, Math.min(3, Math.trunc(nextSuccess)));
    const f = Math.max(0, Math.min(3, Math.trunc(nextFail)));

    // Optimistic update (mirror server logic in setDeathSaves)
    const prev = {
      currentHp: localCurrentHp,
      deathSaveSuccesses: deathSuccesses,
      deathSaveFailures: deathFailures,
      isDead,
    };

    if (isDead) {
      setDeathSuccesses(s);
      setDeathFailures(f);
    } else if (s >= 3) {
      setLocalCurrentHp(1);
      setDeathSuccesses(0);
      setDeathFailures(0);
      setIsDead(false);
    } else if (f >= 3) {
      setDeathSuccesses(s);
      setDeathFailures(f);
      setIsDead(true);
    } else {
      setDeathSuccesses(s);
      setDeathFailures(f);
    }

    startHpTransition(async () => {
      const res = await setDeathSaves({ persId: pers.persId, successes: s, failures: f });
      if (!res.success) {
        // Rollback on failure
        setLocalCurrentHp(prev.currentHp);
        setDeathSuccesses(prev.deathSaveSuccesses);
        setDeathFailures(prev.deathSaveFailures);
        setIsDead(prev.isDead);
        toast.error("Не вдалося оновити кидки смерті", { description: res.error });
        router.refresh();
        return;
      }
      setLocalCurrentHp(res.currentHp);
      setDeathSuccesses(res.deathSaveSuccesses);
      setDeathFailures(res.deathSaveFailures);
      setIsDead(res.isDead);
      router.refresh();
    });
  };

  const CircleRow = ({
    count,
    onChange,
    tone,
    label,
  }: {
    count: number;
    onChange: (next: number) => void;
    tone: "emerald" | "rose";
    label: string;
  }) => {
    return (
      <div className="space-y-1">
        <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">{label}</div>
        <div className="flex items-center gap-2">
          {Array.from({ length: 3 }, (_, idx) => {
            const filled = idx < count;
            return (
              <button
                key={idx}
                type="button"
                disabled={isHpPending}
                onClick={() => {
                  const next = filled && idx === count - 1 ? idx : idx + 1;
                  onChange(next);
                }}
                className={
                  "h-8 w-8 rounded-full border transition " +
                  (filled
                    ? tone === "emerald"
                      ? "border-emerald-400/50 bg-emerald-500/25"
                      : "border-rose-400/50 bg-rose-500/25"
                    : "border-white/10 bg-white/5 hover:bg-white/10")
                }
                aria-label={`${label}: ${idx + 1}`}
                title="Натисни, щоб позначити"
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-4 p-4">
      {/* HERO SECTION: Combat Stats (HP, AC, Initiative) */}
      <div className="grid grid-cols-3 gap-2">
        <button 
          type="button" 
          onClick={() => !isReadOnly && openModify({ type: 'simple', field: 'ac' })} 
          className={`text-left ${isReadOnly ? 'cursor-default' : ''}`}
        >
          <Card className={`glass-card bg-indigo-500/15 border-indigo-500/40 h-24 ${!isReadOnly ? 'hover:bg-indigo-500/25 transition' : ''} ${hasSimpleBonus(pers, 'ac') ? 'ring-1 ring-indigo-400/50' : ''}`}>
            <CardContent className="p-2 flex flex-col items-center justify-center h-full">
              <div className="text-[9px] font-bold uppercase tracking-wide text-indigo-300">Клас Броні</div>
              <div className="text-3xl font-bold text-white mt-1">{calculateFinalAC(pers)}</div>
              <Shield className="w-4 h-4 text-indigo-400 opacity-60 mt-1" />
            </CardContent>
          </Card>
        </button>

        <button 
          type="button" 
          onClick={() => !isReadOnly && setHpOpen(true)} 
          className={`text-left ${isReadOnly ? 'cursor-default' : ''}`}
        >
          <Card className={`glass-card bg-rose-500/20 border-rose-500/50 h-24 ${!isReadOnly ? 'hover:bg-rose-500/25 transition' : ''}`}>
            <CardContent className="p-2 flex flex-col items-center justify-center h-full">
              <div className="text-[9px] font-bold uppercase tracking-wide text-rose-300 text-center">{hpTitle}</div>
              <div className="text-4xl font-black text-white mt-1">{localCurrentHp}</div>
              <div className="text-[11px] text-rose-400">/ {localMaxHp}</div>
              {localTempHp > 0 ? (
                <div className="text-[9px] text-slate-200/80">Тимч.: +{localTempHp}</div>
              ) : null}
            </CardContent>
          </Card>
        </button>

        <button 
          type="button" 
          onClick={() => !isReadOnly && openModify({ type: 'simple', field: 'initiative' })} 
          className={`text-left ${isReadOnly ? 'cursor-default' : ''}`}
        >
          <Card className={`glass-card bg-emerald-500/15 border-emerald-500/40 h-24 ${!isReadOnly ? 'hover:bg-emerald-500/25 transition' : ''} ${hasSimpleBonus(pers, 'initiative') ? 'ring-1 ring-emerald-400/50' : ''}`}>
            <CardContent className="p-2 flex flex-col items-center justify-center h-full">
              <div className="text-[9px] font-bold uppercase tracking-wide text-emerald-300">Ініціатива</div>
              <div className="text-3xl font-bold text-white mt-1">{formatModifier(calculateFinalInitiative(pers))}</div>
            </CardContent>
          </Card>
        </button>
      </div>

      {/* SECONDARY STATS ROW: Speed, Hit Dice, Proficiency */}
      <div className="grid grid-cols-3 gap-2">
        <button 
          type="button" 
          onClick={() => !isReadOnly && openModify({ type: 'simple', field: 'speed' })} 
          className={`text-left ${isReadOnly ? 'cursor-default' : ''}`}
        >
          <Card className={`glass-card bg-cyan-500/15 border-cyan-400/40 h-16 ${!isReadOnly ? 'hover:bg-cyan-500/25 transition' : ''} ${hasSimpleBonus(pers, 'speed') ? 'ring-1 ring-cyan-400/50' : ''}`}>
            <CardContent className="p-2 flex flex-col items-center justify-center h-full">
              <div className="text-[9px] font-bold uppercase tracking-wide text-cyan-300">Швидкість</div>
              <div className="text-xl font-bold text-cyan-50">{calculateFinalSpeed(pers)}</div>
            </CardContent>
          </Card>
        </button>
        <Card className="glass-card bg-amber-500/15 border-amber-400/40 h-16">
          <CardContent className="p-2 flex flex-col items-center justify-center h-full">
            <div className="text-[9px] font-bold uppercase tracking-wide text-amber-300">Хіт Дайси</div>
            <div className="text-lg font-bold text-amber-50 text-center leading-tight">{hitDiceDisplay}</div>
          </CardContent>
        </Card>
        <button 
          type="button" 
          onClick={() => !isReadOnly && openModify({ type: 'simple', field: 'proficiency' })} 
          className={`text-left ${isReadOnly ? 'cursor-default' : ''}`}
        >
          <Card className={`glass-card bg-indigo-500/15 border-indigo-400/40 h-16 ${!isReadOnly ? 'hover:bg-indigo-500/25 transition' : ''} ${hasSimpleBonus(pers, 'proficiency') ? 'ring-1 ring-indigo-400/50' : ''}`}>
            <CardContent className="p-2 flex flex-col items-center justify-center h-full">
              <div className="text-[9px] font-bold uppercase tracking-wide text-indigo-300">Майстерність</div>
              <div className="text-xl font-bold text-indigo-50">{formatModifier(calculateFinalProficiency(pers))}</div>
            </CardContent>
          </Card>
        </button>
      </div>

      {/* ABILITY SCORES GRID (Perfectly Balanced Layout) */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {attributes.map((attr) => {
          const ability = abilityByKey[attr.key];
          const hasSaveProficiency = savingThrows.includes(ability);

          return (
            <button
              key={attr.name}
              type="button"
              onClick={() => !isReadOnly && openModify({ type: 'stat', ability: abilityByKey[attr.key] })}
              className={`text-left ${isReadOnly ? 'cursor-default' : ''}`}
            >
              <Card className={`glass-card bg-slate-900/60 ${attr.borderColor} border h-14 ${!isReadOnly ? 'hover:bg-slate-800/60 transition' : ''} ${hasStatBonuses(pers, abilityByKey[attr.key]) ? 'ring-1 ring-white/30' : ''}`}>
                <CardContent className="h-full px-1 py-1 grid grid-cols-[1fr_auto_1fr] items-center gap-0">
                  {/* Left: Ability Name & Score */}
                  <div className="flex flex-col items-center justify-center gap-0">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{attr.name}</span>
                    <span className="text-[9px] font-mono text-slate-500">
                      {calculateFinalStat(pers, abilityByKey[attr.key])}
                    </span>
                  </div>

                  {/* Center: Modifier (Main Focus) */}
                  <div className="flex items-center justify-center w-6">
                    <span className="text-2xl font-black text-white tracking-tight">
                      {formatModifier(calculateFinalModifier(pers, abilityByKey[attr.key]))}
                    </span>
                  </div>

                  {/* Right: Saving Throw */}
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <span className="text-[8px] text-slate-500 uppercase tracking-tighter">РятК</span>
                    <div className="flex items-center gap-1">
                      <span className={`text-xs font-bold ${
                        hasSaveProficiency ? "text-indigo-400" : "text-slate-400"
                      }`}>
                        {formatModifier(calculateFinalSave(pers, abilityByKey[attr.key], savingThrows))}
                      </span>
                      {hasSaveProficiency && (
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_5px_rgba(99,102,241,0.5)]" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      <Dialog open={hpOpen} onOpenChange={setHpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Хіт Поїнти</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
              <div className="text-xs text-slate-300">Поточне: <span className="font-semibold text-slate-50">{localCurrentHp}</span> / {localMaxHp}</div>
              <div className="text-xs text-slate-300">Тимчасове: <span className="font-semibold text-slate-50">{localTempHp}</span></div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={hpMode === "damage" ? "default" : "secondary"}
                disabled={isHpPending}
                onClick={() => setHpMode("damage")}
                className={hpMode === "damage" ? "bg-rose-500/30 border text-slate-200 border-rose-400/40 hover:bg-rose-500/50" : "hover:bg-rose-500/50"}
              >
                <Sword className="h-4 w-4 mr-2" />
                Шкода
              </Button>
              <Button
                type="button"
                variant={hpMode === "heal" ? "default" : "secondary"}
                disabled={isHpPending}
                onClick={() => setHpMode("heal")}
                className={hpMode === "heal" ? "bg-emerald-500/25 border border-emerald-400/40 text-slate-200 hover:bg-emerald-500/50" : "hover:bg-emerald-500/50"}
              >
                <Heart className="h-4 w-4 mr-2" />
                Лікування
              </Button>
              <Button
                type="button"
                variant={hpMode === "temp" ? "default" : "secondary"}
                disabled={isHpPending}
                onClick={() => setHpMode("temp")}
                className={hpMode === "temp" ? "bg-blue-500/25 border border-blue-400/40 text-slate-200 hover:bg-blue-500/50" : "hover:bg-blue-500/50"}
              >
                <Shield className="h-4 w-4 mr-2" />
                Тимч.
              </Button>
            </div>

            <div className="space-y-2">
              <Input
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Введи число"
                value={hpAmount}
                onChange={(e) => setHpAmount(e.target.value)}
                disabled={isHpPending}
              />
              <Button type="button" onClick={applyHp} disabled={isHpPending || !hpAmount || Number(hpAmount) <= 0} className="w-full bg-slate-300 hover:bg-slate-200 text-slate-900">
                Застосувати
              </Button>
            </div>

            {localCurrentHp <= 0 ? (
              <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3 space-y-3">
                <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Кидки смерті</div>
                <div className="grid grid-cols-2 gap-3">
                  <CircleRow
                    count={deathSuccesses}
                    tone="emerald"
                    label="Успіхи"
                    onChange={(next) => {
                      setSaves(next, deathFailures);
                    }}
                  />
                  <CircleRow
                    count={deathFailures}
                    tone="rose"
                    label="Провали"
                    onChange={(next) => {
                      setSaves(deathSuccesses, next);
                    }}
                  />
                </div>
                {isDead && (
                <div className="flex items-center justify-center">
                    <Button
                    type="button"
                    variant="destructive"
                    disabled={isHpPending}
                    onClick={() => {
                      const prev = {
                        currentHp: localCurrentHp,
                        deathSaveSuccesses: deathSuccesses,
                        deathSaveFailures: deathFailures,
                        isDead,
                      };

                      // Optimistic revive
                      setLocalCurrentHp(1);
                      setDeathSuccesses(0);
                      setDeathFailures(0);
                      setIsDead(false);

                      startHpTransition(async () => {
                        const res = await reviveCharacter({ persId: pers.persId });
                        if (!res.success) {
                          // Rollback on failure
                          setLocalCurrentHp(prev.currentHp);
                          setDeathSuccesses(prev.deathSaveSuccesses);
                          setDeathFailures(prev.deathSaveFailures);
                          setIsDead(prev.isDead);
                          toast.error("Не вдалося відродити персонажа", { description: res.error });
                          router.refresh();
                          return;
                        }
                        setLocalCurrentHp(res.currentHp);
                        setDeathSuccesses(res.deathSaveSuccesses);
                        setDeathFailures(res.deathSaveFailures);
                        setIsDead(res.isDead);
                        router.refresh();
                      });
                    }}
                    className="flex justify-center items-center"
                  >
                    Відродити (1 HP)
                  </Button>
                </div>
                  
                )}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <div className="mt-auto">
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => setDetailsOpen((v) => !v)}
        >
          Детальна інформація
        </Button>

        {detailsOpen ? (
          <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/40 p-3 space-y-3">
            {/* Alignment & XP */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200">Світогляд</div>
                <Input
                  value={draftAlignment}
                  onChange={(e) => setDraftAlignment(e.target.value)}
                  disabled={isDetailsPending || isReadOnly}
                  className="bg-slate-950/40 border-white/10 text-slate-100"
                  placeholder={isReadOnly ? "" : "Напр.: Законний добрий"}
                  maxLength={100}
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200">Досвід (XP)</div>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={draftXp}
                  onChange={(e) => setDraftXp(e.target.value)}
                  disabled={isDetailsPending || isReadOnly}
                  className="bg-slate-950/40 border-white/10 text-slate-100"
                  placeholder="0"
                  min={0}
                />
              </div>
            </div>

            {/* Coins */}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-200">Монети</div>
              <div className="grid grid-cols-5 gap-2">
                <div className="space-y-0.5">
                  <div className="text-[10px] text-center text-amber-600 font-bold">CP</div>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={draftCp}
                    onChange={(e) => setDraftCp(e.target.value)}
                    disabled={isDetailsPending || isReadOnly}
                    className="bg-slate-950/40 border-white/10 text-slate-100 text-center text-sm px-1"
                    min={0}
                  />
                </div>
                <div className="space-y-0.5">
                  <div className="text-[10px] text-center text-slate-400 font-bold">EP</div>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={draftEp}
                    onChange={(e) => setDraftEp(e.target.value)}
                    disabled={isDetailsPending || isReadOnly}
                    className="bg-slate-950/40 border-white/10 text-slate-100 text-center text-sm px-1"
                    min={0}
                  />
                </div>
                <div className="space-y-0.5">
                  <div className="text-[10px] text-center text-slate-300 font-bold">SP</div>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={draftSp}
                    onChange={(e) => setDraftSp(e.target.value)}
                    disabled={isDetailsPending || isReadOnly}
                    className="bg-slate-950/40 border-white/10 text-slate-100 text-center text-sm px-1"
                    min={0}
                  />
                </div>
                <div className="space-y-0.5">
                  <div className="text-[10px] text-center text-yellow-400 font-bold">GP</div>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={draftGp}
                    onChange={(e) => setDraftGp(e.target.value)}
                    disabled={isDetailsPending || isReadOnly}
                    className="bg-slate-950/40 border-white/10 text-slate-100 text-center text-sm px-1"
                    min={0}
                  />
                </div>
                <div className="space-y-0.5">
                  <div className="text-[10px] text-center text-cyan-300 font-bold">PP</div>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={draftPp}
                    onChange={(e) => setDraftPp(e.target.value)}
                    disabled={isDetailsPending || isReadOnly}
                    className="bg-slate-950/40 border-white/10 text-slate-100 text-center text-sm px-1"
                    min={0}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-200">Профіцієнції (броня/зброя/інструменти)</div>
              <textarea
                value={draftProficiencies}
                onChange={(e) => setDraftProficiencies(e.target.value)}
                disabled={isDetailsPending || isReadOnly}
                className="w-full min-h-[64px] rounded-md border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-white/20"
                placeholder={isReadOnly ? "" : "Напр.: Легка/середня броня, прості мечі, інструменти злодія"}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-slate-200">Мови</div>
                <Button type="button" size="sm" variant="secondary" onClick={() => setLanguagesOpen(true)}>
                  Показати мови
                </Button>
              </div>
              <textarea
                value={draftLanguages}
                onChange={(e) => setDraftLanguages(e.target.value)}
                disabled={isDetailsPending || isReadOnly}
                className="w-full min-h-[56px] rounded-md border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-white/20"
                placeholder={isReadOnly ? "" : "Напр.: Загальна, Ельфійська"}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200">Риси характеру</div>
                <textarea
                  value={draftTraits}
                  onChange={(e) => setDraftTraits(e.target.value)}
                  disabled={isDetailsPending}
                  className="w-full min-h-[64px] rounded-md border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-white/20"
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200">Ідеали</div>
                <textarea
                  value={draftIdeals}
                  onChange={(e) => setDraftIdeals(e.target.value)}
                  disabled={isDetailsPending}
                  className="w-full min-h-[64px] rounded-md border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-white/20"
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200">Прив’язаності</div>
                <textarea
                  value={draftBonds}
                  onChange={(e) => setDraftBonds(e.target.value)}
                  disabled={isDetailsPending}
                  className="w-full min-h-[64px] rounded-md border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-white/20"
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200">Вади</div>
                <textarea
                  value={draftFlaws}
                  onChange={(e) => setDraftFlaws(e.target.value)}
                  disabled={isDetailsPending}
                  className="w-full min-h-[64px] rounded-md border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-white/20"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-200">Передісторія</div>
              <textarea
                value={draftBackstory}
                onChange={(e) => setDraftBackstory(e.target.value)}
                disabled={isDetailsPending}
                className="w-full min-h-[120px] rounded-md border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-200">Нотатки</div>
              <textarea
                value={draftNotes}
                onChange={(e) => setDraftNotes(e.target.value)}
                disabled={isDetailsPending}
                className="w-full min-h-[120px] rounded-md border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>
          </div>
        ) : null}
      </div>

      <Dialog open={languagesOpen} onOpenChange={setLanguagesOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Мови</DialogTitle>
          </DialogHeader>

          <div className="max-h-[50vh] overflow-y-auto space-y-2">
            {Object.entries(LanguageTranslations).map(([key, label]) => {
              const checked = selectedLanguages.has(label) || selectedLanguages.has(key);
              return (
                <label key={key} className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setSelectedLanguages((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(label);
                        else next.delete(label);
                        return next;
                      });
                    }}
                  />
                  <span className="text-sm text-slate-100">{label}</span>
                </label>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setLanguagesOpen(false)}>
              Закрити
            </Button>
            <Button
              type="button"
              onClick={() => {
                const list = Array.from(selectedLanguages);
                const text = list.join(", ");
                setDraftLanguages(text);
                setLanguagesOpen(false);
              }}
            >
              Підставити
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modify Stat Modal */}
      <ModifyStatModal
        open={modifyOpen}
        onOpenChange={setModifyOpen}
        pers={pers}
        onPersUpdate={handlePersUpdate}
        config={modifyConfig}
      />
    </div>
  );
}
