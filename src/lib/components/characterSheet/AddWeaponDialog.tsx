"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, Search, Sword } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getBaseEquipment, addWeapon } from "@/lib/actions/equipment-actions";
import { addMagicItemToPers } from "@/lib/actions/magic-item-actions";
import { useCommunityHomebrew } from "@/hooks/useCommunityHomebrew";
import { weaponTranslations, damageTypeTranslations } from "@/lib/refs/translation";
import type { HomebrewCatalogEntry, HomebrewItemEntry } from "@/lib/logic/homebrew-view";
import { parseWeaponProfile } from "@/rules/weapon-profile";
import type { Ruleset, Weapon } from "@prisma/client";
import { toast } from "sonner";

interface AddWeaponDialogProps {
  persId: number;
  ruleset: Ruleset;
  onSuccess?: () => void;
}

type AddResult = { success: boolean; error?: string };

const FILTER_CLASS = "h-11 px-3 text-xs";

export default function AddWeaponDialog({ persId, ruleset, onSuccess }: AddWeaponDialogProps) {
  const [open, setOpen] = useState(false);
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [rangedFilter, setRangedFilter] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const isHomebrew = typeFilter === "HOMEBREW";
  const community = useCommunityHomebrew({ kind: "ITEM", ruleset, sort: "TOP" }, open && isHomebrew);

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      getBaseEquipment(ruleset).then((res) => {
        if (res.success && res.weapons) {
          setWeapons(res.weapons);
        }
        setIsLoading(false);
      });
    }
  }, [open, ruleset]);

  const filteredWeapons = weapons.filter((w) => {
    const matchesSearch = translateWeapon(w).toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "ALL" || w.weaponType === typeFilter;
    const matchesRanged = rangedFilter === null || w.isRanged === rangedFilter;
    return matchesSearch && matchesType && matchesRanged;
  });

  const uniqueWeapons = Array.from(
    new Map(filteredWeapons.map((w) => [w.name, w])).values()
  );
  const homebrewWeapons = findHomebrewWeapons(community, search);
  const chooseRange = (isRanged: boolean) => {
    if (isHomebrew) setTypeFilter("ALL");
    setRangedFilter(rangedFilter === isRanged ? null : isRanged);
  };
  const chooseHomebrew = () => {
    setTypeFilter("HOMEBREW");
    setRangedFilter(null);
  };

  const runAdd = (add: () => Promise<AddResult>, successText: string) => {
    startTransition(async () => {
      const res = await add();
      if (res.success) {
        toast.success(successText);
        setOpen(false);
        onSuccess?.();
      } else {
        toast.error(res.error || "Помилка при додаванні зброї");
      }
    });
  };

  const handleAdd = (weapon: Weapon) => runAdd(() => addWeapon(persId, weapon.weaponId, { overrideName: translateWeapon(weapon), isProficient: true }), "Зброю додано");
  const handleAddHomebrew = (entry: HomebrewItemEntry) => runAdd(() => addMagicItemToPers({ persId, magicItemId: entry.item.magicItemId }), "Зброю додано");
  const handleAddCustom = () => runAdd(() => addWeapon(persId, null, { overrideName: "Нова зброя", customDamageDice: "1d6", isProficient: true }), "Кастомну зброю створено");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 gap-1 bg-indigo-600/20 hover:bg-indigo-600/30 border-indigo-500/30 text-indigo-100">
          <Plus className="w-4 h-4" />
          <span>Додати зброю</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-md border-white/10 text-slate-50 p-0 overflow-hidden flex flex-col h-[80vh]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
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
                autoFocus={false}
                placeholder="Пошук зброї..."
                aria-label="Пошук зброї"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white/5 border-white/10 text-slate-50"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <FilterChip isOn={typeFilter === "ALL"} onClick={() => setTypeFilter("ALL")}>Всі</FilterChip>
              <FilterChip isOn={typeFilter === "SIMPLE_WEAPON"} onClick={() => setTypeFilter("SIMPLE_WEAPON")}>Проста</FilterChip>
              <FilterChip isOn={typeFilter === "MARTIAL_WEAPON"} onClick={() => setTypeFilter("MARTIAL_WEAPON")}>Військова</FilterChip>
              <FilterChip isOn={rangedFilter === false} onClick={() => chooseRange(false)}>Ближня</FilterChip>
              <FilterChip isOn={rangedFilter === true} onClick={() => chooseRange(true)}>Дальня</FilterChip>
              <FilterChip isOn={isHomebrew} onClick={chooseHomebrew}>Хоумбрю</FilterChip>
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
            {isHomebrew ? (
              homebrewWeapons.length > 0 ? (
                homebrewWeapons.map((entry) => <WeaponOption key={entry.entryId} name={entry.name} details={describeHomebrewWeapon(entry)} isDisabled={isPending} onAdd={() => handleAddHomebrew(entry)} />)
              ) : (
                <div className="text-center py-8 text-slate-400">Хоумбрю-зброї не знайдено</div>
              )
            ) : isLoading ? (
              <div className="text-center py-8 text-slate-400">Завантаження...</div>
            ) : uniqueWeapons.length > 0 ? (
              uniqueWeapons.map((w) => (
                <WeaponOption key={w.weaponId} name={translateWeapon(w)} details={`${w.damage} ${damageTypeTranslations[w.damageType as keyof typeof damageTypeTranslations] || w.damageType}`} isDisabled={isPending} onAdd={() => handleAdd(w)} />
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

function FilterChip({ isOn, onClick, children }: { isOn: boolean; onClick: () => void; children: string }) {
  return (
    <Button variant={isOn ? "secondary" : "outline"} size="sm" aria-pressed={isOn} className={FILTER_CLASS} onClick={onClick}>
      {children}
    </Button>
  );
}

function WeaponOption({ name, details, isDisabled, onAdd }: { name: string; details: string; isDisabled: boolean; onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={isDisabled}
      aria-label={`Додати: ${name}`}
      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-left transition hover:bg-white/10 disabled:opacity-60"
    >
      <span className="min-w-0">
        <span className="block break-words font-semibold">{name}</span>
        <span className="block text-xs text-slate-400">{details}</span>
      </span>
      <Plus className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
    </button>
  );
}

function translateWeapon(weapon: Weapon): string {
  return weaponTranslations[weapon.name as keyof typeof weaponTranslations] || weapon.name;
}

function findHomebrewWeapons(entries: HomebrewCatalogEntry[], search: string): HomebrewItemEntry[] {
  const query = search.trim().toLocaleLowerCase("uk");
  return entries.filter((entry): entry is HomebrewItemEntry => entry.kind === "ITEM" && entry.item.itemType === "WEAPON" && entry.name.toLocaleLowerCase("uk").includes(query));
}

function describeHomebrewWeapon(entry: HomebrewItemEntry): string {
  const profile = parseWeaponProfile(entry.item.weaponProfile);
  return [profile?.damage, profile?.damageType ? damageTypeTranslations[profile.damageType] : null, entry.item.isMundane ? null : "магічна", entry.authorName].filter(Boolean).join(" · ");
}
