"use client";

import {PersWithRelations} from "@/lib/actions/pers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {Plus, Filter} from "lucide-react";
import {useCallback, useEffect, useMemo, useState, useTransition} from "react";
import {calculateCasterLevel} from "@/lib/logic/spell-logic";
import {SPELL_SLOT_PROGRESSION} from "@/lib/refs/static";
import {useRouter} from "next/navigation";
import {Button} from "@/components/ui/button";
import {classTranslations, subclassTranslations} from "@/lib/refs/translation";
import {getSpellcastingCountsLines} from "@/lib/logic/spellcasting-progression";
import {
  getEffectiveExcludeFromKnownCount,
} from "@/lib/logic/spell-prepared-exclusions";
import {buildCharacterLevels} from "@/rules/character-level";
import { findMaxPreparableSpellLevelByClass, findPreparableSpellLevelBySpellList } from "@/rules/spell-preparation-2024";

function extractKnownSpellIds(pers: PersWithRelations): Set<number> {
  const ids = new Set<number>();
  for (const ps of ((pers as any).persSpells ?? []) as any[]) {
    const spellId = Number(ps?.spellId ?? ps?.spell?.spellId);
    if (Number.isFinite(spellId)) ids.add(spellId);
  }
  return ids;
}

function extractSpellLevelsById(pers: PersWithRelations): Record<number, number> {
  const levels: Record<number, number> = {};
  for (const ps of ((pers as any).persSpells ?? []) as any[]) {
    const spellId = Number(ps?.spellId ?? ps?.spell?.spellId);
    if (!Number.isFinite(spellId)) continue;
    const level = Number(ps?.spell?.level ?? 1);
    levels[spellId] = Number.isFinite(level) ? Math.max(0, Math.trunc(level)) : 1;
  }
  return levels;
}

function findMaxSlotSpellLevel(pers: PersWithRelations): number {
  const caster = calculateCasterLevel(pers as any);
  const casterLevel = Math.max(0, Math.min(20, Math.trunc(caster.casterLevel || 0)));
  const pactLevel = Math.max(0, Math.min(20, Math.trunc(caster.pactLevel || 0)));

  let standardMax = 0;
  if (casterLevel > 0) {
    const row = (SPELL_SLOT_PROGRESSION as any).FULL?.[casterLevel] as number[] | undefined;
    if (Array.isArray(row)) {
      for (let i = row.length - 1; i >= 0; i--) {
        if (row[i] > 0) {
          standardMax = i + 1;
          break;
        }
      }
    }
  }

  const pactRow = (SPELL_SLOT_PROGRESSION as any).PACT?.[pactLevel] as {
    slots: number;
    level: number
  } | undefined;
  const pactMax = pactRow?.level ? Math.max(0, Math.min(9, Math.trunc(pactRow.level))) : 0;

  return Math.max(standardMax, pactMax);
}

// 2024: межа — найвищий рівень у власній таблиці кожного класу, а не найвищий слот персонажа (KR27.7).
type PreparableSpellLevels = { byClass: Record<string, number>; bySpellList: Record<string, number> };

function findMaxPreparableSpellLevelByClass2024(pers: PersWithRelations): PreparableSpellLevels {
  const mainClassName = pers.class?.name;
  if (!mainClassName) return { byClass: {}, bySpellList: {} };

  const multiclasses = pers.multiclasses.map((mc) => ({className: mc.class.name, classLevel: mc.classLevel}));
  const levels = buildCharacterLevels({characterLevel: pers.level, mainClassName, multiclasses});
  const classLevels = Object.fromEntries(levels.classLevels.map((entry) => [entry.className, entry.classLevel]));
  const subclassByClass: Record<string, string | null> = {[mainClassName]: pers.subclass?.name ?? null};
  for (const mc of pers.multiclasses) subclassByClass[mc.class.name] = mc.subclass?.name ?? null;

  return {
    byClass: findMaxPreparableSpellLevelByClass(classLevels, subclassByClass),
    bySpellList: findPreparableSpellLevelBySpellList(classLevels, subclassByClass),
  };
}

function formatMaxSpellLevelByClassParam(byClass: Record<string, number>): string {
  return Object.entries(byClass).map(([className, level]) => `${className}:${level}`).join(",");
}

function extractKnownExcludedSpellIds(pers: PersWithRelations): Set<number> {
  const ids = new Set<number>();

  for (const ps of ((pers as any).persSpells ?? []) as any[]) {
    const spellId = Number(ps?.spellId ?? ps?.spell?.spellId);
    if (!Number.isFinite(spellId)) continue;
    if (getEffectiveExcludeFromKnownCount(ps)) ids.add(spellId);
  }

  return ids;
}

// We need a server action to fetch the base spells list
// Let's assume we'll add getBaseSpells to spell-actions.ts or similar


interface AddSpellDialogProps {
  pers: PersWithRelations;
  isReadOnly?: boolean;
  triggerClassName?: string;
}

type SpellCounterLine = {
  key: string;
  name: string;
  level: number;
  cantripKnown: number;
  cantripTarget: number | null;
  spellKnown: number;
  spellTarget: number | null;
};

function normalizeSpellCounterLabel(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return raw.toLocaleLowerCase("uk");
}

function buildSpellCounterLines(
  lines: ReturnType<typeof getSpellcastingCountsLines>,
  knownSpellIds: Set<number>,
  spellLevelById: Record<number, number>,
  badgeTextBySpellId: Record<number, string | null | undefined>,
  excludedSpellIds: Set<number>
): SpellCounterLine[] {
  const counters = lines.map((line) => ({
    key: line.key,
    name: line.name,
    level: line.level,
    cantripKnown: 0,
    cantripTarget: Number.isFinite(line.cantrips) ? Math.max(0, Math.trunc(line.cantrips)) : null,
    spellKnown: 0,
    spellTarget:
      line.spells.kind === "fixed"
        ? Math.max(0, Math.trunc(line.spells.value))
        : (typeof line.spells.value === "number" && Number.isFinite(line.spells.value)
            ? Math.max(0, Math.trunc(line.spells.value))
            : null),
  }));

  for (const spellId of knownSpellIds) {
    if (!Number.isFinite(spellId) || excludedSpellIds.has(spellId)) continue;

    const spellLevel = Number(spellLevelById[spellId] ?? 1);
    const typeKey = spellLevel === 0 ? "cantripKnown" : "spellKnown";
    const badgeLabel = normalizeSpellCounterLabel(badgeTextBySpellId[spellId]);
    if (!badgeLabel) continue;

    const bucket = counters.find((line) => normalizeSpellCounterLabel(line.name) === badgeLabel);
    if (bucket) bucket[typeKey] += 1;
  }

  return counters;
}

export default function AddSpellDialog({pers, isReadOnly, triggerClassName}: AddSpellDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState(true);
  const [useFilters, setUseFilters] = useState(true);
  const [knownSpellIds, setKnownSpellIds] = useState<Set<number>>(() => extractKnownSpellIds(pers));
  const [spellLevelById, setSpellLevelById] = useState<Record<number, number>>(() => extractSpellLevelsById(pers));
  const [knownExcludedSpellIds, setKnownExcludedSpellIds] = useState<Set<number>>(() => extractKnownExcludedSpellIds(pers));
  const router = useRouter();
  const [_isPending, startTransition] = useTransition();

  useEffect(() => {
    setKnownSpellIds(extractKnownSpellIds(pers));
    setSpellLevelById(extractSpellLevelsById(pers));
    setKnownExcludedSpellIds(extractKnownExcludedSpellIds(pers));
  }, [pers]);

  const effectiveKnownSpellsCount = useMemo(() => {
    let count = 0;
    for (const spellId of knownSpellIds) {
      if (knownExcludedSpellIds.has(spellId)) continue;
      const level = Number(spellLevelById[spellId] ?? 1);
      if (level === 0) continue;
      count += 1;
    }
    return count;
  }, [knownSpellIds, knownExcludedSpellIds, spellLevelById]);

  const effectiveKnownCantripsCount = useMemo(() => {
    let count = 0;
    for (const spellId of knownSpellIds) {
      if (knownExcludedSpellIds.has(spellId)) continue;
      const level = Number(spellLevelById[spellId] ?? 1);
      if (level !== 0) continue;
      count += 1;
    }
    return count;
  }, [knownSpellIds, knownExcludedSpellIds, spellLevelById]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "SPELL_TOGGLED") {
        const payload = event.data as { type: string; persId?: unknown; spellId?: unknown; spellLevel?: unknown; added?: unknown };
        const payloadPersId = Number(payload?.persId);
        const payloadSpellId = Number(payload?.spellId);
        const payloadSpellLevel = Number(payload?.spellLevel);
        const isSamePers = Number.isFinite(payloadPersId) && payloadPersId === pers.persId;

        if (isSamePers && Number.isFinite(payloadSpellId) && typeof payload?.added === "boolean") {
          setKnownSpellIds((prev) => {
            const next = new Set(prev);
            if (payload.added) next.add(payloadSpellId);
            else next.delete(payloadSpellId);
            return next;
          });

          if (payload.added && Number.isFinite(payloadSpellLevel)) {
            setSpellLevelById((prev) => ({
              ...prev,
              [payloadSpellId]: Math.max(0, Math.trunc(payloadSpellLevel)),
            }));
          }
        }

        startTransition(() => {
          router.refresh();
        });
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [router, pers.persId]);

  const is2024 = pers.ruleset === "RULES_2024";

  const maxSpellLevelByClass = useMemo(
    () => (is2024 ? findMaxPreparableSpellLevelByClass2024(pers) : { byClass: {}, bySpellList: {} }),
    [pers, is2024]
  );

  const maxSpellLevel = useMemo(() => {
    if (is2024) return Math.max(0, ...Object.values(maxSpellLevelByClass.byClass));
    return findMaxSlotSpellLevel(pers);
  }, [pers, is2024, maxSpellLevelByClass]);

  const knownSpellsTarget = useMemo(() => {
    const lines = getSpellcastingCountsLines(pers);
    const fixedTotal = lines.reduce((sum, line) => {
      if (line.spells.kind !== "fixed") return sum;
      return sum + Math.max(0, Math.trunc(line.spells.value));
    }, 0);

    const preparedCapForAllKnown = lines.reduce((sum, line) => {
      const isAllKnownCasterLine = line.spellsLabel.includes("знає всі — можна підготувати");
      if (!isAllKnownCasterLine) return sum;
      if (line.spells.kind !== "formula") return sum;
      if (typeof line.spells.value !== "number" || !Number.isFinite(line.spells.value)) return sum;
      return sum + Math.max(0, Math.trunc(line.spells.value));
    }, 0);

    if (fixedTotal > 0) return fixedTotal;
    if (preparedCapForAllKnown > 0) return preparedCapForAllKnown;
    return null;
  }, [pers]);

  const cantripTarget = useMemo(() => {
    const lines = getSpellcastingCountsLines(pers);
    const total = lines.reduce((sum, line) => sum + Math.max(0, Math.trunc(line.cantrips || 0)), 0);
    return total > 0 ? total : null;
  }, [pers]);

  const spellcastingCounts = useMemo(() => getSpellcastingCountsLines(pers), [pers]);

  const badgeTextBySpellId = useMemo<Record<number, string | null | undefined>>(() => {
    const out: Record<number, string | null | undefined> = {};
    for (const ps of ((pers as any).persSpells ?? []) as any[]) {
      const spellId = Number(ps?.spellId ?? ps?.spell?.spellId);
      if (!Number.isFinite(spellId)) continue;
      out[spellId] = ps?.badgeText;
    }
    return out;
  }, [pers]);

  const compactSpellCounters = useMemo(
    () => buildSpellCounterLines(
      spellcastingCounts,
      knownSpellIds,
      spellLevelById,
      badgeTextBySpellId,
      knownExcludedSpellIds
    ),
    [spellcastingCounts, knownSpellIds, spellLevelById, badgeTextBySpellId, knownExcludedSpellIds]
  );

  const hasMultipleSpellSources = compactSpellCounters.length > 1;

  const buildSpellsUrl = useCallback((applyFilters: boolean) => {
    const params = new URLSearchParams();
    params.set("origin", "character");
    params.set("persId", String(pers.persId));
    params.set("persName", pers.name || `Персонаж #${pers.persId}`);
    if (typeof knownSpellsTarget === "number" && Number.isFinite(knownSpellsTarget)) {
      params.set("knownTarget", String(Math.max(0, Math.trunc(knownSpellsTarget))));
    }
    if (typeof cantripTarget === "number" && Number.isFinite(cantripTarget)) {
      params.set("cantripTarget", String(Math.max(0, Math.trunc(cantripTarget))));
    }
    if (knownExcludedSpellIds.size > 0) {
      params.set("knownExcluded", Array.from(knownExcludedSpellIds).sort((a, b) => a - b).join(","));
    }

    if (applyFilters) {
      if (maxSpellLevel > 0) params.set("maxSpellLevel", String(maxSpellLevel));
      const maxSpellLevelByClassParam = formatMaxSpellLevelByClassParam(maxSpellLevelByClass.bySpellList);
      if (maxSpellLevelByClassParam) params.set("maxSpellLevelByClass", maxSpellLevelByClassParam);
      // Add class filter
      const classNames: string[] = [];
      if (pers.class?.name) {
        const key = pers.class.name as keyof typeof classTranslations;
        classNames.push(classTranslations[key] || String(pers.class.name));
      }
      pers.multiclasses?.forEach((mc: any) => {
        if (mc.class?.name) {
          const key = mc.class.name as keyof typeof classTranslations;
          classNames.push(classTranslations[key] || String(mc.class.name));
        }
      });
      if (classNames.length > 0) params.set("cls", classNames.join(","));

      // Add subclass filter (spells page expects translated subclass names in `sub`)
      const subclassNames: string[] = [];
      if ((pers as any).subclass?.name) {
        const key = (pers as any).subclass.name as keyof typeof subclassTranslations;
        subclassNames.push(subclassTranslations[key] || String((pers as any).subclass.name));
      }
      pers.multiclasses?.forEach((mc: any) => {
        if (mc.subclass?.name) {
          const key = mc.subclass.name as keyof typeof subclassTranslations;
          subclassNames.push(subclassTranslations[key] || String(mc.subclass.name));
        }
      });
      if (subclassNames.length > 0) params.set("sub", Array.from(new Set(subclassNames)).join(","));
    }

    return `${is2024 ? "/2024/spells" : "/spells"}?${params.toString()}`;
  }, [pers, is2024, maxSpellLevel, maxSpellLevelByClass, knownSpellsTarget, cantripTarget, knownExcludedSpellIds]);

  const url = useMemo(() => buildSpellsUrl(useFilters), [buildSpellsUrl, useFilters]);

  const classList = useMemo(() => {
    const names: string[] = [];
    if (pers.class?.name) names.push(classTranslations[pers.class.name as keyof typeof classTranslations] || pers.class.name);
    pers.multiclasses?.forEach((mc: any) => {
      if (mc.class?.name) names.push(classTranslations[mc.class.name as keyof typeof classTranslations] || mc.class.name);
    });
    return names;
  }, [pers]);

  const subclassList = useMemo(() => {
    const names: string[] = [];
    if ((pers as any).subclass?.name) {
      const key = (pers as any).subclass.name as keyof typeof subclassTranslations;
      names.push(subclassTranslations[key] || String((pers as any).subclass.name));
    }
    pers.multiclasses?.forEach((mc: any) => {
      if (mc.subclass?.name) {
        const key = mc.subclass.name as keyof typeof subclassTranslations;
        names.push(subclassTranslations[key] || String(mc.subclass.name));
      }
    });
    return Array.from(new Set(names));
  }, [pers]);

  return (
    <div className="space-y-2">
      <Dialog 
        open={open} 
        onOpenChange={(val) => {
          setOpen(val);
          if (!val) {
            setConfirmMode(true);
          }
        }}
      >
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isReadOnly}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className={"swiper-no-swiping h-8 gap-1.5 border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-200 " + (triggerClassName ?? "")}
          >
            <Plus className="w-3.5 h-3.5"/>
            Додати
          </Button>
        </DialogTrigger>
        <DialogContent
          className={`${confirmMode ? 'max-w-md' : 'max-w-6xl'} min-h-0 bg-slate-900 border-white/10 text-white p-0 overflow-hidden flex flex-col ${confirmMode ? 'h-auto' : 'h-[90vh]'}`}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {confirmMode ? (
            <div className="p-6 space-y-6">
              <div className="space-y-2 text-center text-slate-200">
                <div
                  className="mx-auto w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                  <Filter className="w-6 h-6"/>
                </div>
                <DialogTitle className="text-xl font-bold">Фільтрація за персонажем</DialogTitle>
                <p className="text-sm text-slate-400">Чи бажаєте активувати фільтри вашого поточного
                  персонажа?</p>
              </div>

              <div className="glass-panel border border-white/10 rounded-xl p-4 bg-white/5 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Класи:</span>
                  <span className="font-semibold text-indigo-300">{classList.join(", ") || "—"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Підкласи:</span>
                  <span
                    className="font-semibold text-indigo-300">{subclassList.join(", ") || "—"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Макс. рівень:</span>
                  <span
                    className="font-semibold text-indigo-300">{maxSpellLevel > 0 ? maxSpellLevel : "Замовляння"}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => {
                    setUseFilters(true);
                    setConfirmMode(false);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-12"
                >
                  Так, з фільтрами
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setUseFilters(false);
                    setConfirmMode(false);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  Ні, без фільтрів
                </Button>
              </div>
            </div>
          ) : (
            <>
              <DialogHeader className="border-b border-white/10 px-3 py-2">
                <div className="space-y-2">
                  {!hasMultipleSpellSources ? (
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
                      <span>
                        Заклинань: <span className="font-semibold">{effectiveKnownSpellsCount}</span>
                        {knownSpellsTarget !== null ? (
                          <span className="text-emerald-200/80"> / {knownSpellsTarget}</span>
                        ) : null}
                      </span>
                      <span className="text-emerald-200/80"> · </span>
                      <span>
                        Замовлянь: <span className="font-semibold">{effectiveKnownCantripsCount}</span>
                        {cantripTarget !== null ? (
                          <span className="text-emerald-200/80"> / {cantripTarget}</span>
                        ) : null}
                      </span>
                    </div>
                  ) : null}

                  {hasMultipleSpellSources ? (
                    <div className="space-y-1">
                      {compactSpellCounters.map((line) => (
                        <div
                          key={line.key}
                          className="overflow-x-auto whitespace-nowrap rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] leading-4 text-slate-200 sm:text-xs"
                        >
                          <span className="font-semibold text-slate-100">{line.name}</span>
                          <span className="text-slate-400"> ({line.level}):</span>
                          {line.cantripTarget && line.cantripTarget > 0 ? (
                            <>
                              <span>{" "}замовлянь </span>
                              <span className="font-semibold text-slate-100">{line.cantripKnown}/{line.cantripTarget}</span>
                            </>
                          ) : null}
                          {line.cantripTarget && line.cantripTarget > 0 ? <span>{" "}</span> : null}
                          <span>заклинань </span>
                          <span className="font-semibold text-slate-100">
                            {line.spellKnown}
                            {line.spellTarget !== null ? `/${line.spellTarget}` : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </DialogHeader>

              <div className="min-h-0 flex-1 overflow-hidden bg-slate-950">
                <iframe
                  title="Spells"
                  src={url}
                  className="block h-full w-full border-0 bg-slate-950"
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
