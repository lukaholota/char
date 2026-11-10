"use client";

import { useCallback, useMemo, useState } from "react";

import { ContentListPage } from "@/components/catalogs/ContentListPage";
import { GearDetailCard } from "@/components/gear/GearDetailCard";
import { useCatalogUrlSync } from "@/hooks/useCatalogUrlSync";
import { getSearchParamsFromLocation, replaceUrlSearchParams } from "@/lib/catalog-url-helpers";
import type { Ruleset } from "@/lib/prisma-enums";
import { cn } from "@/lib/utils";
import { findMatchingGear, type GearItem } from "@/rules/adventuring-gear";
import { findAccentVariant } from "@/styles/edition-accent";

type GearSelection = { q: string; item: string };

const DESKTOP_WIDTH = 1024;

function parseGearSelection(params: URLSearchParams): GearSelection {
  return { q: params.get("q") ?? "", item: params.get("item") ?? "" };
}

export function GearClient({ items, ruleset }: { items: GearItem[]; ruleset: Ruleset }) {
  const is2024 = ruleset === "RULES_2024";
  const [modalItem, setModalItem] = useState<GearItem | null>(null);
  const { qInput, setQInput, selection } = useCatalogUrlSync<GearSelection>(parseGearSelection);
  const visibleItems = useMemo(() => findMatchingGear(items, selection.q), [items, selection.q]);
  const selectedItem = visibleItems.find((item) => item.name === selection.item) ?? visibleItems[0] ?? null;

  const openItem = useCallback((item: GearItem) => {
    const params = getSearchParamsFromLocation();
    params.set("item", item.name);
    replaceUrlSearchParams(params);
    if (window.innerWidth < DESKTOP_WIDTH) setModalItem(item);
  }, []);

  return (
    <ContentListPage<GearItem>
      title="Звичайні речі"
      is2024={is2024}
      searchQuery={qInput}
      onSearchChange={setQInput}
      searchPlaceholder="Пошук: олія, мотузка, ліхтар..."
      data={visibleItems}
      emptyState={
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <p className="text-sm font-medium text-slate-300">Такої речі немає</p>
          <p className="mt-1 text-xs text-slate-400">Спробуйте іншу назву</p>
        </div>
      }
      renderItem={(_index, item) => <GearRow item={item} isSelected={item.name === selectedItem?.name} is2024={is2024} onOpen={openItem} />}
      desktopDetailView={selectedItem ? <GearDetailCard item={selectedItem} is2024={is2024} /> : null}
      selectedModalItem={modalItem}
      onCloseModal={() => setModalItem(null)}
      modalTitle={modalItem?.name ?? "Звичайна річ"}
      renderModalContent={(item) => <GearDetailCard item={item} is2024={is2024} />}
    />
  );
}

function GearRow({ item, isSelected, is2024, onOpen }: { item: GearItem; isSelected: boolean; is2024: boolean; onOpen: (item: GearItem) => void }) {
  const facts = [item.group, item.price, item.weight].filter(Boolean).join(" · ");
  return (
    <div className="px-0.5 pb-0.5 pt-2">
      <button
        type="button"
        aria-current={isSelected ? "true" : undefined}
        onClick={() => onOpen(item)}
        className={cn(
          "glass-panel block min-h-11 w-full rounded-xl border p-3 text-left",
          isSelected
            ? findAccentVariant(is2024, { prism: "border-gradient-rpg border-gradient-rpg-active glass-active bg-white/5 text-white ring-1 ring-prism-400/40", arcane: "border-gradient-rpg border-gradient-rpg-active glass-active bg-white/5 text-white ring-1 ring-arcane-400/40" })
            : "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10",
        )}
      >
        <span className="block text-[15px] font-semibold">{item.name}</span>
        {facts && <span className="mt-1 block text-xs text-slate-400">{facts}</span>}
      </button>
    </div>
  );
}
