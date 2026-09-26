"use client";

import { PersWithRelations } from "@/lib/actions/pers";
import { Card, CardContent } from "@/components/ui/card";
import { formatModifier } from "@/lib/logic/utils";
import { Ability } from "@/lib/prisma-enums";
import { attributesUkrShort, damageTypeTranslations } from "@/lib/refs/translation";
import { Heart, Shield, Sword } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { memo, useEffect, useMemo, useState, useTransition, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  applyHpChange,
  reviveCharacter,
  setCanStackHeroicInspiration,
  setDeathSaves,
  setHeroicInspirationCount,
} from "@/lib/actions/combat-actions";
import { HeroicInspirationRow } from "@/lib/components/characterSheet/HeroicInspirationRow";
import { grantsHeroicInspirationOnLongRest, limitHeroicInspirationCount } from "@/rules/heroic-inspiration";
import { applyOfflineOperation, type OfflineOperation, type OfflinePersState } from "@/lib/offline/operations";
import { createOperationId } from "@/lib/offline/queue";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { updateCharacterAction } from "@/lib/actions/update-character";
import { LanguageTranslations, toolTranslations } from "@/lib/refs/translation";
import { TermPickerDialog } from "@/lib/components/characterSheet/TermPickerDialog";
import { toast } from "sonner";
import ModifyStatModal, { ModifyConfig } from "@/lib/components/characterSheet/ModifyStatModal";
import HitDiceDialog from "@/lib/components/characterSheet/HitDiceDialog";
import { collectPersHitDicePools, formatHitDicePools } from "@/lib/logic/pers-hit-dice";
import {
  appendMissingProficiencies,
  appendToolProficiencies,
  calculatePersProficiencies,
  findMentionedTerms,
  splitTermTokens,
} from "@/lib/logic/pers-proficiencies";
import {
  hasStatBonuses,
  hasSimpleBonus,
  calculateFinalAC,
  calculateFinalSpeed,
  calculatePassiveSkill,
  calculateDamageResistances,
  calculateDarkvisionRange,
  calculateFinalInitiative,
  calculateFinalProficiency,
  calculateFinalStat,
  calculateFinalModifier,
  calculateFinalSave,
  calculateAbilityCheckBonus,
} from "@/lib/logic/bonus-calculator";
import { describeAbilityRollStates, describeRollState, findStateValueTone } from "@/lib/logic/state-labels";
import { useSheetStatesContext } from "@/lib/components/characterSheet/states/SheetStatesContext";
import {
  BEAST_HITPOINTS_RING,
  hasBeastHitPoints,
  BEAST_VALUE_RING,
  OwnValue,
  isBeastAbility,
  type BeastFormView,
} from "@/lib/components/characterSheet/BeastFormMarks";
import { BeastHitPointsDialog } from "@/lib/components/characterSheet/BeastHitPointsDialog";
import { useDiceUIStore } from "@/lib/stores/diceUIStore";
import { D20Icon } from "@/lib/components/icons/D20Icon";
import { buildAbilityRollContext, buildInitiativeRollContext } from "@/lib/components/dice/roll-contexts";
import { AbilityScoreCard } from "@/lib/components/characterSheet/AbilityScoreCard";
import { useLongPress } from "@/hooks/useLongPress";
import { PASSIVE_SKILLS } from "@/lib/components/characterSheet/passive-skills";

interface MainStatsSlideProps {
  pers: PersWithRelations;
  onPersUpdate?: (next: PersWithRelations) => void;
  isReadOnly?: boolean;
  /// Другий шар: `pers` уже підмінений, а звідси беруться позначки й власні числа поруч.
  beastForm?: BeastFormView;
}

const MainStatsSlide = memo(function MainStatsSlide({ pers, onPersUpdate, isReadOnly, beastForm }: MainStatsSlideProps) {
  /// Правки завжди пишуться у власний лист, а не в синтетичний: інакше «зберегти» записало б
  /// персонажу характеристики ведмедя.
  const editablePers = beastForm?.ownPers ?? pers;
  const openRoll = useDiceUIStore((state) => state.openRoll);
  /// Стос хітів звіра має лише 2014: у 2024 блок лишається власним і редагується як завжди.
  const beastHitPoints = hasBeastHitPoints(beastForm);
  const [beastHpOpen, setBeastHpOpen] = useState(false);
  const router = useRouter();
  const persId = pers.persId;
  const sheetStates = useSheetStatesContext();
  const { commitOperation } = useOfflineQueue();
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

  const editInitiative = !isReadOnly && !beastForm ? () => openModify({ type: 'simple', field: 'initiative' }) : undefined;
  const initiativeLongPress = useLongPress(editInitiative);

  // Helper for pers updates
  const handlePersUpdate = useCallback((next: PersWithRelations) => {
    onPersUpdate?.(next);
  }, [onPersUpdate]);

  const [hpOpen, setHpOpen] = useState(false);
  const [hitDiceOpen, setHitDiceOpen] = useState(false);
  const [hpMode, setHpMode] = useState<"damage" | "heal" | "temp">("damage");
  const [hpAmount, setHpAmount] = useState<string>("");

  const [localCurrentHp, setLocalCurrentHp] = useState<number>(() => pers.currentHp);
  const [localTempHp, setLocalTempHp] = useState<number>(() => (pers as any).tempHp ?? 0);
  const [localMaxHp, setLocalMaxHp] = useState<number>(() => pers.maxHp);
  const [deathSuccesses, setDeathSuccesses] = useState<number>(() => (pers as any).deathSaveSuccesses ?? 0);
  const [deathFailures, setDeathFailures] = useState<number>(() => (pers as any).deathSaveFailures ?? 0);
  const [isDead, setIsDead] = useState<boolean>(() => Boolean((pers as any).isDead));
  const [heroicInspirationCount, setHeroicInspirationCountState] = useState<number>(() => pers.heroicInspirationCount);
  const [canStackHeroicInspiration, setCanStackHeroicInspirationState] = useState<boolean>(() => pers.canStackHeroicInspiration);

  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDetailsOpen(localStorage.getItem("pers_details_open") === "true");
  }, []);

  const toggleDetails = useCallback(() => {
    setDetailsOpen((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("pers_details_open", String(next));
      }
      return next;
    });
  }, []);

  const [languagesOpen, setLanguagesOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [didInitDetails, setDidInitDetails] = useState(false);

  const [draftProficiencies, setDraftProficiencies] = useState<string>(() => readProficiencyText(pers).proficiencies);
  const [draftLanguages, setDraftLanguages] = useState<string>(() => readProficiencyText(pers).languages);
  const [draftEquipment, setDraftEquipment] = useState<string>(() => String((pers as any).customEquipment ?? ""));
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

  // Track the version of data currently in drafts to avoid "blinking" during sync
  const lastSavedDataRef = useRef<any>(null);


  useEffect(() => {
    setLocalCurrentHp(pers.currentHp);
    setLocalTempHp(Number.isFinite((pers as any).tempHp) ? Math.max(0, Math.trunc((pers as any).tempHp)) : 0);
    setLocalMaxHp(pers.maxHp);
    setDeathSuccesses(Number.isFinite((pers as any).deathSaveSuccesses) ? Math.max(0, Math.trunc((pers as any).deathSaveSuccesses)) : 0);
    setDeathFailures(Number.isFinite((pers as any).deathSaveFailures) ? Math.max(0, Math.trunc((pers as any).deathSaveFailures)) : 0);
    setIsDead(Boolean((pers as any).isDead));
    setHeroicInspirationCountState(pers.heroicInspirationCount);
    setCanStackHeroicInspirationState(pers.canStackHeroicInspiration);

    // Keep Detailed Info in sync if server data refreshes, but ONLY if we are NOT currently saving
    // AND only if the incoming data is actually DIFFERENT from what we last saved.
    // This prevents the "blink" where local state is overwritten by old server data
    // before the server data has had a chance to update.
    if (!isDetailsPending) {
      const serverProficiencyText = readProficiencyText(pers);
      const serverProf = serverProficiencyText.proficiencies;
      const serverLang = serverProficiencyText.languages;
      const serverEquip = String((pers as any).customEquipment ?? "");
      const serverTraits = String(pers.personalityTraits ?? "");
      const serverIdeals = String(pers.ideals ?? "");
      const serverBonds = String(pers.bonds ?? "");
      const serverFlaws = String(pers.flaws ?? "");
      const serverBackstory = String(pers.backstory ?? "");
      const serverNotes = String(pers.notes ?? "");
      const serverAlign = String((pers as any).alignment ?? "");
      const serverXp = String((pers as any).xp ?? 0);
      const serverCp = String((pers as any).cp ?? "0");
      const serverEp = String((pers as any).ep ?? "0");
      const serverSp = String((pers as any).sp ?? "0");
      const serverGp = String((pers as any).gp ?? "0");
      const serverPp = String((pers as any).pp ?? "0");

      const isSameAsLastSaved = lastSavedDataRef.current &&
        lastSavedDataRef.current.customProficiencies === serverProf &&
        lastSavedDataRef.current.customLanguagesKnown === serverLang &&
        lastSavedDataRef.current.customEquipment === serverEquip &&
        lastSavedDataRef.current.personalityTraits === serverTraits &&
        lastSavedDataRef.current.ideals === serverIdeals &&
        lastSavedDataRef.current.bonds === serverBonds &&
        lastSavedDataRef.current.flaws === serverFlaws &&
        lastSavedDataRef.current.backstory === serverBackstory &&
        lastSavedDataRef.current.notes === serverNotes &&
        lastSavedDataRef.current.alignment === serverAlign &&
        String(lastSavedDataRef.current.xp) === serverXp &&
        String(lastSavedDataRef.current.cp) === serverCp &&
        String(lastSavedDataRef.current.ep) === serverEp &&
        String(lastSavedDataRef.current.sp) === serverSp &&
        String(lastSavedDataRef.current.gp) === serverGp &&
        String(lastSavedDataRef.current.pp) === serverPp;

      // Check if local drafts have changed since we last started a save
      const isLocalDirtySinceSave = lastSavedDataRef.current && (
        draftProficiencies !== lastSavedDataRef.current.customProficiencies ||
        draftLanguages !== lastSavedDataRef.current.customLanguagesKnown ||
        draftEquipment !== lastSavedDataRef.current.customEquipment ||
        draftTraits !== lastSavedDataRef.current.personalityTraits ||
        draftIdeals !== lastSavedDataRef.current.ideals ||
        draftBonds !== lastSavedDataRef.current.bonds ||
        draftFlaws !== lastSavedDataRef.current.flaws ||
        draftBackstory !== lastSavedDataRef.current.backstory ||
        draftNotes !== lastSavedDataRef.current.notes ||
        draftAlignment !== lastSavedDataRef.current.alignment ||
        draftXp !== String(lastSavedDataRef.current.xp) ||
        draftCp !== lastSavedDataRef.current.cp ||
        draftEp !== lastSavedDataRef.current.ep ||
        draftSp !== lastSavedDataRef.current.sp ||
        draftGp !== lastSavedDataRef.current.gp ||
        draftPp !== lastSavedDataRef.current.pp
      );

      // If we just saved something, and the server still has the OLD data, don't sync yet.
      // We know it's old if it doesn't match lastSavedDataRef.
      // ALSO: If the user has typed more (isLocalDirtySinceSave), don't overwrite with stale server data.
      if (!isLocalDirtySinceSave && (!lastSavedDataRef.current || isSameAsLastSaved)) {
        setDraftProficiencies(serverProf);
        setDraftLanguages(serverLang);
        setDraftEquipment(serverEquip);
        setDraftTraits(serverTraits);
        setDraftIdeals(serverIdeals);
        setDraftBonds(serverBonds);
        setDraftFlaws(serverFlaws);
        setDraftBackstory(serverBackstory);
        setDraftNotes(serverNotes);
        setDraftAlignment(serverAlign);
        setDraftXp(serverXp);
        setDraftCp(serverCp);
        setDraftEp(serverEp);
        setDraftSp(serverSp);
        setDraftGp(serverGp);
        setDraftPp(serverPp);
        
        // Clear the ref once we've successfully synced with the new data
        if (isSameAsLastSaved) {
          lastSavedDataRef.current = null;
        }
      }
    }
    setDidInitDetails(true);
  }, [pers, isDetailsPending]);

  useEffect(() => {
    if (!didInitDetails || isReadOnly) return;

    const isDirty =
      draftProficiencies !== String((pers as any).customProficiencies ?? "") ||
      draftLanguages !== String((pers as any).customLanguagesKnown ?? "") ||
      draftEquipment !== String((pers as any).customEquipment ?? "") ||
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
      const dataToSave = {
        customProficiencies: draftProficiencies,
        customLanguagesKnown: draftLanguages,
        customEquipment: draftEquipment,
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
      };

      // Save in background; don't block HP modal UX.
      startDetailsTransition(async () => {
        lastSavedDataRef.current = dataToSave;
        const operation: OfflineOperation = {
          kind: "details",
          patch: dataToSave,
          operationId: createOperationId(),
          persId,
          createdAt: new Date().toISOString(),
        };
        const outcome = await commitOperation(operation, () =>
          updateCharacterAction({ persId, data: dataToSave }),
        );
        if (!outcome.queued && outcome.result && !outcome.result.success) {
          lastSavedDataRef.current = null;
        }
      });
    }, 2000);

    return () => window.clearTimeout(handle);
  }, [
    didInitDetails,
    draftProficiencies,
    draftLanguages,
    draftEquipment,
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
    pers,
    persId,
    isReadOnly,
    startDetailsTransition,
    commitOperation,
  ]);
  
  const hitDiceDisplay = useMemo(() => formatHitDicePools(collectPersHitDicePools(pers)), [pers]);

  // Save proficiency source-of-truth
  const additionalSaveProficiencies = useMemo(() => {
    const raw = (pers as any).additionalSaveProficiencies as unknown;
    if (!Array.isArray(raw)) return [] as Ability[];
    return raw
      .map((v) => {
        if (typeof v !== "string") return null;
        // Prisma enum values come back as strings.
        return (Object.values(Ability) as string[]).includes(v) ? (v as Ability) : null;
      })
      .filter(Boolean) as Ability[];
  }, [pers]);

  const proficientSaves = useMemo(() => {
    return new Set<Ability>(additionalSaveProficiencies);
  }, [additionalSaveProficiencies]);

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
    return "Здоровʼя";
  }, [isDead, localCurrentHp]);

  const readCombatState = (): OfflinePersState => ({
    persId,
    currentHp: localCurrentHp,
    maxHp: Math.max(1, Math.trunc(Number(localMaxHp) || 1)),
    tempHp: localTempHp,
    deathSaveSuccesses: deathSuccesses,
    deathSaveFailures: deathFailures,
    isDead,
    currentSpellSlots: pers.currentSpellSlots ?? [],
    maxSpellSlots: [],
    currentPactSlots: pers.currentPactSlots ?? 0,
    maxPactSlots: 0,
    heroicInspirationCount,
    canStackHeroicInspiration,
  });

  const writeCombatState = (state: OfflinePersState) => {
    setLocalCurrentHp(state.currentHp);
    setLocalTempHp(state.tempHp);
    setLocalMaxHp(state.maxHp);
    setDeathSuccesses(state.deathSaveSuccesses);
    setDeathFailures(state.deathSaveFailures);
    setIsDead(state.isDead);
    setHeroicInspirationCountState(state.heroicInspirationCount);
    setCanStackHeroicInspirationState(state.canStackHeroicInspiration);
  };

  const buildOperation = <T extends Omit<OfflineOperation, "operationId" | "persId" | "createdAt">>(body: T) =>
    ({ ...body, operationId: createOperationId(), persId, createdAt: new Date().toISOString() }) as OfflineOperation;

  type CombatSaveResult = ({ success: true } & Partial<OfflinePersState>) | { success: false; error: string };

  /// Один шлях для хітів, кидків смерті й натхнення: показати одразу, відправити або поставити в
  /// чергу, відкотити лише коли сервер відповів відмовою.
  const commitCombatOperation = (
    operation: OfflineOperation,
    sendToServer: () => Promise<CombatSaveResult>,
    failureTitle: string,
  ) => {
    const previous = readCombatState();
    writeCombatState(applyOfflineOperation(previous, operation));

    startHpTransition(async () => {
      const outcome = await commitOperation(operation, sendToServer);
      if (outcome.queued) return;

      const res = outcome.result;
      if (!res.success) {
        writeCombatState(previous);
        toast.error(failureTitle, { description: res.error });
        router.refresh();
        return;
      }
      writeCombatState({ ...previous, ...res });
      router.refresh();
    });
  };

  const applyHp = () => {
    setHpOpen(false);
    const amount = Math.max(0, Math.trunc(Number(hpAmount)));
    if (!Number.isFinite(amount) || amount <= 0) return;

    setHpAmount("");
    commitCombatOperation(
      buildOperation({ kind: "hp", mode: hpMode, amount }),
      () => applyHpChange({ persId, mode: hpMode, amount }),
      "Не вдалося оновити HP",
    );
    if (hpMode === "damage") sheetStates?.promptConcentrationCheck(amount);
  };

  const setSaves = (nextSuccess: number, nextFail: number) => {
    const successes = Math.max(0, Math.min(3, Math.trunc(nextSuccess)));
    const failures = Math.max(0, Math.min(3, Math.trunc(nextFail)));

    commitCombatOperation(
      buildOperation({ kind: "death-saves", successes, failures }),
      () => setDeathSaves({ persId, successes, failures }),
      "Не вдалося оновити кидки смерті",
    );
  };

  const changeHeroicInspirationCount = (next: number) => {
    commitCombatOperation(
      buildOperation({ kind: "heroic-inspiration", heroicInspirationCount: next }),
      () => setHeroicInspirationCount({ persId, heroicInspirationCount: next }),
      "Не вдалося оновити натхнення",
    );
  };

  /// Налаштування не йде в офлайн-чергу: воно міняється рідко, а черга несе лише стан гри.
  const changeCanStackHeroicInspiration = (canStack: boolean) => {
    const previous = readCombatState();
    const optimistic = {
      ...previous,
      canStackHeroicInspiration: canStack,
      heroicInspirationCount: limitHeroicInspirationCount({ heroicInspirationCount: previous.heroicInspirationCount, canStackHeroicInspiration: canStack }),
    };
    writeCombatState(optimistic);

    startHpTransition(async () => {
      const res = await setCanStackHeroicInspiration({ persId, canStackHeroicInspiration: canStack }).catch(
        (error: unknown) => ({ success: false as const, error: error instanceof Error ? error.message : "Немає звʼязку" }),
      );
      if (!res.success) {
        writeCombatState(previous);
        toast.error("Не вдалося змінити налаштування натхнення", { description: res.error });
        return;
      }
      writeCombatState({ ...optimistic, ...res });
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
    <div className="flex flex-col gap-4 p-4">
      {/* HERO SECTION: Combat Stats (HP, AC, Initiative) */}
      <div className="grid grid-cols-3 gap-2">
        <button 
          type="button" 
          onClick={() => !isReadOnly && !beastForm && openModify({ type: 'simple', field: 'ac' })}
          className={`text-left ${isReadOnly ? 'cursor-default' : ''}`}
        >
          <Card className={`glass-card bg-indigo-500/15 border-indigo-500/40 h-24 ${!isReadOnly ? 'hover:bg-indigo-500/25 transition' : ''} ${beastForm ? BEAST_VALUE_RING : hasSimpleBonus(pers, 'ac') ? 'ring-1 ring-indigo-400/50' : ''}`}>
            <CardContent className="p-2 flex flex-col items-center justify-center h-full">
              <div className="text-[9px] font-bold uppercase tracking-wide text-indigo-300">Клас Броні</div>
              <div className={`text-3xl font-bold mt-1 ${beastForm ? 'text-emerald-200' : 'text-white'} ${findStateValueTone(pers, calculateFinalAC)}`}>{calculateFinalAC(pers)}</div>
              {beastForm
                ? <OwnValue value={calculateFinalAC(beastForm.ownPers)} />
                : <Shield className="w-4 h-4 text-indigo-400 opacity-60 mt-1" />}
            </CardContent>
          </Card>
        </button>

        <button 
          type="button" 
          onClick={() => !isReadOnly && (beastHitPoints ? setBeastHpOpen(true) : setHpOpen(true))}
          className={`text-left ${isReadOnly ? 'cursor-default' : ''}`}
        >
          <Card className={`glass-card h-24 ${beastHitPoints ? `bg-amber-500/15 border-amber-500/50 ${BEAST_HITPOINTS_RING}` : 'bg-rose-500/20 border-rose-500/50'} ${!isReadOnly ? `transition ${beastHitPoints ? 'hover:bg-amber-500/25' : 'hover:bg-rose-500/25'}` : ''}`}>
            <CardContent className="p-2 flex flex-col items-center justify-center h-full">
              <div className={`text-[9px] font-bold uppercase tracking-wide text-center ${beastHitPoints ? 'text-amber-300' : 'text-rose-300'}`}>{beastHitPoints ? "Хіти звіра" : hpTitle}</div>
              <div className="text-4xl font-black text-white mt-1">{localCurrentHp}</div>
              <div className={`text-[11px] ${beastHitPoints ? 'text-amber-400' : 'text-rose-400'}`}>/ {localMaxHp}</div>
              {beastHitPoints && beastForm ? (
                <OwnValue value={`ви: ${beastForm.ownPers.currentHp} / ${beastForm.ownPers.maxHp}`} />
              ) : localTempHp > 0 ? (
                <div className="text-[9px] text-slate-200/80">Тимч.: +{localTempHp}</div>
              ) : null}
            </CardContent>
          </Card>
        </button>

        <button
          type="button"
          aria-label={`Кинути ініціативу ${formatModifier(calculateFinalInitiative(pers))}`}
          {...initiativeLongPress.longPressHandlers}
          onClick={() => {
            if (initiativeLongPress.isLongPressClick()) return;
            openRoll(
              buildInitiativeRollContext(
                calculateFinalInitiative(pers),
                editInitiative,
                describeRollState(pers, { kind: "check", ability: "DEX" }),
              ),
            );
          }}
          className="text-left select-none [-webkit-touch-callout:none]"
        >
          <Card className={`glass-card bg-emerald-500/15 border-emerald-500/40 h-24 hover:bg-emerald-500/25 transition active:scale-[0.98] ${beastForm ? BEAST_VALUE_RING : hasSimpleBonus(pers, 'initiative') ? 'ring-1 ring-emerald-400/50' : ''}`}>
            <CardContent className="p-2 flex flex-col items-center justify-center h-full">
              <div className="text-[9px] font-bold uppercase tracking-wide text-emerald-300">Ініціатива</div>
              <div className="mt-1 flex items-center gap-1.5 text-3xl font-bold text-white">
                <D20Icon className="h-4 w-4 text-emerald-300" />
                {formatModifier(calculateFinalInitiative(pers))}
              </div>
              {beastForm && <OwnValue value={formatModifier(calculateFinalInitiative(beastForm.ownPers))} />}
            </CardContent>
          </Card>
        </button>
      </div>

      {/* SECONDARY STATS ROW: Speed, Hit Dice, Proficiency */}
      <div className="grid grid-cols-3 gap-2">
        <button 
          type="button" 
          onClick={() => !isReadOnly && !beastForm && openModify({ type: 'simple', field: 'speed' })}
          className={`text-left ${isReadOnly ? 'cursor-default' : ''}`}
        >
          <Card className={`glass-card bg-cyan-500/15 border-cyan-400/40 h-16 ${!isReadOnly ? 'hover:bg-cyan-500/25 transition' : ''} ${beastForm ? BEAST_VALUE_RING : hasSimpleBonus(pers, 'speed') ? 'ring-1 ring-cyan-400/50' : ''}`}>
            <CardContent className="p-2 flex flex-col items-center justify-center h-full">
              <div className="text-[9px] font-bold uppercase tracking-wide text-cyan-300">Швидкість</div>
              <div className={`text-xl font-bold ${beastForm ? 'text-emerald-200' : 'text-cyan-50'} ${findStateValueTone(pers, calculateFinalSpeed)}`}>{calculateFinalSpeed(pers)}</div>
              {beastForm && <OwnValue value={calculateFinalSpeed(beastForm.ownPers)} />}
            </CardContent>
          </Card>
        </button>
        <button
          type="button"
          onClick={() => !isReadOnly && setHitDiceOpen(true)}
          className={`text-left ${isReadOnly ? 'cursor-default' : ''}`}
        >
          <Card className={`glass-card bg-amber-500/15 border-amber-400/40 h-16 ${!isReadOnly ? 'hover:bg-amber-500/25 transition' : ''}`}>
            <CardContent className="p-2 flex flex-col items-center justify-center h-full">
              <div className="text-[9px] font-bold uppercase tracking-wide text-amber-300">Хіт Дайси</div>
              <div className="text-lg font-bold text-amber-50 text-center leading-tight">{hitDiceDisplay}</div>
            </CardContent>
          </Card>
        </button>
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

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {attributes.map((attr) => {
          const ability = abilityByKey[attr.key];
          const fromBeast = isBeastAbility(beastForm, ability);
          const canEdit = !isReadOnly && !fromBeast;
          const openEdit = () => openModify({ type: 'stat', ability });

          return (
            <AbilityScoreCard
              key={attr.key}
              shortName={attr.name}
              fullName={attr.fullName}
              borderClassName={attr.borderColor}
              score={calculateFinalStat(pers, ability)}
              modifier={calculateFinalModifier(pers, ability)}
              save={calculateFinalSave(pers, ability)}
              hasSaveProficiency={proficientSaves.has(ability)}
              hasBonuses={hasStatBonuses(pers, ability)}
              fromBeast={fromBeast}
              ownScore={fromBeast && beastForm ? calculateFinalStat(beastForm.ownPers, ability) : undefined}
              canEdit={canEdit}
              onEdit={openEdit}
              rollStates={describeAbilityRollStates(pers, ability)}
              onRoll={(kind) =>
                openRoll(
                  buildAbilityRollContext(
                    attr.fullName,
                    calculateAbilityCheckBonus(pers, ability),
                    calculateFinalSave(pers, ability),
                    kind,
                    canEdit ? openEdit : undefined,
                    describeAbilityRollStates(pers, ability),
                  ),
                )
              }
            />
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {PASSIVE_SKILLS.map(({ skill, label }) => {
          const value = calculatePassiveSkill(pers, skill);
          const ownValue = beastForm ? calculatePassiveSkill(beastForm.ownPers, skill) : value;
          const isRaisedByBeast = value !== ownValue;
          return (
            <button
              key={skill}
              type="button"
              aria-label={`${label} ${value}`}
              disabled={isReadOnly}
              onClick={() => openModify({ type: 'passive', skill })}
              className="text-left disabled:cursor-default"
            >
              <Card className={`glass-card bg-slate-900/60 border border-white/10 min-h-14 h-full transition hover:bg-slate-800/60 active:scale-[0.98] ${isRaisedByBeast ? BEAST_VALUE_RING : ''}`}>
                <CardContent className="p-2 flex flex-col items-center justify-center h-full">
                  <div className="text-[8px] font-bold uppercase tracking-wide text-slate-400 text-center">{label}</div>
                  <div className={`text-lg font-bold ${isRaisedByBeast ? 'text-emerald-200' : 'text-slate-50'}`}>{value}</div>
                  {isRaisedByBeast && <OwnValue value={ownValue} />}
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      <SensesAndResistancesCard
        darkvisionRange={calculateDarkvisionRange(pers)}
        damageResistances={calculateDamageResistances(pers).map((type) => damageTypeTranslations[type] ?? type)}
      />

      <HeroicInspirationRow
        ruleset={pers.ruleset}
        heroicInspirationCount={heroicInspirationCount}
        canStackHeroicInspiration={canStackHeroicInspiration}
        gainsOnLongRest={pers.features.some((persFeature) => grantsHeroicInspirationOnLongRest(persFeature.feature.engName))}
        disabled={Boolean(isReadOnly) || isHpPending}
        isReadOnly={Boolean(isReadOnly)}
        onCountChange={changeHeroicInspirationCount}
        onCanStackChange={changeCanStackHeroicInspiration}
      />

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
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={isReadOnly}
                onClick={() => {
                  setHpOpen(false);
                  openModify({ type: 'simple', field: 'hp' });
                }}
              >
                Змінити максимум
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

      <div>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={toggleDetails}
        >
          Детальна інформація
        </Button>

        {detailsOpen ? (
          <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/40 p-3 space-y-3">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-200">Нотатки</div>
              <textarea
                value={draftNotes}
                onChange={(e) => setDraftNotes(e.target.value)}
                style={{ fieldSizing: "content" }}
                className="w-full min-h-28 rounded-md border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>

            {/* Alignment & XP */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200">Світогляд</div>
                <Input
                  value={draftAlignment}
                  onChange={(e) => setDraftAlignment(e.target.value)}
                  disabled={isReadOnly}
                  className="bg-slate-950/40 border-white/10 text-slate-100"
                  placeholder={isReadOnly ? "" : "Напр.: Законно добрий"}
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
                  disabled={isReadOnly}
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
                    disabled={isReadOnly}
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
                    disabled={isReadOnly}
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
                    disabled={isReadOnly}
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
                    disabled={isReadOnly}
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
                    disabled={isReadOnly}
                    className="bg-slate-950/40 border-white/10 text-slate-100 text-center text-sm px-1"
                    min={0}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-slate-200">Володіння (броня/зброя/інструменти)</div>
                {!isReadOnly && (
                  <Button type="button" size="sm" variant="secondary" onClick={() => setToolsOpen(true)}>
                    Обрати інструменти
                  </Button>
                )}
              </div>
              <textarea
                value={draftProficiencies}
                onChange={(e) => setDraftProficiencies(e.target.value)}
                disabled={isReadOnly}
                style={{ fieldSizing: "content" }}
                className="w-full min-h-32 rounded-md border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-white/20"
                placeholder={isReadOnly ? "" : "Напр.: Легка/середня броня, прості мечі, інструменти злодія"}
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-200">Спорядження</div>
              <textarea
                value={draftEquipment}
                onChange={(e) => setDraftEquipment(e.target.value)}
                disabled={isReadOnly}
                style={{ fieldSizing: "content" }}
                className="w-full min-h-96 rounded-md border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-white/20"
                placeholder={isReadOnly ? "" : "Тут автоматично зібране стартове спорядження; можна доповнювати вручну"}
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
                disabled={isReadOnly}
                style={{ fieldSizing: "content" }}
                className="w-full min-h-32 rounded-md border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-white/20"
                placeholder={isReadOnly ? "" : "Напр.: Загальна, Ельфійська"}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200">Риси характеру</div>
                <textarea
                  value={draftTraits}
                  onChange={(e) => setDraftTraits(e.target.value)}
                  style={{ fieldSizing: "content" }}
                  className="w-full min-h-[64px] rounded-md border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-white/20"
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200">Ідеали</div>
                <textarea
                  value={draftIdeals}
                  onChange={(e) => setDraftIdeals(e.target.value)}
                  style={{ fieldSizing: "content" }}
                  className="w-full min-h-[64px] rounded-md border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-white/20"
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200">Привʼязаності</div>
                <textarea
                  value={draftBonds}
                  onChange={(e) => setDraftBonds(e.target.value)}
                  style={{ fieldSizing: "content" }}
                  className="w-full min-h-[64px] rounded-md border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-white/20"
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200">Вади</div>
                <textarea
                  value={draftFlaws}
                  onChange={(e) => setDraftFlaws(e.target.value)}
                  style={{ fieldSizing: "content" }}
                  className="w-full min-h-[64px] rounded-md border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-white/20"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-200">Передісторія</div>
              <textarea
                value={draftBackstory}
                onChange={(e) => setDraftBackstory(e.target.value)}
                style={{ fieldSizing: "content" }}
                className="w-full min-h-[120px] rounded-md border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>
          </div>
        ) : null}
      </div>

      <TermPickerDialog
        open={languagesOpen}
        onOpenChange={setLanguagesOpen}
        title="Мови"
        terms={LanguageTranslations}
        initialLabels={splitTermTokens(draftLanguages)}
        onApply={(labels) => setDraftLanguages(labels.join(", "))}
      />

      <TermPickerDialog
        open={toolsOpen}
        onOpenChange={setToolsOpen}
        title="Інструменти"
        terms={toolTranslations}
        initialLabels={findMentionedTerms(draftProficiencies, toolTranslations)}
        onApply={(labels) => setDraftProficiencies((text) => appendToolProficiencies(text, labels))}
      />

      <HitDiceDialog
        pers={editablePers}
        open={hitDiceOpen}
        onOpenChange={setHitDiceOpen}
        onPersUpdate={handlePersUpdate}
      />

      {/* Modify Stat Modal */}
      <ModifyStatModal
        open={modifyOpen}
        onOpenChange={setModifyOpen}
        pers={editablePers}
        shownPers={pers}
        onPersUpdate={handlePersUpdate}
        config={modifyConfig}
      />

      {beastHitPoints && beastForm && (
        <BeastHitPointsDialog view={beastForm} open={beastHpOpen} onOpenChange={setBeastHpOpen} />
      )}
    </div>
  );
});

function readProficiencyText(pers: PersWithRelations) {
  return appendMissingProficiencies(
    { proficiencies: String(pers.customProficiencies ?? ""), languages: String(pers.customLanguagesKnown ?? "") },
    calculatePersProficiencies(pers),
  );
}

function SensesAndResistancesCard({ darkvisionRange, damageResistances }: { darkvisionRange: number | null; damageResistances: string[] }) {
  if (darkvisionRange === null && damageResistances.length === 0) return null;

  return (
    <Card className="glass-card bg-slate-900/60 border border-white/10">
      <CardContent className="p-2 flex flex-col gap-1 text-sm text-slate-100">
        {darkvisionRange !== null && (
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Темнозір</span>{" "}
            {darkvisionRange} футів
          </div>
        )}
        {damageResistances.length > 0 && (
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Опори</span>{" "}
            {damageResistances.join(", ")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MainStatsSlide;
