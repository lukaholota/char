"use client";

import { PersWithRelations } from "@/lib/actions/pers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, Plus, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { calculateCasterLevel } from "@/lib/logic/spell-logic";
import { SPELL_SLOT_PROGRESSION } from "@/lib/refs/static";
import { useRouter } from "next/navigation";

// We need a server action to fetch the base spells list
// Let's assume we'll add getBaseSpells to spell-actions.ts or similar

interface SpellBase {
    spellId: number;
    name: string;
    engName: string;
    level: number;
    school: string | null;
}

interface AddSpellDialogProps {
  pers: PersWithRelations;
  onPersUpdate: (next: PersWithRelations) => void;
  isReadOnly?: boolean;
}

export default function AddSpellDialog({ pers, onPersUpdate, isReadOnly }: AddSpellDialogProps) {
  const [open, setOpen] = useState(false);
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

  // Build URL for /spells embed mode
  const buildSpellsUrl = () => {
    const params = new URLSearchParams();
    params.set("origin", "character");
    params.set("persId", String(pers.persId));
    params.set("persName", pers.name || `Персонаж #${pers.persId}`);
    if (maxSpellLevel > 0) params.set("maxSpellLevel", String(maxSpellLevel));
    // Add class filter
    const classNames: string[] = [];
    if (pers.class?.name) classNames.push(pers.class.name);
    pers.multiclasses?.forEach((mc: any) => {
      if (mc.class?.name) classNames.push(mc.class.name);
    });
    if (classNames.length > 0) params.set("cls", classNames.join(","));
    return `/spells?${params.toString()}`;
  };

  const url = useMemo(() => buildSpellsUrl(), [pers, maxSpellLevel]);

  useEffect(() => {
    if (wasOpenRef.current && !open) {
      router.refresh();
      onPersUpdate(pers);
    }
    wasOpenRef.current = open;
  }, [open, onPersUpdate, pers, router]);

  return (
    <div className="space-y-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button 
              disabled={isReadOnly}
              variant="outline" 
              className="w-full h-12 gap-2 border-fuchsia-500/30 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-200"
          >
            <Plus className="w-5 h-5" />
            Додати закляття
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-6xl bg-slate-900 border-white/10 text-white p-0 overflow-hidden flex flex-col h-[90vh]">
          <DialogHeader className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Search className="w-5 h-5 text-fuchsia-400" />
                Пошук заклять
              </DialogTitle>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10 mr-8"
              >
                <ExternalLink className="w-4 h-4" />
                Відкрити окремо
              </a>
            </div>
          </DialogHeader>

          <div className="flex-1">
            <iframe
              title="Spells"
              src={url}
              className="h-full w-full border-0"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
