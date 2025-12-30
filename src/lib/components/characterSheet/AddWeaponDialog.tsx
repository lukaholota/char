"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, Search, Sword } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  getBaseEquipment, 
  addWeapon 
} from "@/lib/actions/equipment-actions";
import { weaponTranslations, damageTypeTranslations } from "@/lib/refs/translation";
import { Weapon, Ability } from "@prisma/client";
import { toast } from "sonner";
import { useModalBackButton } from "@/hooks/useModalBackButton";

interface AddWeaponDialogProps {
  persId: number;
  onSuccess?: () => void;
}

export default function AddWeaponDialog({ persId, onSuccess }: AddWeaponDialogProps) {
  const [open, setOpen] = useState(false);
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [rangedFilter, setRangedFilter] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);

  useModalBackButton(open, () => setOpen(false));

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      getBaseEquipment().then((res) => {
        if (res.success && res.weapons) {
          setWeapons(res.weapons);
        }
        setIsLoading(false);
      });
    }
  }, [open]);

  const filteredWeapons = weapons.filter((w) => {
    const name = weaponTranslations[w.name as keyof typeof weaponTranslations] || w.name;
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "ALL" || w.weaponType === typeFilter;
    const matchesRanged = rangedFilter === null || w.isRanged === rangedFilter;
    return matchesSearch && matchesType && matchesRanged;
  });

  const uniqueWeapons = Array.from(
    new Map(filteredWeapons.map((w) => [w.name, w])).values()
  );

  const handleAdd = (weapon: Weapon) => {
    startTransition(async () => {
      const res = await addWeapon(persId, weapon.weaponId, {
        overrideName: weaponTranslations[weapon.name as keyof typeof weaponTranslations] || weapon.name,
        customDamageDice: weapon.damage,
        isProficient: true,
      });

      if (res.success) {
        toast.success("Зброю додано");
        setOpen(false);
        onSuccess?.();
      } else {
        toast.error(res.error || "Помилка при додаванні зброї");
      }
    });
  };

  const handleAddCustom = () => {
    startTransition(async () => {
        const res = await addWeapon(persId, null, {
          overrideName: "Нова зброя",
          customDamageDice: "1d6",
          isProficient: true,
        });
  
        if (res.success) {
          toast.success("Кастомну зброю створено");
          setOpen(false);
          onSuccess?.();
        } else {
          toast.error(res.error || "Помилка при створенні зброї");
        }
      });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 gap-1 bg-indigo-600/20 hover:bg-indigo-600/30 border-indigo-500/30 text-indigo-100">
          <Plus className="w-4 h-4" />
          <span>Додати зброю</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-slate-900/60 backdrop-blur-xl border-white/10 text-slate-50 p-0 overflow-hidden flex flex-col h-[80vh]">
        <DialogHeader className="p-4 border-b border-white/10 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sword className="w-5 h-5 text-indigo-400" />
            Додати зброю
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Пошук зброї..."
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
                variant={typeFilter === "SIMPLE_WEAPON" ? "secondary" : "outline"} 
                size="sm" 
                className="h-7 text-[10px] px-2"
                onClick={() => setTypeFilter("SIMPLE_WEAPON")}
              >Проста</Button>
              <Button 
                variant={typeFilter === "MARTIAL_WEAPON" ? "secondary" : "outline"} 
                size="sm" 
                className="h-7 text-[10px] px-2"
                onClick={() => setTypeFilter("MARTIAL_WEAPON")}
              >Військова</Button>
              <div className="w-px h-7 bg-white/10 mx-1 hidden sm:block" />
              <Button 
                variant={rangedFilter === false ? "secondary" : "outline"} 
                size="sm" 
                className="h-7 text-[10px] px-2"
                onClick={() => setRangedFilter(rangedFilter === false ? null : false)}
              >Ближня</Button>
              <Button 
                variant={rangedFilter === true ? "secondary" : "outline"} 
                size="sm" 
                className="h-7 text-[10px] px-2"
                onClick={() => setRangedFilter(rangedFilter === true ? null : true)}
              >Дальня</Button>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full border-dashed border-white/20 hover:bg-white/5 h-12 gap-2"
            onClick={handleAddCustom}
            disabled={isPending}
          >
            <Plus className="w-4 h-4" />
            Створити кастомну зброю
          </Button>

          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center py-8 text-slate-400">Завантаження...</div>
            ) : uniqueWeapons.length > 0 ? (
              uniqueWeapons.map((w) => (
                <div
                  key={w.weaponId}
                  className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition group"
                >
                  <div>
                    <div className="font-semibold">
                      {weaponTranslations[w.name as keyof typeof weaponTranslations] || w.name}
                    </div>
                    <div className="text-xs text-slate-400">
                      {w.damage} {damageTypeTranslations[w.damageType as keyof typeof damageTypeTranslations] || w.damageType}
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="opacity-0 group-hover:opacity-100 transition h-8 w-8 p-0"
                    onClick={() => handleAdd(w)}
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
