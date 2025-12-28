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
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, Check, Info } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { spellSchoolTranslations } from "@/lib/refs/translation";
import { toggleSpellForPers, getSpellsList } from "@/lib/actions/spell-actions";
import { toast } from "sonner";

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
  const [query, setQuery] = useState("");
  const [spells, setSpells] = useState<SpellBase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Load spells when dialog opens
  useEffect(() => {
    if (open) {
      loadSpells();
    }
  }, [open]);

  async function loadSpells() {
    setIsLoading(true);
    try {
      const data = await getSpellsList();
      setSpells(data);
    } catch (error) {
      console.error("Failed to load spells:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredSpells = spells.filter((s) => {
    const q = query.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.engName.toLowerCase().includes(q);
  });

  const handleToggle = async (spellId: number) => {
    startTransition(async () => {
        const res = await toggleSpellForPers({ persId: pers.persId, spellId });
        if (res.success) {
            toast.success(res.added ? "Закляття додано" : "Закляття видалено");
            // Here we should Ideally trigger a refetch of pers data
            // but for simple logic we can rely on router.refresh() if needed
            // however, since we have onPersUpdate, we might want to use it
        } else {
            toast.error(res.error);
        }
    });
  };

  const isSpellOwned = (spellId: number) => {
    return (pers as any).persSpells?.some((ps: any) => ps.spellId === spellId);
  };

  return (
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
      <DialogContent className="max-w-2xl bg-slate-900 border-white/10 text-white p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Search className="w-5 h-5 text-fuchsia-400" />
            Пошук заклять
          </DialogTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Шукати за назвою..."
              className="pl-10 bg-slate-800/50 border-white/10 focus:border-fuchsia-500/50"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6 pt-2">
          <div className="space-y-2 pb-6">
            {isLoading ? (
              <div className="text-center py-10 text-slate-400">Завантаження...</div>
            ) : filteredSpells.length === 0 ? (
              <div className="text-center py-10 text-slate-400">Нічого не знайдено</div>
            ) : (
              filteredSpells.map((spell) => {
                const owned = isSpellOwned(spell.spellId);
                return (
                  <div
                    key={spell.spellId}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition group"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="font-bold text-slate-100 flex items-center gap-2">
                        {spell.name}
                        <span className="text-[10px] text-slate-400 font-normal uppercase tracking-tighter">{spell.engName}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] uppercase bg-slate-800/50 border-white/10 text-slate-300">
                          {spell.level === 0 ? "Заговора" : `${spell.level} коло`}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {(spell.school && (spellSchoolTranslations as any)[spell.school]) || spell.school || ""}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={owned ? "secondary" : "default"}
                      className={owned ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-fuchsia-600 hover:bg-fuchsia-700"}
                      onClick={() => handleToggle(spell.spellId)}
                      disabled={isPending}
                    >
                      {owned ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
