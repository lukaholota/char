"use client";

import { useEffect, useState } from "react";
import type { Ruleset } from "@prisma/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { WeaponDetailCard } from "@/components/weapons/WeaponDetailCard";
import { ArmorDetailCard } from "@/components/armor/ArmorDetailCard";
import type { WeaponData } from "@/lib/weaponsData";
import type { ArmorData } from "@/lib/armorData";
import type { EquipmentCatalogItem } from "@/lib/components/characterCreator/equipment-choices";

type Props = {
  item: EquipmentCatalogItem | null;
  ruleset: Ruleset;
  onClose: () => void;
};

type LoadedEntry = { kind: "weapon"; weapon: WeaponData } | { kind: "armor"; armor: ArmorData } | { kind: "missing" };

/// Та сама картка, що в каталозі зброї й обладунків. Каталог тягнеться динамічним імпортом лише
/// на натискання: статичний імпорт поклав би обидва JSON у бандл конструктора (гейт
/// `client-bundle-boundary`).
export const EquipmentCatalogDialog = ({ item, ruleset, onClose }: Props) => {
  const entry = useCatalogEntry(item, ruleset);
  const is2024 = ruleset === "RULES_2024";

  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-h-[90dvh] max-w-xl overflow-y-auto border-white/10 bg-slate-950/95 px-4 pb-4 pt-12 sm:px-6 sm:pb-6 backdrop-blur-2xl text-slate-100"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Характеристики предмета</DialogTitle>
        {entry?.kind === "weapon" ? <WeaponDetailCard weapon={entry.weapon} is2024={is2024} /> : null}
        {entry?.kind === "armor" ? <ArmorDetailCard armor={entry.armor} is2024={is2024} /> : null}
        {entry?.kind === "missing" ? <p className="text-sm text-slate-400">Цього предмета немає в каталозі.</p> : null}
        {item && !entry ? <p className="text-sm text-slate-400">Завантаження…</p> : null}
      </DialogContent>
    </Dialog>
  );
};

const useCatalogEntry = (item: EquipmentCatalogItem | null, ruleset: Ruleset): LoadedEntry | null => {
  const [loaded, setLoaded] = useState<{ item: EquipmentCatalogItem; entry: LoadedEntry } | null>(null);

  useEffect(() => {
    if (!item) return;
    let cancelled = false;
    findCatalogEntry(item, ruleset).then((entry) => {
      if (!cancelled) setLoaded({ item, entry });
    });
    return () => {
      cancelled = true;
    };
  }, [item, ruleset]);

  return loaded && loaded.item === item ? loaded.entry : null;
};

const findCatalogEntry = async (item: EquipmentCatalogItem, ruleset: Ruleset): Promise<LoadedEntry> => {
  if (item.kind === "weapon") {
    const { getAllWeapons } = await import("@/lib/weaponsData");
    const weapon = getAllWeapons(ruleset).find((candidate) => candidate.code === item.code);
    return weapon ? { kind: "weapon", weapon } : { kind: "missing" };
  }

  const { getAllArmors } = await import("@/lib/armorData");
  const armor = getAllArmors(ruleset).find((candidate) => candidate.code === item.code);
  return armor ? { kind: "armor", armor } : { kind: "missing" };
};

export default EquipmentCatalogDialog;
