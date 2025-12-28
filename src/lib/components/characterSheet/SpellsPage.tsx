"use client";

import { PersWithRelations } from "@/lib/actions/pers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { spellSchoolTranslations } from "@/lib/refs/translation";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { calculateCasterLevel } from "@/lib/logic/spell-logic";
import { SPELL_SLOT_PROGRESSION } from "@/lib/refs/static";
import { spendSpellSlot, restoreSpellSlot, spendPactSlot, restorePactSlot } from "@/lib/actions/spell-slots";
import { useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function SpellsPage({ pers }: { pers: PersWithRelations }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const caster = calculateCasterLevel(pers as any);
    const casterLevel = caster.casterLevel;
    const pactLevel = caster.pactLevel;

    const maxSlotsRow = (SPELL_SLOT_PROGRESSION.FULL as any)[casterLevel] || [0, 0, 0, 0, 0, 0, 0, 0, 0];
    const currentSlots = Array.isArray(pers.currentSpellSlots) ? (pers.currentSpellSlots as number[]) : [0, 0, 0, 0, 0, 0, 0, 0, 0];

    const pactSlotInfo = (SPELL_SLOT_PROGRESSION.PACT as any)[pactLevel];
    const maxPactSlots = pactSlotInfo?.slots || 0;
    const pactSlotLevel = pactSlotInfo?.level || 0;
    const currentPactSlots = typeof pers.currentPactSlots === 'number' ? pers.currentPactSlots : 0;

    const spellsByLevel = pers.spells.reduce((acc, ps) => {
        const level = ps.level;
        if (!acc[level]) acc[level] = [];
        acc[level].push(ps);
        return acc;
    }, {} as Record<number, typeof pers.spells>);

    const levels = Object.keys(spellsByLevel).map(Number).sort((a, b) => a - b);
    // Ensure levels with slots are shown even if no spells are known at that level
    for (let i = 1; i <= 9; i++) {
        if (maxSlotsRow[i - 1] > 0 && !levels.includes(i)) {
            levels.push(i);
        }
    }
    // Also check pact slots
    if (pactSlotLevel > 0 && !levels.includes(pactSlotLevel)) {
        levels.push(pactSlotLevel);
    }
    levels.sort((a, b) => a - b);

    const handleToggleSlot = (level: number, isSpent: boolean) => {
        startTransition(async () => {
            const res = isSpent 
                ? await restoreSpellSlot(pers.persId, level)
                : await spendSpellSlot(pers.persId, level);
            if (!res.success) toast.error(res.error);
        });
    };

    const handleTogglePactSlot = (isSpent: boolean) => {
        startTransition(async () => {
            const res = isSpent
                ? await restorePactSlot(pers.persId)
                : await spendPactSlot(pers.persId);
            if (!res.success) toast.error(res.error);
        });
    };

    return (
        <div className="space-y-4 pb-20">
            {/* Pact Slots (if any) */}
            {maxPactSlots > 0 && (
                <Card className="bg-indigo-900/2 border-indigo-500/30 overflow-hidden border-l-4 border-l-indigo-500">
                    <CardHeader className="py-3 px-4 flex flex-row items-center justify-between bg-indigo-500/5">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-bold text-indigo-100 uppercase tracking-tight">Магія договору</CardTitle>
                            <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">Рівень {pactSlotLevel}</Badge>
                        </div>
                        <div className="text-xs font-bold text-indigo-300">{currentPactSlots} / {maxPactSlots}</div>
                    </CardHeader>
                    <CardContent className="p-3">
                        <div className="flex flex-wrap gap-2">
                            {Array.from({ length: maxPactSlots }).map((_, i) => {
                                const isAvailable = i < currentPactSlots;
                                return (
                                    <button
                                        key={i}
                                        disabled={isPending}
                                        onClick={() => handleTogglePactSlot(!isAvailable)}
                                        className={cn(
                                            "w-8 h-8 rounded-lg border-2 transition-all duration-300 flex items-center justify-center",
                                            isAvailable 
                                                ? "bg-indigo-500 border-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.4)]" 
                                                : "bg-slate-900/50 border-white/10 opacity-40 hover:opacity-100"
                                        )}
                                    >
                                        <div className={cn("w-2 h-2 rounded-full", isAvailable ? "bg-white" : "bg-white/20")} />
                                    </button>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {levels.map(level => {
                const max = maxSlotsRow[level - 1] || 0;
                const current = currentSlots[level - 1] || 0;
                const hasSlots = max > 0;

                return (
                    <Card key={level} className="bg-slate-900/50 border-white/10 overflow-hidden">
                        <CardHeader className="pb-2 py-3 bg-white/5">
                            <CardTitle className="text-base flex justify-between items-center group">
                                <span className="font-bold text-slate-100">
                                    {level === 0 ? "Замовляння" : `Рівень ${level}`}
                                </span>
                                {level > 0 && hasSlots && (
                                    <div className="flex items-center gap-3">
                                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest hidden sm:block">комірки</div>
                                        <div className="flex gap-1">
                                            {Array.from({ length: max }).map((_, i) => {
                                                const isAvailable = i < current;
                                                return (
                                                    <button
                                                        key={i}
                                                        disabled={isPending}
                                                        onClick={() => handleToggleSlot(level, !isAvailable)}
                                                        className={cn(
                                                            "w-5 h-5 rounded border transition-all duration-200 flex items-center justify-center",
                                                            isAvailable 
                                                                ? "bg-indigo-500 border-indigo-400" 
                                                                : "bg-slate-800 border-white/10 opacity-30 hover:opacity-100"
                                                        )}
                                                    >
                                                        {isAvailable && <div className="w-1 h-1 bg-white rounded-full" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <span className="text-xs font-bold text-indigo-300 ml-2">{current} / {max}</span>
                                    </div>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {spellsByLevel[level] && spellsByLevel[level].length > 0 ? (
                                spellsByLevel[level].map((spell, i) => (
                                    <button
                                        key={spell.spellId}
                                        type="button"
                                        className={cn(
                                            "w-full text-left p-3 transition-colors hover:bg-indigo-500/5 border-white/5",
                                            i !== spellsByLevel[level].length - 1 && "border-b"
                                        )}
                                        onClick={() => {
                                            const next = new URLSearchParams(searchParams.toString());
                                            next.set("spell", String(spell.spellId));
                                            const query = next.toString();
                                            router.push(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
                                        }}
                                    >
                                        <div className="font-bold text-slate-100 text-sm group-hover:text-indigo-200 transition">{spell.name}</div>
                                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                                            <span className="bg-white/5 px-1.5 py-0.5 rounded text-indigo-300">
                                                {spellSchoolTranslations[spell.school as keyof typeof spellSchoolTranslations] || spell.school}
                                            </span>
                                            <span>•</span>
                                            <span>{spell.castingTime}</span>
                                            <span>•</span>
                                            <span>{spell.range}</span>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                level > 0 && <div className="p-4 text-center text-xs text-slate-500 italic">Заклинання цього рівня не відомі</div>
                            )}
                        </CardContent>
                    </Card>
                );
            })}

            {levels.length === 0 && (
                <div className="text-center text-slate-500 py-12 flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-slate-600">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <span>Заклинання не відомі</span>
                </div>
            )}
        </div>
    );
}
