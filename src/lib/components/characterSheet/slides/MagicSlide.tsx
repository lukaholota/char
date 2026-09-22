"use client";

import { describeRollState } from "@/lib/logic/state-labels";
import { useSheetStatesContext } from "@/lib/components/characterSheet/states/SheetStatesContext";
import { motion, AnimatePresence } from "framer-motion";

import { PersWithRelations } from "@/lib/actions/pers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpDown, Check, Plus, SlidersHorizontal, Wand2 } from "lucide-react";
import { memo, useEffect, useMemo, useState, useTransition } from "react";
import { SPELL_SLOT_PROGRESSION } from "@/lib/refs/static";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { removeSpellFromPers, setSpellPrepared, updateSpellBadgeForPers } from "@/lib/actions/spell-actions";
import { spendPactSlot, spendSpellSlot, restorePactSlot, restoreSpellSlot } from "@/lib/actions/spell-slots";
import type { OfflineOperation } from "@/lib/offline/operations";
import { createOperationId } from "@/lib/offline/queue";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { useLatestMutation } from "@/hooks/useLatestMutation";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { buildSpellcastingStatRows } from "@/lib/logic/spellcasting-stats";
import SpellcastingSourceCards from "@/lib/components/characterSheet/shared/SpellcastingSourceCards";
import type { SpellSource } from "@/rules/spell-sources";
import { openLoadedSpell, openSpellLink } from "@/lib/spell-link";
import { buildPersSpellLink, getPersSpellId, listCatalogSpellLinks } from "./sheet-spell-links";
import { preloadSpellCardsWhenIdle } from "@/lib/spell-cards";
import { buildHomebrewSheetSpellRows, isHomebrewCatalogId } from "@/lib/logic/homebrew-view";
import ModifyStatModal, { ModifyConfig } from "../ModifyStatModal";
import { calculateCasterLevel } from "@/lib/logic/spell-logic";
import AddSpellDialog from "../AddSpellDialog";
import { getSpellcastingCountsLines } from "@/lib/logic/spellcasting-progression";
import SpellcastingCountsBlock from "@/lib/components/characterSheet/shared/SpellcastingCountsBlock";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SpellListGroup from "@/lib/components/characterSheet/shared/SpellListGroup";
import CastSpellMenu, { describeSlot } from "@/lib/components/characterSheet/shared/CastSpellMenu";
import { listCastingSlotOptions, type CastingSlotOption } from "@/rules/spell-casting-slots";
import { collectFreeSpellCasts } from "@/lib/logic/free-feat-spell-casts";
import { findFreeSpellCastsForSpell } from "@/rules/free-feat-spell-casts";
import { isAlwaysPreparedSpell } from "@/rules/always-prepared-spells";
import { spendFeatureUse } from "@/lib/actions/feature-uses";
import { classTranslations, raceTranslations, subclassTranslations, subraceTranslations, variantTranslations } from "@/lib/refs/translation";
import { Checkbox } from "@/components/ui/checkbox";
import {
  collectPreparedCountAutoExcludeMatchers,
  getEffectiveExcludeFromKnownCount,
  getEffectiveExcludeFromPreparedCount,
} from "@/lib/logic/spell-prepared-exclusions";
import { findPreparedRemaining, tallyPreparedSpellsByClass, type PreparedSpellRow } from "@/rules/prepared-spell-limits";
import { tallyWizardSpellbook } from "@/rules/class-spell-choices-2024";

const SPELL_BADGE_COLORS = [
  { name: "Sky", value: "#38bdf8" },
  { name: "Mint", value: "#34d399" },
  { name: "Amber", value: "#fbbf24" },
  { name: "Rose", value: "#fb7185" },
  { name: "Violet", value: "#a78bfa" },
  { name: "Slate", value: "#94a3b8" },
  { name: "Lime", value: "#a3e635" },
  { name: "Teal", value: "#2dd4bf" },
] as const;

const BADGE_COLOR_CLASS = "#fb7185";
const BADGE_COLOR_SUBCLASS = "#fbbf24";
const BADGE_COLOR_RACE = "#38bdf8";
const BADGE_COLOR_BASE = "#a78bfa";

interface MagicSlideProps {
  pers: PersWithRelations;
  spellcastingSources: readonly SpellSource[];
  onFeaturesChanged?: () => void;
  onPersUpdate: (next: PersWithRelations) => void;
  isReadOnly?: boolean;
}

function collectSheetSpells(pers: PersWithRelations): any[] {
  return [...pers.persSpells, ...buildHomebrewSheetSpellRows(pers.homebrewSpells ?? [], pers.ruleset)];
}

function getPersSpellLevel(persSpell: any): number | null {
  const level = Number(persSpell?.spell?.level ?? 0);
  return Number.isFinite(level) ? level : null;
}

function collectExcludedPreparedSpellIds(spells: any[], matchers: string[]): Set<number> {
  const ids = new Set<number>();

  for (const ps of spells) {
    const spellId = getPersSpellId(ps);
    if (spellId === null) continue;
    if (getEffectiveExcludeFromPreparedCount(ps, matchers)) ids.add(spellId);
  }

  return ids;
}

function collectExcludedKnownSpellIds(spells: any[]): Set<number> {
  const ids = new Set<number>();

  for (const ps of spells) {
    const spellId = getPersSpellId(ps);
    if (spellId === null) continue;
    if (getEffectiveExcludeFromKnownCount(ps)) ids.add(spellId);
  }

  return ids;
}

function countPreparedSpells(spells: any[], excludedSpellIds: Set<number>): number {
  const ids = new Set<number>();

  for (const ps of spells) {
    const spellId = getPersSpellId(ps);
    if (spellId === null) continue;
    if (excludedSpellIds.has(spellId)) continue;

    const level = getPersSpellLevel(ps);
    if (level === 0) continue;
    if (Boolean(ps?.isPrepared)) ids.add(spellId);
  }

  return ids.size;
}

function toPreparedSpellRows(spells: any[], excludedSpellIds: Set<number>): PreparedSpellRow[] {
  return spells.flatMap((ps) => {
    const spellId = getPersSpellId(ps);
    if (spellId === null) return [];
    return [{
      level: getPersSpellLevel(ps) ?? 0,
      isPrepared: Boolean(ps?.isPrepared),
      badgeText: ps?.badgeText,
      isExcludedFromPrepared: excludedSpellIds.has(spellId),
    }];
  });
}

const SPELL_SLOTS_MUTATION = "spell-slots";
const PACT_SLOTS_MUTATION = "pact-slots";

function toSlotCounts(raw: unknown): number[] {
  const values = Array.isArray(raw) ? raw : [];
  return Array.from({ length: 9 }, (_, idx) => {
    const value = Number(values[idx]);
    return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
  });
}

const MagicSlide = memo(function MagicSlide({ pers, spellcastingSources, onPersUpdate, isReadOnly, onFeaturesChanged }: MagicSlideProps) {
  const router = useRouter();
  const sheetStates = useSheetStatesContext();
  const [isPending, startTransition] = useTransition();
  const { commitOperation } = useOfflineQueue();
  const { startMutation, finishMutation, hasPendingMutation } = useLatestMutation();

  const buildSlotOperation = (
    body:
      | { kind: "spend-spell-slot"; slotLevel: number }
      | { kind: "restore-spell-slot"; slotLevel: number }
      | { kind: "spend-pact-slot" }
      | { kind: "restore-pact-slot" }
      | { kind: "spell-prepared"; spellId: number; isPrepared: boolean }
      | { kind: "feature-use"; featureId: number; direction: "spend" },
  ): OfflineOperation => ({
    ...body,
    operationId: createOperationId(),
    persId: pers.persId,
    createdAt: new Date().toISOString(),
  });

  const [sortMode, setSortMode] = useState<"level" | "badge">("level");
  const [filterMode, setFilterMode] = useState<"all" | "prepared" | "unprepared">("all");
  const [badgeEditorOpen, setBadgeEditorOpen] = useState(false);
  const [badgeEditorSpellId, setBadgeEditorSpellId] = useState<number | null>(null);
  const [badgeEditorSpellName, setBadgeEditorSpellName] = useState<string>("");
  const [badgeEditorText, setBadgeEditorText] = useState<string>("");
  const [badgeEditorColor, setBadgeEditorColor] = useState<string>(SPELL_BADGE_COLORS[0].value);
  const [badgeEditorExcludeFromPreparedCount, setBadgeEditorExcludeFromPreparedCount] = useState(false);
  const [badgeEditorExcludeFromKnownCount, setBadgeEditorExcludeFromKnownCount] = useState(false);
  const [confirmDeleteInBadgeEditor, setConfirmDeleteInBadgeEditor] = useState(false);

  const [localPers, setLocalPers] = useState<PersWithRelations>(pers);
  const [modifyConfig, setModifyConfig] = useState<ModifyConfig | null>(null);

  useEffect(() => {
    setLocalPers(pers);
  }, [pers]);

  const spellcastingStatRows = useMemo(
    () => buildSpellcastingStatRows(localPers, spellcastingSources),
    [localPers, spellcastingSources],
  );

  const [localPersSpells, setLocalPersSpells] = useState(() => collectSheetSpells(localPers));
  const [spellQuery, setSpellQuery] = useState("");
  const catalogSpellLinks = useMemo(() => listCatalogSpellLinks(localPersSpells), [localPersSpells]);

  useEffect(() => preloadSpellCardsWhenIdle(catalogSpellLinks), [catalogSpellLinks]);

  // If data refreshes from server, keep local list in sync.
  useEffect(() => {
    setLocalPersSpells(collectSheetSpells(localPers));
  }, [localPers]);

  const [localCurrentSlots, setLocalCurrentSlots] = useState<number[]>(() => toSlotCounts(pers.currentSpellSlots));

  const [localPactSlots, setLocalPactSlots] = useState(pers.currentPactSlots ?? 0);

  /// Залишок безкоштовних застосувань живе в рядку `pers_feature`, а витрата з листа має бути
  /// видною до перечитування сторінки — звідси накладка поверх серверного числа.
  const [freeCastRemainingByFeatureId, setFreeCastRemainingByFeatureId] = useState<Record<number, number>>({});

  useEffect(() => {
    setFreeCastRemainingByFeatureId({});
  }, [pers]);

  const freeSpellCasts = useMemo(() => {
    return collectFreeSpellCasts(localPers).map((cast) => {
      const override = freeCastRemainingByFeatureId[cast.featureId];
      return typeof override === "number" ? { ...cast, remaining: override } : cast;
    });
  }, [localPers, freeCastRemainingByFeatureId]);
  const [openSlotLevel, setOpenSlotLevel] = useState<number | null>(null);
  const [openPactSlots, setOpenPactSlots] = useState(false);

  useEffect(() => {
    const handleGlobalClick = () => {
      setOpenSlotLevel(null);
      setOpenPactSlots(false);
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  useEffect(() => {
    const currentPactSlots = (localPers as any).currentPactSlots;
    if (!hasPendingMutation(SPELL_SLOTS_MUTATION)) setLocalCurrentSlots(toSlotCounts(localPers.currentSpellSlots));
    if (!hasPendingMutation(PACT_SLOTS_MUTATION)) {
      setLocalPactSlots(Number.isFinite(currentPactSlots) ? Math.max(0, Math.trunc(currentPactSlots)) : 0);
    }
  }, [localPers, hasPendingMutation]);

  const caster = useMemo(() => calculateCasterLevel(localPers as any), [localPers]);

  const spellcastingCounts = useMemo(() => {
	return getSpellcastingCountsLines(localPers);
  }, [localPers]);

  const preparedCountAutoExcludeMatchers = useMemo(
    () => collectPreparedCountAutoExcludeMatchers(localPers),
    [localPers]
  );

  const excludedFromPreparedCountSpellIds = useMemo(() => {
    return collectExcludedPreparedSpellIds(localPersSpells as any[], preparedCountAutoExcludeMatchers);
  }, [localPersSpells, preparedCountAutoExcludeMatchers]);

  const excludedFromKnownCountSpellIds = useMemo(() => {
    return collectExcludedKnownSpellIds(localPersSpells as any[]);
  }, [localPersSpells]);

  const knownSpellsCount = useMemo(() => {
    const ids = new Set<number>();
    for (const ps of localPersSpells as any[]) {
      const spellId = Number(ps?.spellId ?? ps?.spell?.spellId);
      if (!Number.isFinite(spellId)) continue;
      if (excludedFromKnownCountSpellIds.has(spellId)) continue;
      const level = Number(ps?.spell?.level ?? 0);
      if (!Number.isFinite(level) || level <= 0) continue;
      ids.add(spellId);
    }
    return ids.size;
  }, [localPersSpells, excludedFromKnownCountSpellIds]);

  const knownCantripsCount = useMemo(() => {
    const ids = new Set<number>();
    for (const ps of localPersSpells as any[]) {
      const spellId = Number(ps?.spellId ?? ps?.spell?.spellId);
      if (!Number.isFinite(spellId)) continue;
      if (excludedFromKnownCountSpellIds.has(spellId)) continue;
      const level = Number(ps?.spell?.level ?? 0);
      if (!Number.isFinite(level) || level !== 0) continue;
      ids.add(spellId);
    }
    return ids.size;
  }, [localPersSpells, excludedFromKnownCountSpellIds]);

  const preparedSpellsCount = useMemo(() => {
    return countPreparedSpells(localPersSpells as any[], excludedFromPreparedCountSpellIds);
  }, [localPersSpells, excludedFromPreparedCountSpellIds]);

  const wizardSpellbook = useMemo(() => {
    const line = spellcastingCounts.find((entry) => entry.key.startsWith("class:WIZARD_2024:"));
    if (!line) return null;
    const owned = (localPersSpells as any[]).map((ps) => ({
      level: getPersSpellLevel(ps) ?? 0,
      isPrepared: Boolean(ps?.isPrepared),
      badgeText: ps?.badgeText ?? null,
      excludeFromPreparedCount: Boolean(ps?.excludeFromPreparedCount),
    }));
    return { lineKey: line.key, tally: tallyWizardSpellbook(line.level, owned) };
  }, [spellcastingCounts, localPersSpells]);

  const preparedTallies = useMemo(
    () => tallyPreparedSpellsByClass(spellcastingCounts, toPreparedSpellRows(localPersSpells as any[], excludedFromPreparedCountSpellIds)),
    [spellcastingCounts, localPersSpells, excludedFromPreparedCountSpellIds]
  );

  const maxSlots = useMemo(() => {
    const level = Math.max(0, Math.min(20, Math.trunc(caster.casterLevel || 0)));
    if (level <= 0) return Array.from({ length: 9 }, () => 0);
    const row = (SPELL_SLOT_PROGRESSION as any).FULL?.[level] as number[] | undefined;
    if (!Array.isArray(row)) return Array.from({ length: 9 }, () => 0);
    return Array.from({ length: 9 }, (_, idx) => {
      const v = row[idx];
      return Number.isFinite(v) ? Math.max(0, Math.trunc(v)) : 0;
    });
  }, [caster.casterLevel]);

  const pactInfo = useMemo(() => {
    const pactLevel = Math.max(0, Math.min(20, Math.trunc(caster.pactLevel || 0)));
    const pact = (SPELL_SLOT_PROGRESSION as any).PACT?.[pactLevel] as { slots: number; level: number } | undefined;
    if (!pact || pactLevel <= 0) return null;
    return {
      max: Math.max(0, Math.trunc(pact.slots)),
      slotLevel: Math.max(1, Math.min(9, Math.trunc(pact.level))),
    };
  }, [caster.pactLevel]);

  const spellsByLevel = useMemo(() => {
    const query = spellQuery.trim().toLowerCase();
    const source = (localPersSpells as any[]).filter((ps) => {
      const isPrepared = Boolean(ps?.isPrepared);
      if (filterMode === "prepared" && !isPrepared) return false;
      if (filterMode === "unprepared" && isPrepared) return false;
      if (!query) return true;
      const name = String(ps?.spell?.name ?? "").toLowerCase();
      return name.includes(query);
    });

    const byLevel: Record<number, any[]> = {};
    for (const ps of source) {
      const level = Number(ps?.spell?.level ?? 0);
      if (!byLevel[level]) byLevel[level] = [];
      byLevel[level].push(ps);
    }

    for (const [k, list] of Object.entries(byLevel)) {
      byLevel[Number(k)] = list.sort((a, b) => {
        const aHasBadge = String(a?.badgeText ?? "").trim().length > 0;
        const bHasBadge = String(b?.badgeText ?? "").trim().length > 0;
        if (aHasBadge !== bHasBadge) return aHasBadge ? -1 : 1;

        const aName = String(a?.spell?.name ?? "");
        const bName = String(b?.spell?.name ?? "");
        return aName.localeCompare(bName, "uk", { sensitivity: "base" });
      });
    }

    return byLevel;
  }, [localPersSpells, spellQuery, filterMode]);

  const spellsByBadge = useMemo(() => {
    const query = spellQuery.trim().toLowerCase();
    const source = (localPersSpells as any[]).filter((ps) => {
      const isPrepared = Boolean(ps?.isPrepared);
      if (filterMode === "prepared" && !isPrepared) return false;
      if (filterMode === "unprepared" && isPrepared) return false;
      if (!query) return true;
      const name = String(ps?.spell?.name ?? "").toLowerCase();
      return name.includes(query);
    });

    const byBadge: Record<string, any[]> = {};
    for (const ps of source) {
      const badge = String(ps?.badgeText ?? "").trim() || "Без бейджа";
      if (!byBadge[badge]) byBadge[badge] = [];
      byBadge[badge].push(ps);
    }

    for (const [key, list] of Object.entries(byBadge)) {
      byBadge[key] = list.sort((a, b) => {
        const levelA = Number(a?.spell?.level ?? 0);
        const levelB = Number(b?.spell?.level ?? 0);
        if (levelA !== levelB) return levelA - levelB;
        const aName = String(a?.spell?.name ?? "");
        const bName = String(b?.spell?.name ?? "");
        return aName.localeCompare(bName, "uk", { sensitivity: "base" });
      });
    }

    return byBadge;
  }, [localPersSpells, spellQuery, filterMode]);

  const badgeGroups = useMemo(() => {
    return Object.keys(spellsByBadge).sort((a, b) => {
      if (a === "Без бейджа") return 1;
      if (b === "Без бейджа") return -1;
      return a.localeCompare(b, "uk", { sensitivity: "base" });
    });
  }, [spellsByBadge]);

  const levels = useMemo(() => {
    return Object.keys(spellsByLevel)
      .map((k) => Number(k))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);
  }, [spellsByLevel]);

  const openSpell = (spellId: number) => {
    const homebrewSpell = isHomebrewCatalogId(spellId) ? localPersSpells.find((ps: any) => ps.spellId === spellId)?.spell : null;
    if (homebrewSpell) openLoadedSpell(homebrewSpell);
    else openSpellLink(buildPersSpellLink(localPersSpells, spellId));
  };

  const openBadgeEditor = (ps: any) => {
    const spellId = Number(ps?.spellId ?? ps?.spell?.spellId);
    if (!Number.isFinite(spellId)) return;
    setBadgeEditorSpellId(spellId);
    setBadgeEditorSpellName(String(ps?.spell?.name ?? "Заклинання"));
    setBadgeEditorText(String(ps?.badgeText ?? ""));
    setBadgeEditorColor(String(ps?.badgeColor ?? "").trim() || SPELL_BADGE_COLORS[0].value);
    setBadgeEditorExcludeFromPreparedCount(getEffectiveExcludeFromPreparedCount(ps, preparedCountAutoExcludeMatchers));
    setBadgeEditorExcludeFromKnownCount(getEffectiveExcludeFromKnownCount(ps));
    setConfirmDeleteInBadgeEditor(false);
    setBadgeEditorOpen(true);
  };

  const filterLabel =
    filterMode === "all"
      ? "Фільтр: всі заклинання"
      : filterMode === "prepared"
        ? "Фільтр: підготовлені"
        : "Фільтр: непідготовлені";

  const cycleFilterMode = () => {
    setFilterMode((prev) => {
      if (prev === "all") return "prepared";
      if (prev === "prepared") return "unprepared";
      return "all";
    });
  };

  const setSpellPreparedInline = (ps: any, nextPrepared: boolean) => {
    const spellId = Number(ps?.spellId ?? ps?.spell?.spellId);
    if (!Number.isFinite(spellId) || isReadOnly) return;

    const level = Number(ps?.spell?.level ?? 0);
    if (!Number.isFinite(level) || level <= 0) return;

    const applyPreparedState = (spells: any[], isPrepared: boolean) =>
      spells.map((item) => {
        const itemSpellId = Number(item?.spellId ?? item?.spell?.spellId);
        if (itemSpellId !== spellId) return item;
        return { ...item, isPrepared };
      });

    setLocalPersSpells(applyPreparedState(localPersSpells as any[], nextPrepared));

    startTransition(async () => {
      const outcome = await commitOperation(
        buildSlotOperation({ kind: "spell-prepared", spellId, isPrepared: nextPrepared }),
        () => setSpellPrepared({ persId: localPers.persId, spellId, isPrepared: nextPrepared }),
      );
      const res = outcome.queued ? { success: true as const, isPrepared: nextPrepared } : outcome.result;

      if (!res.success) {
        router.refresh();
        return;
      }

      const nextSpells = applyPreparedState(localPersSpells as any[], res.isPrepared);
      const nextExcluded = collectExcludedPreparedSpellIds(nextSpells, preparedCountAutoExcludeMatchers);
      /// Заклинання поза лімітом (риса, вид, підклас) ліміту класу не рухає, тож і числа класу
      /// після нього не показуємо: інакше «Залишилось підготувати: 0» читається як наслідок
      /// цього натискання й виглядає багом лічильника.
      const nextRemaining = nextExcluded.has(spellId)
        ? null
        : findPreparedRemaining(
            tallyPreparedSpellsByClass(spellcastingCounts, toPreparedSpellRows(nextSpells, nextExcluded)),
            ps?.badgeText
          );

      setLocalPersSpells(nextSpells);

      if (nextRemaining !== null && Number.isFinite(nextRemaining)) {
        const left = Math.max(0, Number(nextRemaining));
        toast.info(`Залишилось підготувати: ${left}`);
      } else if (res.isPrepared) {
        toast.info("Заклинання підготовлено");
      } else {
        toast.info("Підготовку знято");
      }

      if (!outcome.queued) router.refresh();
    });
  };

  /// Слот змінюється одразу, а відповідь сервера береться лише від останнього натискання серії —
  /// як у ресурсів класу. Кнопки слотів не чекають на відповідь.
  const commitSlotChange = <TResult,>(
    mutationKey: string,
    operation: OfflineOperation,
    sendToServer: () => Promise<TResult>,
    applyServerResult: (result: TResult) => void,
  ) => {
    const version = startMutation(mutationKey);
    void commitOperation(operation, sendToServer).then((outcome) => {
      const isLatest = finishMutation(mutationKey, version);
      if (outcome.queued || !isLatest) return;
      applyServerResult(outcome.result);
    });
  };

  const applySpellSlotsResult = (res: { success: true; currentSpellSlots: number[] } | { success: false; error: string }) => {
    if (res.success) setLocalCurrentSlots(toSlotCounts(res.currentSpellSlots));
    router.refresh();
  };

  const applyPactSlotsResult = (res: { success: true; currentPactSlots: number } | { success: false; error: string }) => {
    if (res.success) setLocalPactSlots(Math.max(0, Math.trunc(res.currentPactSlots)));
    router.refresh();
  };

  const spendSpellSlotOfLevel = (level: number) => {
    const idx = level - 1;
    setLocalCurrentSlots((prev) => prev.map((value, index) => (index === idx ? Math.max(0, value - 1) : value)));
    commitSlotChange(
      SPELL_SLOTS_MUTATION,
      buildSlotOperation({ kind: "spend-spell-slot", slotLevel: level }),
      () => spendSpellSlot(localPers.persId, level),
      applySpellSlotsResult,
    );
  };

  const restoreSpellSlotOfLevel = (level: number, max: number) => {
    const idx = level - 1;
    setLocalCurrentSlots((prev) => prev.map((value, index) => (index === idx ? Math.min(max, value + 1) : value)));
    commitSlotChange(
      SPELL_SLOTS_MUTATION,
      buildSlotOperation({ kind: "restore-spell-slot", slotLevel: level }),
      () => restoreSpellSlot(localPers.persId, level),
      applySpellSlotsResult,
    );
  };

  const spendPactSlotOnce = () => {
    if (!pactInfo || localPactSlots <= 0) return;
    setLocalPactSlots((v) => Math.max(0, v - 1));
    commitSlotChange(PACT_SLOTS_MUTATION, buildSlotOperation({ kind: "spend-pact-slot" }), () => spendPactSlot(localPers.persId), applyPactSlotsResult);
  };

  const restorePactSlotOnce = () => {
    if (!pactInfo || localPactSlots >= pactInfo.max) return;
    setLocalPactSlots((v) => Math.min(pactInfo.max, v + 1));
    commitSlotChange(PACT_SLOTS_MUTATION, buildSlotOperation({ kind: "restore-pact-slot" }), () => restorePactSlot(localPers.persId), applyPactSlotsResult);
  };

  const spendFreeCastUse = (featureId: number, remaining: number) => {
    if (remaining <= 0 || isReadOnly) return;
    setFreeCastRemainingByFeatureId((prev) => ({ ...prev, [featureId]: remaining - 1 }));

    startTransition(async () => {
      const outcome = await commitOperation(
        buildSlotOperation({ kind: "feature-use", featureId, direction: "spend" }),
        () => spendFeatureUse({ persId: localPers.persId, featureId }),
      );
      if (outcome.queued) return;

      const res = outcome.result;
      if (!res.success) {
        router.refresh();
        return;
      }

      if (typeof res.usesRemaining === "number") {
        setFreeCastRemainingByFeatureId((prev) => ({ ...prev, [featureId]: res.usesRemaining as number }));
      }
      onFeaturesChanged?.();
      router.refresh();
    });
  };

  const castSpell = (ps: any, option: CastingSlotOption) => {
    if (option.kind === "FREE_USE") spendFreeCastUse(option.featureId, option.remaining);
    else if (option.kind === "PACT_SLOT") spendPactSlotOnce();
    else spendSpellSlotOfLevel(option.slotLevel);
    const slotLabel = describeSlot(option).toLocaleLowerCase("uk");
    if (sheetStates && ps?.spell) sheetStates.onSpellCast(ps.spell, slotLabel);
    else toast.info(`«${ps?.spell?.name ?? "Заклинання"}»: ${slotLabel}`);
  };

  const renderSpellActions = (ps: any) => {
    const spellId = Number(ps?.spellId ?? ps?.spell?.spellId);
    const levelValue = Number(ps?.spell?.level ?? 0);
    const isAlwaysPrepared = isAlwaysPreparedSpell({
      level: levelValue,
      origin: ps?.origin,
      excludeFromPreparedCount: ps?.excludeFromPreparedCount,
    });
    const checked = isAlwaysPrepared || Boolean(ps?.isPrepared);
    const isSpellWithPreparation = Number.isFinite(levelValue) && levelValue > 0 && !isAlwaysPrepared;
    const castOptions = listCastingSlotOptions({
      spellLevel: levelValue,
      currentSpellSlots: localCurrentSlots,
      maxSpellSlots: maxSlots,
      pact: pactInfo ? { current: localPactSlots, max: pactInfo.max, slotLevel: pactInfo.slotLevel } : null,
      freeCasts: findFreeSpellCastsForSpell(freeSpellCasts, spellId),
    });

    return (
      <div className="flex items-center gap-1">
        {isReadOnly ? null : (
          <CastSpellMenu spellName={String(ps?.spell?.name ?? "")} options={castOptions} disabled={isPending} onCast={(option) => castSpell(ps, option)} />
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-label={isAlwaysPrepared ? "Завжди підготоване" : checked ? "Зняти підготовку" : "Підготувати заклинання"}
          title={isAlwaysPrepared ? "Завжди підготоване — зняти не можна" : undefined}
          disabled={!Number.isFinite(spellId) || isPending || isReadOnly || !isSpellWithPreparation}
          className={
            "h-7 sm:h-9 w-[62px] sm:w-[76px] shrink-0 rounded-md border transition-colors " +
            (checked
              ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
              : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10")
          }
          onClick={(e) => {
            e.stopPropagation();
            if (!Number.isFinite(spellId) || !isSpellWithPreparation || isReadOnly) return;
            setSpellPreparedInline(ps, !checked);
          }}
        >
          <span className="inline-flex items-center gap-1 text-[10px] font-medium">
            {checked ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            підгот.
          </span>
        </Button>
      </div>
    );
  };

  const badgeClassHints = useMemo(() => {
    const values: string[] = [];

    const pushClass = (raw: unknown) => {
      const value = String(raw ?? "").trim();
      if (!value) return;
      const translated = classTranslations[value as keyof typeof classTranslations] || value;
      values.push(translated);
    };

    pushClass(localPers.class?.name);
    for (const mc of (localPers.multiclasses ?? []) as any[]) {
      pushClass(mc?.class?.name);
    }

    const seen = new Set<string>();
    return values.filter((value) => {
      const key = value.toLocaleLowerCase("uk");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [localPers]);

  const badgeSubclassHints = useMemo(() => {
    const values: string[] = [];

    const pushSubclass = (raw: unknown) => {
      const value = String(raw ?? "").trim();
      if (!value) return;
      const translated = subclassTranslations[value as keyof typeof subclassTranslations] || value;
      values.push(translated);
    };

    pushSubclass((localPers as any).subclass?.name);
    for (const mc of (localPers.multiclasses ?? []) as any[]) {
      pushSubclass(mc?.subclass?.name);
    }

    const seen = new Set<string>();
    return values.filter((value) => {
      const key = value.toLocaleLowerCase("uk");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [localPers]);

  const badgeRaceHints = useMemo(() => {
    const values: string[] = [];

    const pushRace = (raw: unknown) => {
      const value = String(raw ?? "").trim();
      if (!value) return;
      const translated = raceTranslations[value as keyof typeof raceTranslations] || value;
      values.push(translated);
    };

    const pushSubrace = (raw: unknown) => {
      const value = String(raw ?? "").trim();
      if (!value) return;
      const translated = subraceTranslations[value as keyof typeof subraceTranslations] || value;
      values.push(translated);
    };

    const pushVariant = (raw: unknown) => {
      const value = String(raw ?? "").trim();
      if (!value) return;
      const translated = variantTranslations[value as keyof typeof variantTranslations] || value;
      values.push(translated);
    };

    const pushRaceChoiceOption = (raw: unknown) => {
      const value = String(raw ?? "").trim();
      if (!value) return;
      values.push(value);
    };

    pushRace(localPers.race?.name);
    pushSubrace((localPers as any).subrace?.name);
    for (const rv of ((localPers as any).raceVariants ?? []) as any[]) {
      pushVariant(rv?.name);
    }
    for (const option of ((localPers as any).raceChoiceOptions ?? []) as any[]) {
      pushRaceChoiceOption(option?.optionName);
    }

    const seen = new Set<string>();
    return values.filter((value) => {
      const key = value.toLocaleLowerCase("uk");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [localPers]);

  const badgeBaseHints = useMemo(() => {
    return [
      { label: "архетип", color: BADGE_COLOR_SUBCLASS, autoExclude: true },
      { label: "підклас", color: BADGE_COLOR_SUBCLASS, autoExclude: true },
      { label: "клас", color: BADGE_COLOR_CLASS, autoExclude: false },
      { label: "раса", color: BADGE_COLOR_RACE, autoExclude: true },
      { label: "підраса", color: BADGE_COLOR_RACE, autoExclude: true },
    ];
  }, []);

  const applyBadgeHint = (value: string, color: string, autoExclude = false) => {
    const next = String(value || "").trim().slice(0, 24);
    setBadgeEditorText(next);
    setBadgeEditorColor(color);
    if (autoExclude) {
      setBadgeEditorExcludeFromPreparedCount(true);
      setBadgeEditorExcludeFromKnownCount(true);
    }
  };

  return (
    <div
      className="overflow-y-auto p-2.5 sm:p-4 space-y-4"
    >

      <SpellcastingSourceCards
        rows={spellcastingStatRows}
        isReadOnly={isReadOnly}
        attackState={describeRollState(localPers, { kind: "attack" }, "ATTACK")}
        onEdit={(field, ability) => setModifyConfig({ type: "simple", field, ability: ability ?? undefined })}
      />

      {/* Spell Slots */}
      <Card className="glass-card bg-white/5 border-purple-300/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-purple-50">
            <span className="uppercase tracking-wide text-indigo-300">Слоти заклинань</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }, (_, idx) => {
              const level = idx + 1;
              const cur = localCurrentSlots[idx] ?? 0;
              const max = maxSlots[idx] ?? 0;
              
              const canSpend = cur > 0;
              const canRestore = cur < max;

              return (
                <div key={level} className="relative">
                  <button
                    type="button"
                    disabled={max <= 0 || isReadOnly}
                    title={isReadOnly ? "Режим перегляду" : max > 0 ? "Натисніть, щоб керувати слотами" : "Слотів цього рівня немає"}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (max > 0 && !isReadOnly) {
                        setOpenSlotLevel(openSlotLevel === level ? null : level);
                        setOpenPactSlots(false);
                      }
                    }}
                    className={
                      "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center transition active:scale-95 touch-manipulation " +
                      (max > 0 && !isReadOnly ? "hover:bg-white/10 cursor-pointer" : "opacity-70 cursor-not-allowed") +
                      (openSlotLevel === level ? " ring-2 ring-indigo-500/50 bg-white/10" : "")
                    }
                  >
                    <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">{level}-й</div>
                    <div className="text-sm font-semibold text-slate-50">
                      {cur}/{max}
                    </div>
                  </button>

                  <AnimatePresence>
                    {openSlotLevel === level && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[60] min-w-[120px] glass-card overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 p-1 text-slate-100 shadow-xl backdrop-blur-md"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          disabled={!canSpend}
                          className="w-full text-left px-3 py-2 text-sm rounded-md transition-colors hover:bg-white/10 disabled:opacity-50 disabled:pointer-events-none"
                          onClick={() => {
                            setOpenSlotLevel(null);
                            if (canSpend) spendSpellSlotOfLevel(level);
                          }}
                        >
                          Витратити
                        </button>
                        <button
                          disabled={!canRestore}
                          className="w-full text-left px-3 py-2 text-sm rounded-md transition-colors hover:bg-white/10 disabled:opacity-50 disabled:pointer-events-none"
                          onClick={() => {
                            setOpenSlotLevel(null);
                            if (canRestore) restoreSpellSlotOfLevel(level, max);
                          }}
                        >
                          Відновити
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {pactInfo ? (
            <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 flex items-center justify-between relative">
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Магія пакту</div>
                <div className="text-sm font-semibold text-slate-50">
                  {localPactSlots}/{pactInfo.max} • рівень слота: {pactInfo.slotLevel}
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={isReadOnly}
                title={isReadOnly ? "Режим перегляду" : "Натисніть, щоб керувати слотами Магії пакту"}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenPactSlots(!openPactSlots);
                  setOpenSlotLevel(null);
                }}
              >
                Керувати
              </Button>

              <AnimatePresence>
                {openPactSlots && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute bottom-full right-0 mb-2 z-[60] min-w-[120px] glass-card overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 p-1 text-slate-100 shadow-xl backdrop-blur-md"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      disabled={localPactSlots <= 0}
                      className="w-full text-left px-3 py-2 text-sm rounded-md transition-colors hover:bg-white/10 disabled:opacity-50 disabled:pointer-events-none"
                      onClick={() => {
                        setOpenPactSlots(false);
                        spendPactSlotOnce();
                      }}
                    >
                      Витратити
                    </button>
                    <button
                      disabled={localPactSlots >= pactInfo.max}
                      className="w-full text-left px-3 py-2 text-sm rounded-md transition-colors hover:bg-white/10 disabled:opacity-50 disabled:pointer-events-none"
                      onClick={() => {
                        setOpenPactSlots(false);
                        restorePactSlotOnce();
                      }}
                    >
                      Відновити
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Spell List */}
      <Card className="glass-card bg-white/5 border-purple-300/20">
        <CardHeader className="pb-3 space-y-3">
          <CardTitle className="text-lg flex items-center gap-2 text-purple-50">
            <Wand2 className="w-5 h-5" />
            <span className="uppercase tracking-wide text-indigo-300">Заклинання</span>
          </CardTitle>
          <div className="w-full">
            {!isReadOnly && (
              <div className="grid w-full grid-cols-1 gap-2">
                <AddSpellDialog 
                  pers={localPers} 
                  triggerClassName="h-9 w-full justify-center"
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <SpellcastingCountsBlock
            lines={spellcastingCounts}
            knownSpellsCount={knownSpellsCount}
            knownCantripsCount={knownCantripsCount}
            preparedSpellsCount={preparedSpellsCount}
            preparedTallies={preparedTallies}
            excludedFromPreparedCount={excludedFromPreparedCountSpellIds.size}
            excludedFromKnownCount={excludedFromKnownCountSpellIds.size}
            spellbook={wizardSpellbook}
          />

          <Input
            value={spellQuery}
            onChange={(e) => setSpellQuery(e.target.value)}
            placeholder="Пошук заклинань…"
            className="bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-400"
          />

          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setSortMode((prev) => (prev === "level" ? "badge" : "level"))}
              className="h-9 w-full justify-between gap-2 border-white/10 bg-white/5 px-3 text-slate-200 hover:bg-white/10"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {sortMode === "level" ? "Сортування: за рівнем" : "Сортування: за бейджем"}
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={cycleFilterMode}
              className="h-9 w-full justify-between gap-2 border-white/10 bg-white/5 px-3 text-slate-200 hover:bg-white/10"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {filterLabel}
            </Button>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${sortMode}:${filterMode}:${spellQuery.trim().toLocaleLowerCase("uk")}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="space-y-3"
            >
              {sortMode === "level" && levels.map((level) => {
                const list = spellsByLevel[level] ?? [];
                if (!list.length) return null;

                return (
                  <SpellListGroup
                    key={level}
                    title={level === 0 ? "Замовляння" : "Рівень " + level}
                    spells={list}
                    isPending={isPending}
                    isReadOnly={isReadOnly}
                    onOpenSpell={openSpell}
                    onOpenSettings={openBadgeEditor}
                    rightActionPlacement="belowMeta"
                    rightAction={renderSpellActions}
                  />
                );
              })}

              {sortMode === "badge" && badgeGroups.map((badge) => {
                const list = spellsByBadge[badge] ?? [];
                if (!list.length) return null;

                return (
                  <SpellListGroup
                    key={badge}
                    title={badge}
                    spells={list}
                    isPending={isPending}
                    isReadOnly={isReadOnly}
                    onOpenSpell={openSpell}
                    onOpenSettings={openBadgeEditor}
                    subtitleVariant="with-level"
                    rightActionPlacement="belowMeta"
                    rightAction={renderSpellActions}
                  />
                );
              })}
            </motion.div>
          </AnimatePresence>

          {((sortMode === "level" && levels.length === 0) || (sortMode === "badge" && badgeGroups.length === 0)) && (
            <div className="text-purple-300/60 text-sm text-center py-8">
              {spellQuery.trim()
                ? "Нічого не знайдено"
                : filterMode === "all"
                  ? "Заклинання відсутні"
                  : filterMode === "prepared"
                    ? "Підготовлені заклинання відсутні"
                    : "Непідготовлені заклинання відсутні"}
            </div>
          )}

        </CardContent>
      </Card>

      <Dialog
        open={badgeEditorOpen}
        onOpenChange={(open) => {
          setBadgeEditorOpen(open);
          if (!open) {
            setConfirmDeleteInBadgeEditor(false);
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-1rem)] max-h-[92dvh] overflow-y-auto sm:max-w-[520px] glass-card border-white/10 bg-slate-900/45 text-slate-100">
          <DialogHeader>
            <DialogTitle>Налаштування заклинання: {badgeEditorSpellName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Підказки (бейджики)</p>

              {badgeClassHints.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-slate-400">Класи персонажа</p>
                  <div className="flex flex-wrap gap-1.5">
                    {badgeClassHints.map((hint) => (
                      <button
                        key={`class-${hint}`}
                        type="button"
                        onClick={() => applyBadgeHint(hint, BADGE_COLOR_CLASS)}
                        className="rounded-md border border-rose-400/30 bg-rose-500/20 px-2 py-1 text-xs font-medium text-rose-100 hover:bg-rose-500/30"
                      >
                        {hint}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {badgeSubclassHints.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-slate-400">Підкласи персонажа</p>
                  <div className="flex flex-wrap gap-1.5">
                    {badgeSubclassHints.map((hint) => (
                      <button
                        key={`subclass-${hint}`}
                        type="button"
                        onClick={() => applyBadgeHint(hint, BADGE_COLOR_SUBCLASS, true)}
                        className="rounded-md border border-amber-400/30 bg-amber-500/20 px-2 py-1 text-xs font-medium text-amber-100 hover:bg-amber-500/30"
                      >
                        {hint}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {badgeRaceHints.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-slate-400">Раса / підраса / варіант / опції</p>
                  <div className="flex flex-wrap gap-1.5">
                    {badgeRaceHints.map((hint) => (
                      <button
                        key={`race-${hint}`}
                        type="button"
                        onClick={() => applyBadgeHint(hint, BADGE_COLOR_RACE, true)}
                        className="rounded-md border border-sky-400/30 bg-sky-500/20 px-2 py-1 text-xs font-medium text-sky-100 hover:bg-sky-500/30"
                      >
                        {hint}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <p className="text-[11px] text-slate-400">Базові</p>
                <div className="flex flex-wrap gap-1.5">
                  {badgeBaseHints.map((hint) => (
                    <button
                      key={`base-${hint.label}`}
                      type="button"
                      onClick={() => applyBadgeHint(hint.label, hint.color || BADGE_COLOR_BASE, hint.autoExclude)}
                      className="rounded-md border border-violet-400/30 bg-violet-500/20 px-2 py-1 text-xs font-medium text-violet-100 hover:bg-violet-500/30"
                    >
                      {hint.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Input
              value={badgeEditorText}
              onChange={(e) => setBadgeEditorText(e.target.value)}
              maxLength={24}
              placeholder="Текст бейджа"
              className="bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-400"
            />

            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">Колір бейджа</p>
              <div className="grid grid-cols-8 gap-2">
                {SPELL_BADGE_COLORS.map((color) => {
                  const isActive = badgeEditorColor === color.value;
                  return (
                    <button
                      key={color.value}
                      type="button"
                      title={color.name}
                      className={`h-8 w-8 rounded-full border ${isActive ? "ring-2 ring-white/70" : "border-white/10"}`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setBadgeEditorColor(color.value)}
                    />
                  );
                })}
              </div>
            </div>

            <label className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 cursor-pointer">
              <Checkbox
                checked={badgeEditorExcludeFromPreparedCount}
                onCheckedChange={(checked) => setBadgeEditorExcludeFromPreparedCount(Boolean(checked))}
                disabled={isPending || isReadOnly}
                className="mt-0.5 border-white/30 data-[state=checked]:bg-sky-500 data-[state=checked]:text-white"
              />
              <span className="text-xs text-slate-200">
                Не враховувати це заклинання у кількості підготовлених (зручно для ритуалів, що завжди доступні).
              </span>
            </label>

            <label className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 cursor-pointer">
              <Checkbox
                checked={badgeEditorExcludeFromKnownCount}
                onCheckedChange={(checked) => setBadgeEditorExcludeFromKnownCount(Boolean(checked))}
                disabled={isPending || isReadOnly}
                className="mt-0.5 border-white/30 data-[state=checked]:bg-violet-500 data-[state=checked]:text-white"
              />
              <span className="text-xs text-slate-200">
                Не враховувати це заклинання у кількості відомих заклинань і замовлянь.
              </span>
            </label>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <Button
                variant={confirmDeleteInBadgeEditor ? "destructive" : "outline"}
                className={(confirmDeleteInBadgeEditor ? "" : "border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20") + " w-full sm:w-auto"}
                disabled={isPending || isReadOnly || !Number.isFinite(badgeEditorSpellId)}
                onClick={() => {
                  if (!Number.isFinite(badgeEditorSpellId) || isReadOnly) return;

                  if (!confirmDeleteInBadgeEditor) {
                    setConfirmDeleteInBadgeEditor(true);
                    return;
                  }

                  const spellId = Number(badgeEditorSpellId);
                  startTransition(async () => {
                    const res = await removeSpellFromPers({ persId: localPers.persId, spellId });
                    if (!res.success) return;

                    setLocalPersSpells((prev: any[]) =>
                      prev.filter((item) => Number(item?.spellId ?? item?.spell?.spellId) !== spellId)
                    );
                    setBadgeEditorOpen(false);
                    setConfirmDeleteInBadgeEditor(false);
                    router.refresh();
                  });
                }}
              >
                {confirmDeleteInBadgeEditor ? "Підтвердити видалення" : "Видалити заклинання"}
              </Button>

              <div className="flex w-full gap-2 sm:w-auto">
                <Button variant="ghost" className="flex-1 sm:flex-none" onClick={() => setBadgeEditorOpen(false)} disabled={isPending}>
                  Скасувати
                </Button>
                <Button
                  className="flex-1 sm:flex-none"
                  disabled={isPending || !Number.isFinite(badgeEditorSpellId)}
                  onClick={() => {
                    if (!Number.isFinite(badgeEditorSpellId)) return;
                    const spellId = Number(badgeEditorSpellId);
                    const nextText = badgeEditorText.trim().slice(0, 24);

                    setLocalPersSpells((prev: any[]) =>
                      prev.map((item) => {
                        const itemSpellId = Number(item?.spellId ?? item?.spell?.spellId);
                        if (itemSpellId !== spellId) return item;
                        return {
                          ...item,
                          badgeText: nextText || null,
                          badgeColor: nextText ? badgeEditorColor : null,
                          excludeFromPreparedCount: badgeEditorExcludeFromPreparedCount,
                          excludeFromKnownCount: badgeEditorExcludeFromKnownCount,
                        };
                      })
                    );

                    startTransition(async () => {
                      const res = await updateSpellBadgeForPers({
                        persId: localPers.persId,
                        spellId,
                        badgeText: nextText,
                        badgeColor: badgeEditorColor,
                        excludeFromPreparedCount: badgeEditorExcludeFromPreparedCount,
                        excludeFromKnownCount: badgeEditorExcludeFromKnownCount,
                      });
                      if (!res.success) {
                        router.refresh();
                        return;
                      }

                      setLocalPersSpells((prev: any[]) =>
                        prev.map((item) => {
                          const itemSpellId = Number(item?.spellId ?? item?.spell?.spellId);
                          if (itemSpellId !== spellId) return item;
                          return {
                            ...item,
                            badgeText: res.badgeText,
                            badgeColor: res.badgeColor,
                            excludeFromPreparedCount: res.excludeFromPreparedCount,
                            excludeFromKnownCount: res.excludeFromKnownCount,
                          };
                        })
                      );
                      setBadgeEditorOpen(false);
                      router.refresh();
                    });
                  }}
                >
                  Зберегти
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ModifyStatModal 
        open={modifyConfig !== null}
        onOpenChange={(open) => !open && setModifyConfig(null)}
        pers={localPers}
        onPersUpdate={(next) => {
            setLocalPers(next);
            onPersUpdate(next);
        }}
        config={modifyConfig}
      />
    </div>
  );
});

export default MagicSlide;
