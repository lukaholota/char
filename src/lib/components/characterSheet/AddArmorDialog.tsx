"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, Search, Shield } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  getBaseEquipment, 
  addArmor 
} from "@/lib/actions/equipment-actions";
import { armorTranslations, armorTypeTranslations } from "@/lib/refs/translation";
import { Armor } from "@prisma/client";
import { toast } from "sonner";
import { useModalBackButton } from "@/hooks/useModalBackButton";

interface AddArmorDialogProps {
  persId: number;
  onSuccess?: () => void;
}

export default function AddArmorDialog({ persId, onSuccess }: AddArmorDialogProps) {
  const [open, setOpen] = useState(false);
  const [armors, setArmors] = useState<Armor[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);

  useModalBackButton(open, () => setOpen(false));

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      getBaseEquipment().then((res) => {
        if (res.success && res.armors) {
          setArmors(res.armors.filter(a => a.armorType !== "SHIELD"));
        }
        setIsLoading(false);
      });
    }
  }, [open]);

  const filteredArmors = armors.filter((a) => {
    const name = armorTranslations[a.name as keyof typeof armorTranslations] || a.name;
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "ALL" || a.armorType === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleAdd = (armor: Armor) => {
    startTransition(async () => {
      const res = await addArmor(persId, armor.armorId, {
        isProficient: true,
        equipped: false,
      });

      if (res.success) {
        toast.success("Обладунок додано");
        setOpen(false);
        onSuccess?.();
      } else {
        toast.error(res.error || "Помилка при додаванні обладунку");
      }
    });
  };

  const handleAddCustom = () => {
    startTransition(async () => {
        const res = await addArmor(persId, null, {
          overrideBaseAC: 10,
          isProficient: true,
          equipped: false,
        });
  
        if (res.success) {
          toast.success("Кастомний обладунок створено");
          setOpen(false);
          onSuccess?.();
        } else {
          toast.error(res.error || "Помилка при створенні обладунку");
        }
      });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 gap-1 bg-indigo-600/20 hover:bg-indigo-600/30 border-indigo-500/30 text-indigo-100">
          <Plus className="w-4 h-4" />
          <span>Додати обладунок</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-slate-900/60 backdrop-blur-xl border-white/10 text-slate-50 p-0 overflow-hidden flex flex-col h-[80vh]">
        <DialogHeader className="p-4 border-b border-white/10 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            Додати обладунок
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Пошук обладунку..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white/5 border-white/10 text-slate-50"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button 
                variant={typeFilter === "ALL" ? "secondary" : "outline"} 
                size="sm" 
                className="h-7 text-[10px] px-2"
                onClick={() => setTypeFilter("ALL")}
              >Всі</Button>
              <Button 
                variant={typeFilter === "LIGHT_ARMOR" ? "secondary" : "outline"} 
                size="sm" 
                className="h-7 text-[10px] px-2"
                onClick={() => setTypeFilter("LIGHT_ARMOR")}
              >Легкий</Button>
              <Button 
                variant={typeFilter === "MEDIUM_ARMOR" ? "secondary" : "outline"} 
                size="sm" 
                className="h-7 text-[10px] px-2"
                onClick={() => setTypeFilter("MEDIUM_ARMOR")}
              >Середній</Button>
              <Button 
                variant={typeFilter === "HEAVY_ARMOR" ? "secondary" : "outline"} 
                size="sm" 
                className="h-7 text-[10px] px-2"
                onClick={() => setTypeFilter("HEAVY_ARMOR")}
              >Важкий</Button>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full border-dashed border-white/20 hover:bg-white/5 h-12 gap-2"
            onClick={handleAddCustom}
            disabled={isPending}
          >
            <Plus className="w-4 h-4" />
            Створити кастомний обладунок
          </Button>

          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center py-8 text-slate-400">Завантаження...</div>
            ) : filteredArmors.length > 0 ? (
              filteredArmors.map((a) => (
                <div
                  key={a.armorId}
                  className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition group"
                >
                  <div>
                    <div className="font-semibold">
                      {armorTranslations[a.name as keyof typeof armorTranslations] || a.name}
                    </div>
                    <div className="text-xs text-slate-400">
                      {armorTypeTranslations[a.armorType as keyof typeof armorTypeTranslations] || a.armorType} • КБ {a.baseAC}
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="opacity-0 group-hover:opacity-100 transition h-8 w-8 p-0"
                    onClick={() => handleAdd(a)}
                    disabled={isPending}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400">Нічого не знайдено</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
