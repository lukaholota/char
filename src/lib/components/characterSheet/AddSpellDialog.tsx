"use client";

import { PersWithRelations } from "@/lib/actions/pers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, Plus, ExternalLink, Filter } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { calculateCasterLevel } from "@/lib/logic/spell-logic";
import { SPELL_SLOT_PROGRESSION } from "@/lib/refs/static";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { classTranslations } from "@/lib/refs/translation";

// We need a server action to fetch the base spells list
// Let's assume we'll add getBaseSpells to spell-actions.ts or similar


interface AddSpellDialogProps {
  pers: PersWithRelations;
  onPersUpdate: (next: PersWithRelations) => void;
  isReadOnly?: boolean;
}

export default function AddSpellDialog({ pers, onPersUpdate, isReadOnly }: AddSpellDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState(true);
  const [useFilters, setUseFilters] = useState(true);
  const router = useRouter();
  const wasOpenRef = useRef(false);

  // Calculate max spell level for embed mode
  const maxSpellLevel = useMemo(() => {
    const caster = calculateCasterLevel(pers as any);
    const level = Math.max(0, Math.min(20, Math.trunc(caster.casterLevel || 0)));
    if (level <= 0) return 0;
    const row = (SPELL_SLOT_PROGRESSION as any).FULL?.[level] as number[] | undefined;
    if (!Array.isArray(row)) return 0;
    // Find highest slot level with slots > 0
    for (let i = row.length - 1; i >= 0; i--) {
      if (row[i] > 0) return i + 1;
    }
    return 0;
  }, [pers]);

  const buildSpellsUrl = useCallback((applyFilters: boolean) => {
    const params = new URLSearchParams();
    params.set("origin", "character");
    params.set("persId", String(pers.persId));
    params.set("persName", pers.name || `Персонаж #${pers.persId}`);
    
    if (applyFilters) {
      if (maxSpellLevel > 0) params.set("maxSpellLevel", String(maxSpellLevel));
      // Add class filter
      const classNames: string[] = [];
      if (pers.class?.name) classNames.push(pers.class.name);
      pers.multiclasses?.forEach((mc: any) => {
        if (mc.class?.name) classNames.push(mc.class.name);
      });
      if (classNames.length > 0) params.set("cls", classNames.join(","));
    }
    
    return `/spells?${params.toString()}`;
  }, [pers, maxSpellLevel]);

  const url = useMemo(() => buildSpellsUrl(useFilters), [buildSpellsUrl, useFilters]);

  const classList = useMemo(() => {
    const names: string[] = [];
    if (pers.class?.name) names.push(classTranslations[pers.class.name as keyof typeof classTranslations] || pers.class.name);
    pers.multiclasses?.forEach((mc: any) => {
      if (mc.class?.name) names.push(classTranslations[mc.class.name as keyof typeof classTranslations] || mc.class.name);
    });
    return names;
  }, [pers]);

  useEffect(() => {
    if (wasOpenRef.current && !open) {
      router.refresh();
      onPersUpdate(pers);
      setConfirmMode(true);
    }
    wasOpenRef.current = open;
  }, [open, onPersUpdate, pers, router]);

  return (
    <div className="space-y-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            disabled={isReadOnly}
            className="h-8 gap-1.5 border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-200"
          >
            <Plus className="w-3.5 h-3.5" />
            Додати
          </Button>
        </DialogTrigger>
        <DialogContent className={`${confirmMode ? 'max-w-md' : 'max-w-6xl'} bg-slate-900 border-white/10 text-white p-0 overflow-hidden flex flex-col ${confirmMode ? 'h-auto' : 'h-[90vh]'} transition-all duration-300`}>
          {confirmMode ? (
            <div className="p-6 space-y-6">
              <div className="space-y-2 text-center text-slate-200">
                <div className="mx-auto w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                  <Filter className="w-6 h-6" />
                </div>
                <DialogTitle className="text-xl font-bold">Фільтрація за персонажем</DialogTitle>
                <p className="text-sm text-slate-400">Чи бажаєте активувати фільтри вашого поточного персонажа?</p>
              </div>

              <div className="glass-panel border border-white/10 rounded-xl p-4 bg-white/5 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Класи:</span>
                  <span className="font-semibold text-indigo-300">{classList.join(", ") || "—"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Макс. рівень:</span>
                  <span className="font-semibold text-indigo-300">{maxSpellLevel > 0 ? maxSpellLevel : "Замовляння"}</span>
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
              <DialogHeader className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between gap-3">
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <Search className="w-5 h-5 text-indigo-400" />
                    Пошук заклять
                  </DialogTitle>
                  <div className="flex items-center gap-2">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Відкрити окремо
                    </a>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1">
                <iframe
                  title="Spells"
                  src={url}
                  className="h-full w-full border-0"
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
