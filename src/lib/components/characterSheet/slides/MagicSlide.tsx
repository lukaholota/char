"use client";

import { PersWithRelations } from "@/lib/actions/pers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatModifier } from "@/lib/logic/utils";
import { Check, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { SPELL_SLOT_PROGRESSION } from "@/lib/refs/static";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { spellSchoolTranslations } from "@/lib/refs/translation";
import { removeSpellFromPers, setSpellPrepared } from "@/lib/actions/spell-actions";
import { spendPactSlot, spendSpellSlot, restorePactSlot, restoreSpellSlot } from "@/lib/actions/spell-slots";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { calculateSpellAttack, calculateSpellDC } from "@/lib/logic/bonus-calculator";
import ModifyStatModal, { ModifyConfig } from "../ModifyStatModal";
import { Ability } from "@prisma/client";
import { calculateCasterLevel } from "@/lib/logic/spell-logic";
import AddSpellDialog from "../AddSpellDialog";

interface MagicSlideProps {
  pers: PersWithRelations;
  onPersUpdate: (next: PersWithRelations) => void;
  isReadOnly?: boolean;
}

export default function MagicSlide({ pers, onPersUpdate, isReadOnly }: MagicSlideProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [confirmDeleteSpellId, setConfirmDeleteSpellId] = useState<number | null>(null);
  const [removingSpellIds, setRemovingSpellIds] = useState<Set<number>>(() => new Set());

  const [localPers, setLocalPers] = useState<PersWithRelations>(pers);
  const [modifyConfig, setModifyConfig] = useState<ModifyConfig | null>(null);

  useEffect(() => {
    setLocalPers(pers);
  }, [pers]);

  const spellcastingAbility = localPers.class?.primaryCastingStat;
  
  const spellAttackBonus = useMemo(() => {
    if (!spellcastingAbility) return 0;
    return calculateSpellAttack(localPers, spellcastingAbility as Ability);
  }, [localPers, spellcastingAbility]);

  const spellSaveDC = useMemo(() => {
    if (!spellcastingAbility) return 8;
    return calculateSpellDC(localPers, spellcastingAbility as Ability);
  }, [localPers, spellcastingAbility]);

  const [localPersSpells, setLocalPersSpells] = useState(() => (localPers as any).persSpells ?? []);
  const [spellQuery, setSpellQuery] = useState("");

  // If data refreshes from server, keep local list in sync.
  useEffect(() => {
    setLocalPersSpells((localPers as any).persSpells ?? []);
  }, [localPers]);

  const [localCurrentSlots, setLocalCurrentSlots] = useState<number[]>(() => {
    const raw = (pers.currentSpellSlots ?? []) as number[];
    return Array.from({ length: 9 }, (_, idx) => {
      const v = raw[idx];
      return Number.isFinite(v) ? Math.max(0, Math.trunc(v)) : 0;
    });
  });

  const [localPactSlots, setLocalPactSlots] = useState<number>(() => {
    const v = (pers as any).currentPactSlots;
    return Number.isFinite(v) ? Math.max(0, Math.trunc(v)) : 0;
  });

  useEffect(() => {
    const raw = (localPers.currentSpellSlots ?? []) as number[];
    setLocalCurrentSlots(
      Array.from({ length: 9 }, (_, idx) => {
        const v = raw[idx];
        return Number.isFinite(v) ? Math.max(0, Math.trunc(v)) : 0;
      })
    );
    const pact = (localPers as any).currentPactSlots;
    setLocalPactSlots(Number.isFinite(pact) ? Math.max(0, Math.trunc(pact)) : 0);
  }, [localPers.currentSpellSlots, (localPers as any).currentPactSlots]);

  const caster = useMemo(() => calculateCasterLevel(localPers as any), [localPers]);

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
        const aName = String(a?.spell?.name ?? "");
        const bName = String(b?.spell?.name ?? "");
        return aName.localeCompare(bName, "uk", { sensitivity: "base" });
      });
    }

    return byLevel;
  }, [localPersSpells, spellQuery]);

  const levels = useMemo(() => {
    return Object.keys(spellsByLevel)
      .map((k) => Number(k))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);
  }, [spellsByLevel]);

  const openSpell = (spellId: number) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("spell", String(spellId));
    window.history.pushState({}, "", url);
    window.dispatchEvent(new CustomEvent("spell:open", { detail: { spellId: String(spellId) } }));
    window.dispatchEvent(new Event("locationchange"));
  };

  return (
    <div
      className="h-full overflow-y-auto p-4 space-y-4"
      onClick={() => {
        setConfirmDeleteSpellId(null);
      }}
    >
      <AddSpellDialog 
        pers={localPers} 
        onPersUpdate={(next) => {
            setLocalPers(next);
            onPersUpdate(next);
        }} 
        isReadOnly={isReadOnly} 
      />

      {/* Spell Stats */}
      <div className="grid grid-cols-2 gap-2">
        <Card 
            className={"glass-card bg-fuchsia-500/20 border-fuchsia-400/40 transition " + (!isReadOnly ? "cursor-pointer hover:bg-fuchsia-500/30 active:scale-[0.98]" : "")}
            onClick={(e) => {
                e.stopPropagation();
                if (!isReadOnly) setModifyConfig({ type: "simple", field: "spellAttack" });
            }}
        >
          <CardContent className="p-3 text-center">
            <div className="text-[10px] font-bold uppercase tracking-wide text-fuchsia-300">Бонус атаки</div>
            <div className="text-2xl font-bold text-fuchsia-50 drop-shadow-[0_0_8px_rgba(217,70,239,0.4)]">{formatModifier(spellAttackBonus)}</div>
          </CardContent>
        </Card>
        <Card 
            className={"glass-card bg-fuchsia-500/20 border-fuchsia-400/40 transition " + (!isReadOnly ? "cursor-pointer hover:bg-fuchsia-500/30 active:scale-[0.98]" : "")}
            onClick={(e) => {
                e.stopPropagation();
                if (!isReadOnly) setModifyConfig({ type: "simple", field: "spellDC" });
            }}
        >
          <CardContent className="p-3 text-center">
            <div className="text-[10px] font-bold uppercase tracking-wide text-fuchsia-300">DC рятунку</div>
            <div className="text-2xl font-bold text-fuchsia-50 drop-shadow-[0_0_8px_rgba(217,70,239,0.4)]">{spellSaveDC}</div>
          </CardContent>
        </Card>
      </div>

      {/* Spell Slots */}
      <Card className="glass-card bg-white/5 border-purple-300/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-purple-50">
            <span className="uppercase tracking-wide text-indigo-300">Комірки</span>
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
                <DropdownMenu key={level}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      disabled={isPending || max <= 0 || isReadOnly}
                      title={isReadOnly ? "Режим перегляду" : max > 0 ? "Натисніть, щоб керувати комірками" : "Комірки недоступні"}
                      className={
                        "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center transition " +
                        (max > 0 && !isReadOnly ? "hover:bg-white/10 cursor-pointer" : "opacity-70 cursor-not-allowed")
                      }
                    >
                      <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">{level}-й</div>
                      <div className="text-sm font-semibold text-slate-50">
                        {cur}/{max}
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="bg-slate-900/95 border-white/10 text-slate-100 backdrop-blur-md">
                    <DropdownMenuItem 
                      disabled={!canSpend || isPending}
                      className="focus:bg-white/10 focus:text-slate-50 cursor-pointer"
                      onClick={(e) => {
                        if (!canSpend) return;
                        setLocalCurrentSlots((prev) => {
                          const next = prev.slice();
                          next[idx] = Math.max(0, (next[idx] ?? 0) - 1);
                          return next;
                        });
                        startTransition(async () => {
                          const res = await spendSpellSlot(localPers.persId, level);
                          if (!res.success) {
                            router.refresh();
                            return;
                          }
                          setLocalCurrentSlots(
                            Array.from({ length: 9 }, (_, j) => {
                              const v = res.currentSpellSlots[j];
                              return Number.isFinite(v) ? Math.max(0, Math.trunc(v)) : 0;
                            })
                          );
                          router.refresh();
                        });
                      }}
                    >
                      Витратити
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      disabled={!canRestore || isPending}
                      className="focus:bg-white/10 focus:text-slate-50 cursor-pointer"
                      onClick={(e) => {
                        if (!canRestore) return;
                        setLocalCurrentSlots((prev) => {
                          const next = prev.slice();
                          next[idx] = Math.min(max, (next[idx] ?? 0) + 1);
                          return next;
                        });
                        startTransition(async () => {
                          const res = await restoreSpellSlot(localPers.persId, level);
                          if (!res.success) {
                            router.refresh();
                            return;
                          }
                          setLocalCurrentSlots(
                            Array.from({ length: 9 }, (_, j) => {
                              const v = res.currentSpellSlots[j];
                              return Number.isFinite(v) ? Math.max(0, Math.trunc(v)) : 0;
                            })
                          );
                          router.refresh();
                        });
                      }}
                    >
                      Відновити
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}
          </div>

          {pactInfo ? (
            <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Магія пакту</div>
                <div className="text-sm font-semibold text-slate-50">
                  {localPactSlots}/{pactInfo.max} • рівень комірки: {pactInfo.slotLevel}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={isPending || isReadOnly}
                    title={isReadOnly ? "Режим перегляду" : "Натисніть, щоб керувати комірками Магії пакту"}
                  >
                    Керувати
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-slate-900/95 border-white/10 text-slate-100 backdrop-blur-md">
                  <DropdownMenuItem
                    disabled={localPactSlots <= 0 || isPending}
                    className="focus:bg-white/10 focus:text-slate-50 cursor-pointer"
                    onClick={(e) => {
                      if (!pactInfo || localPactSlots <= 0) return;
                      setLocalPactSlots((v) => Math.max(0, v - 1));
                      startTransition(async () => {
                        const res = await spendPactSlot(localPers.persId);
                        if (!res.success) {
                          router.refresh();
                          return;
                        }
                        setLocalPactSlots(Math.max(0, Math.trunc(res.currentPactSlots)));
                        router.refresh();
                      });
                    }}
                  >
                    Витратити
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={localPactSlots >= pactInfo.max || isPending}
                    className="focus:bg-white/10 focus:text-slate-50 cursor-pointer"
                    onClick={(e) => {
                      if (!pactInfo || localPactSlots >= pactInfo.max) return;
                      setLocalPactSlots((v) => Math.min(pactInfo.max, v + 1));
                      startTransition(async () => {
                        const res = await restorePactSlot(localPers.persId);
                        if (!res.success) {
                          router.refresh();
                          return;
                        }
                        setLocalPactSlots(Math.max(0, Math.trunc(res.currentPactSlots)));
                        router.refresh();
                      });
                    }}
                  >
                    Відновити
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Spell List */}
      <Card className="glass-card bg-white/5 border-purple-300/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-purple-50">
            <Sparkles className="w-5 h-5" />
            <span className="uppercase tracking-wide text-indigo-300">Заклинання</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={spellQuery}
            onChange={(e) => setSpellQuery(e.target.value)}
            placeholder="Пошук заклинань…"
            className="bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-400"
          />

          {levels.map((level) => {
            const list = spellsByLevel[level] ?? [];
            if (!list.length) return null;

            return (
              <Card key={level} className="border-white/10 bg-white/5">
                <CardHeader className="pb-2 py-3 bg-white/5">
                  <CardTitle className="text-base flex justify-between items-center">
                    <span>{level === 0 ? "Замовляння" : `Рівень ${level}`}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {list.map((ps: any, i: number) => {
                    const spell = ps?.spell;
                    const spellId = Number(spell?.spellId);
                    const isLast = i === list.length - 1;
                    const isConfirming = Number.isFinite(spellId) && confirmDeleteSpellId === spellId;
                    const isRemoving = Number.isFinite(spellId) && removingSpellIds.has(spellId);
                    const prepared = Boolean(ps?.isPrepared);
                    const canPrepare = Number(spell?.level ?? 0) > 0;

                    return (
                      <div
                        key={ps?.persSpellId ?? `${spellId}-${i}`}
                        className={
                          "w-full overflow-hidden p-3 transition-all duration-200 hover:bg-white/5 " +
                          (isLast ? "" : "border-b border-white/10 ") +
                          (isRemoving ? "opacity-0 translate-x-2 max-h-0 py-0" : "opacity-100 translate-x-0 max-h-24")
                        }
                      >
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            className="flex-1 min-w-0 max-w-[70%] text-left"
                            onClick={() => {
                              if (Number.isFinite(spellId)) openSpell(spellId);
                            }}
                          >
                            <div className="font-medium text-slate-50 truncate">{spell?.name ?? "—"}</div>
                            <div className="text-xs text-slate-300/70 truncate">
                              {(spellSchoolTranslations as any)[spell?.school] || spell?.school || "—"} • {spell?.castingTime ?? "—"} • {spell?.range ?? "—"}
                            </div>
                          </button>

                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              aria-label={prepared ? "Зняти підготовку" : "Позначити як підготовлене"}
                              disabled={isPending || !Number.isFinite(spellId) || isRemoving || !canPrepare || isReadOnly}
                              title={
                                isReadOnly
                                  ? "Режим перегляду"
                                  : canPrepare
                                  ? "Підготовлені заклинання — це заклинання, які ти готовий(а) кастувати зараз"
                                  : "Замовляння не потребують підготовки"
                              }
                              className={
                                "h-9 w-9 border transition-colors " +
                                (prepared
                                  ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
                                  : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10")
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!Number.isFinite(spellId) || isRemoving || !canPrepare || isReadOnly) return;
                                const nextPrepared = !prepared;
                                // ... rest of onClick

                                setLocalPersSpells((prev: any[]) =>
                                  prev.map((x) => {
                                    const xSpellId = Number(x?.spellId ?? x?.spell?.spellId);
                                    if (xSpellId !== spellId) return x;
                                    return { ...x, isPrepared: nextPrepared };
                                  })
                                );

                                startTransition(async () => {
                                  const res = await setSpellPrepared({
                                    persId: localPers.persId,
                                    spellId,
                                    isPrepared: nextPrepared,
                                  });
                                  if (!res.success) {
                                    router.refresh();
                                    return;
                                  }
                                  setLocalPersSpells((prev: any[]) =>
                                    prev.map((x) => {
                                      const xSpellId = Number(x?.spellId ?? x?.spell?.spellId);
                                      if (xSpellId !== spellId) return x;
                                      return { ...x, isPrepared: res.isPrepared };
                                    })
                                  );
                                  router.refresh();
                                });
                              }}
                            >
                              <Check className="h-4 w-4" />
                            </Button>

                            <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={isConfirming ? "Підтвердити видалення" : "Видалити заклинання"}
                            disabled={isPending || !Number.isFinite(spellId) || isRemoving || isReadOnly}
                            className={
                              "h-9 w-9 shrink-0 border transition-colors " +
                              (isConfirming
                                ? "border-red-400/40 bg-red-500/20 text-red-200 hover:bg-red-500/30"
                                : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10")
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!Number.isFinite(spellId) || isRemoving || isReadOnly) return;

                              if (!isConfirming) {
                                setConfirmDeleteSpellId(spellId);
                                return;
                              }

                              // Confirmed: animate out, then remove.
                              startTransition(async () => {
                                const res = await removeSpellFromPers({ persId: localPers.persId, spellId });
                                if (!res.success) return;

                                setRemovingSpellIds((prev) => {
                                  const next = new Set(prev);
                                  next.add(spellId);
                                  return next;
                                });

                                window.setTimeout(() => {
                                  setLocalPersSpells((prev: any[]) =>
                                    prev.filter((x) => Number(x?.spellId ?? x?.spell?.spellId) !== spellId)
                                  );
                                  setRemovingSpellIds((prev) => {
                                    const next = new Set(prev);
                                    next.delete(spellId);
                                    return next;
                                  });
                                  setConfirmDeleteSpellId(null);
                                  router.refresh();
                                }, 200);
                              });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}

          {levels.length === 0 && (
            <div className="text-purple-300/60 text-sm text-center py-8">
              {spellQuery.trim() ? "Нічого не знайдено" : "Заклинання відсутні"}
            </div>
          )}
        </CardContent>
      </Card>

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
}
