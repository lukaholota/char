"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Filter,
  Printer,
  Search,
  UserPlus,
  Check,
  Loader2,
  X,
  Trash2,
} from "lucide-react";
import { Virtuoso } from "react-virtuoso";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { itemRarityTranslations, magicItemTypeTranslations } from "@/lib/refs/translation";
import { useModalBackButton } from "@/hooks/useModalBackButton";
import { MagicItemType, ItemRarity } from "@prisma/client";

export type MagicItemListItem = {
  magicItemId: number;
  name: string;
  engName: string;
  itemType: MagicItemType;
  rarity: ItemRarity;
  requiresAttunement: boolean;
  description: string;
  shortDescription?: string | null;
  weaponProficiencies?: unknown;
  weaponProficienciesSpecial?: unknown;
  bonusToAC?: number | null;
  bonusToRangedDamage?: number | null;
  bonusToSavingThrows?: number | null;
  noArmorOrShieldForACBonus?: boolean | null;
  givesSpells?: {
      spellId: number;
      name: string;
      engName: string;
      level: number;
      shortDescription?: string | null;
  }[];
};

type InitialSearchParams = Record<string, string | string[] | undefined>;

type SelectionState = {
  rarities: Set<string>;
  types: Set<string>;
  attunement: boolean | null;
  q: string;
  item: string;
};

// Embed mode params
type EmbedParams = {
  origin: string | null;
  persId: number | null;
  persName: string | null;
};

function parseEmbedParams(params: URLSearchParams): EmbedParams {
  const origin = params.get("origin");
  const persIdRaw = params.get("persId");
  const persId = persIdRaw ? parseInt(persIdRaw, 10) : null;
  const persName = params.get("persName");
  return {
    origin,
    persId: Number.isFinite(persId) ? persId : null,
    persName,
  };
}

function getParamSet(params: URLSearchParams, key: string): Set<string> {
  const raw = params.get(key);
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
  );
}

function setParamSet(params: URLSearchParams, key: string, values: Set<string>) {
  const nextValues = Array.from(values).filter(Boolean);
  if (nextValues.length === 0) params.delete(key);
  else params.set(key, nextValues.join(","));
}

function setBoolParam(params: URLSearchParams, key: string, value: boolean | null) {
  if (value === null) params.delete(key);
  else params.set(key, value ? "1" : "0");
}

function getBoolParam(params: URLSearchParams, key: string): boolean | null {
  const raw = params.get(key);
  if (raw === null) return null;
  if (raw === "1") return true;
  if (raw === "0") return false;
  return null;
}

function getSearchParamsFromLocation(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function parseSelectionFromParams(params: URLSearchParams): SelectionState {
  return {
    rarities: getParamSet(params, "rar"),
    types: getParamSet(params, "type"),
    attunement: getBoolParam(params, "attn"),
    q: params.get("q")?.trim().toLowerCase() || "",
    item: params.get("item")?.trim() || "",
  };
}

function initSelectionFromInitialSearchParams(initialSearchParams: InitialSearchParams): SelectionState {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(initialSearchParams)) {
    if (Array.isArray(value)) {
      const v = value[0];
      if (typeof v === "string") params.set(key, v);
    } else if (typeof value === "string") {
      params.set(key, value);
    }
  }
  return parseSelectionFromParams(params);
}

function replaceUrlSearchParams(next: URLSearchParams) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.search = next.toString();
  window.history.replaceState({}, "", url);
  const w = window as Window & { __locationchange_patched__?: boolean };
  if (w.__locationchange_patched__) return;
  const fire = () => window.dispatchEvent(new Event("locationchange"));
  if (typeof queueMicrotask === "function") queueMicrotask(fire);
  else window.setTimeout(fire, 0);
}

function pushUrlSearchParams(next: URLSearchParams) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.search = next.toString();
  window.history.pushState({}, "", url);
  const w = window as Window & { __locationchange_patched__?: boolean };
  if (w.__locationchange_patched__) return;
  const fire = () => window.dispatchEvent(new Event("locationchange"));
  if (typeof queueMicrotask === "function") queueMicrotask(fire);
  else window.setTimeout(fire, 0);
}

function selectionKey(sel: SelectionState): string {
  const key = (set: Set<string>) => Array.from(set).sort().join(",");
  return [
    `rar=${key(sel.rarities)}`,
    `type=${key(sel.types)}`,
    `attn=${String(sel.attunement)}`,
    `q=${sel.q}`,
    `item=${sel.item}`,
  ].join("|");
}

function rarityLabel(rarity: string) {
  return itemRarityTranslations[rarity as keyof typeof itemRarityTranslations] || rarity;
}

function typeLabel(type: string) {
  return magicItemTypeTranslations[type as keyof typeof magicItemTypeTranslations] || type;
}

function InventoryDropdown({
  magicItemId,
  persIndex,
  setPersIndex,
}: {
  magicItemId: number;
  persIndex: PersIndexItem[] | null;
  setPersIndex: (value: PersIndexItem[] | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useModalBackButton(open, () => setOpen(false));

  const load = async () => {
    if (persIndex) return;
    setLoading(true);
    try {
      const data = await getUserPersesMagicItemIndex();
      setPersIndex(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void load();
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:text-teal-300"
          aria-label="Додати до персонажа"
        >
          <UserPlus className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Додати до персонажа</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {loading ? (
          <div className="px-2 py-2 text-xs text-slate-400 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Завантаження…
          </div>
        ) : persIndex && persIndex.length === 0 ? (
          <div className="px-2 py-2 text-xs text-slate-400">Немає персонажів</div>
        ) : (
          persIndex?.map((p) => {
            const has = p.magicItemIds.includes(magicItemId);
            const label = p.name || `Персонаж #${p.persId}`;
            return (
              <DropdownMenuItem
                key={p.persId}
                className="flex items-center justify-between gap-2 cursor-pointer"
                onSelect={async (e) => {
                  e.preventDefault();
                  const res = await toggleMagicItemForPers({ persId: p.persId, magicItemId });
                  if (!res.success) return;

                  setPersIndex(
                    (persIndex || []).map((item) =>
                      item.persId !== p.persId
                        ? item
                        : {
                            ...item,
                            magicItemIds: res.added
                              ? [...item.magicItemIds, magicItemId]
                              : item.magicItemIds.filter((id) => id !== magicItemId),
                          }
                    )
                  );
                }}
              >
                <span className="truncate">{label}</span>
                {has ? <Check className="h-4 w-4 text-teal-400" /> : null}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Add these imports to the top if missing:
import { getUserPersesMagicItemIndex } from "@/lib/actions/pers";
import { toggleMagicItemForPers } from "@/lib/actions/magic-item-actions";

type PersIndexItem = {
    persId: number;
    name: string;
    magicItemIds: number[];
};

export function MagicItemsClient({
  items,
  initialSearchParams,
}: {
  items: MagicItemListItem[];
  initialSearchParams: InitialSearchParams;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [persIndex, setPersIndex] = useState<PersIndexItem[] | null>(null);
  
  // Embed mode state
  const [embedParams] = useState<EmbedParams>(() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(initialSearchParams)) {
      const v = Array.isArray(value) ? value[0] : value;
      if (typeof v === "string") params.set(key, v);
    }
    return parseEmbedParams(params);
  });
  const isEmbedMode = embedParams.origin === "character" && embedParams.persId !== null;

  useModalBackButton(filtersOpen, () => setFiltersOpen(false));
  
  const [printIds, setPrintIds] = useState<number[]>([]);

  const initialQ = useMemo(() => {
    const raw = initialSearchParams.q;
    return Array.isArray(raw) ? raw[0] ?? "" : raw ?? "";
  }, [initialSearchParams.q]);

  const [qInput, setQInput] = useState(initialQ);
  const debounceRef = useRef<number | null>(null);

  const [selection, setSelection] = useState<SelectionState>(() =>
    initSelectionFromInitialSearchParams(initialSearchParams)
  );
  const selectionKeyRef = useRef<string>(selectionKey(initSelectionFromInitialSearchParams(initialSearchParams)));

  useEffect(() => {
    const w = window as Window & { __locationchange_patched__?: boolean };
    if (typeof window !== "undefined" && !w.__locationchange_patched__) {
      w.__locationchange_patched__ = true;
      const dispatchLocationChangeAsync = () => {
        const fire = () => window.dispatchEvent(new Event("locationchange"));
        if (typeof queueMicrotask === "function") queueMicrotask(fire);
        else window.setTimeout(fire, 0);
      };
      const wrap = (type: "pushState" | "replaceState") => {
        const original = window.history[type];
        return function (this: History, ...args: unknown[]) {
          const result = (original as unknown as (...a: unknown[]) => unknown).apply(this, args);
          dispatchLocationChangeAsync();
          return result;
        };
      };
      window.history.pushState = wrap("pushState");
      window.history.replaceState = wrap("replaceState");
    }

    const sync = () => {
      const next = parseSelectionFromParams(getSearchParamsFromLocation());
      const nextKey = selectionKey(next);
      if (nextKey !== selectionKeyRef.current) {
        selectionKeyRef.current = nextKey;
        setSelection(next);
      }
      const nextQ = next.q || "";
      setQInput((prev) => (prev === nextQ ? prev : nextQ));
    };

    window.addEventListener("popstate", sync);
    window.addEventListener("locationchange", sync);
    sync();

    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("locationchange", sync);
    };
  }, []);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      const next = getSearchParamsFromLocation();
      const trimmed = qInput.trim();
      if (!trimmed) next.delete("q");
      else next.set("q", trimmed);
      replaceUrlSearchParams(next);
    }, 250);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [qInput]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (selection.q) {
        const hay = `${item.name} ${item.engName}`.toLowerCase();
        if (!hay.includes(selection.q)) return false;
      }

      if (selection.rarities.size > 0) {
        if (!selection.rarities.has(item.rarity)) return false;
      }

      if (selection.types.size > 0) {
        if (!selection.types.has(item.itemType)) return false;
      }

      if (selection.attunement !== null) {
        if (item.requiresAttunement !== selection.attunement) return false;
      }

      return true;
    });
  }, [items, selection]);

  const selectedItem = useMemo(() => {
    const byParam = selection.item
      ? items.find((i) => String(i.magicItemId) === selection.item || i.engName === selection.item || i.name === selection.item)
      : null;

    if (byParam) return byParam;
    return filtered[0] ?? null;
  }, [filtered, selection.item, items]);

  const setParams = (mutate: (next: URLSearchParams) => void) => {
    const next = getSearchParamsFromLocation();
    mutate(next);
    replaceUrlSearchParams(next);
  };

  const pushParams = (mutate: (next: URLSearchParams) => void) => {
    const next = getSearchParamsFromLocation();
    mutate(next);
    pushUrlSearchParams(next);
  };

  const toggleSetValue = (key: string, value: string) => {
    setParams((next) => {
      const set = getParamSet(next, key);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      setParamSet(next, key, set);
    });
  };

  const available = useMemo(() => {
    const rarities = new Set<string>();
    const types = new Set<string>();

    for (const i of items) {
      rarities.add(i.rarity);
      types.add(i.itemType);
    }

    return {
      rarities: Array.from(rarities).sort((a, b) => {
          const rarityOrder = ["COMMON", "UNCOMMON", "RARE", "VERY_RARE", "LEGENDARY", "ARTIFACT"];
          const ia = rarityOrder.indexOf(a);
          const ib = rarityOrder.indexOf(b);
          if (ia === -1 && ib === -1) return a.localeCompare(b);
          if (ia === -1) return 1;
          if (ib === -1) return -1;
          return ia - ib;
      }),
      types: Array.from(types).sort((a, b) => typeLabel(a).localeCompare(typeLabel(b), "uk")),
    };
  }, [items]);

  const clearFilters = () => {
    setParams((next) => {
      next.delete("rar");
      next.delete("type");
      next.delete("attn");
    });
  };

  const hasActiveFilters =
    selection.rarities.size > 0 ||
    selection.types.size > 0 ||
    selection.attunement !== null;

  const router = useRouter();
  const isDesktop = typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
  
  const onSelectItem = (item: MagicItemListItem) => {
    if (isDesktop) {
      pushParams((next) => {
        next.set("item", String(item.magicItemId));
      });
    } else {
      router.push(`/magic-items/${item.magicItemId}`);
    }
  };

  // Title Logic
  useEffect(() => {
     if (typeof document === "undefined") return;
    if (!selection.item) {
       // document.title = "Магічні предмети"; 
       return;
    }
    const i = items.find((it) => String(it.magicItemId) === selection.item || it.engName === selection.item || it.name === selection.item);
    if (i?.name) document.title = i.name;
  }, [selection.item, items]);

  // Embed Add Logic
  const [isPending, setIsPending] = useState(false);
  const [addedItems, setAddedItems] = useState<Set<number>>(new Set());
  
  const handleAddItem = async (itemId: number) => {
      if(!embedParams.persId) return;
      setIsPending(true);
      try {
          const res = await fetch(`/api/characters/${embedParams.persId}/magic-items`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ magicItemId: itemId })
          });
          if(res.ok) {
              setAddedItems(prev => new Set(prev).add(itemId));
              if (isEmbedMode) {
                  window.parent.postMessage({ type: "ITEM_ADDED" }, "*");
              }
          }
      } catch(e) {
          console.error(e);
      } finally {
          setIsPending(false);
      }
  };

  const doPrint = () => {
    if (printIds.length === 0) return;
    const ids = encodeURIComponent(printIds.join(","));
    window.open(`/api/magic-items/print?ids=${ids}`, "_blank", "noopener,noreferrer");
  };

   const flatRows = useMemo(() => {
     // Sorting order for rarity
     const rarityOrder = ["COMMON", "UNCOMMON", "RARE", "VERY_RARE", "LEGENDARY", "ARTIFACT"];
     
     const grouped = new Map<string, MagicItemListItem[]>();
     for(const item of filtered) {
         const arr = grouped.get(item.rarity) ?? [];
         arr.push(item);
         grouped.set(item.rarity, arr);
     }
     
     const sortedRarities = Array.from(grouped.keys()).sort((a, b) => {
         return rarityOrder.indexOf(a) - rarityOrder.indexOf(b);
     });
     
     return sortedRarities.flatMap(rar => {
         const list = grouped.get(rar) || [];
         list.sort((a,b) => a.name.localeCompare(b.name, "uk"));
         return [
             { kind: "header" as const, rarity: rar, count: list.length },
             ...list.map(item => ({ kind: "item" as const, rarity: rar, item }))
         ];
     });
  }, [filtered]);

  return (
    <div className="h-full w-full bg-[radial-gradient(circle_at_50%_0%,rgba(45,212,191,0.05),transparent_50%)]">
      {/* Embed mode banner */}
      {isEmbedMode && (
        <div className="sticky top-0 z-30 border-b border-teal-500/30 bg-teal-500/10 backdrop-blur-xl">
          <div className="mx-auto w-full max-w-6xl px-3 py-2 sm:px-4">
            <div className="flex items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2 text-teal-200">
                <UserPlus className="h-4 w-4" />
                <span>
                  Додавання предметів для <strong>{embedParams.persName || `персонажа #${embedParams.persId}`}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOP BAR / SEARCH */}
      <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/40 backdrop-blur-xl" style={isEmbedMode ? { top: '40px' } : {}}>
        <div className="mx-auto w-full max-w-6xl px-3 py-3 sm:px-4">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl">
            <div className="flex items-center gap-2 px-2 text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <Input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Пошук предметів..."
              className="border-0 bg-transparent text-slate-200 placeholder:text-slate-500 focus-visible:ring-0"
            />

            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
              <Button
                type="button"
                variant="secondary"
                className={
                  "h-9 gap-2 border-0 bg-transparent hover:bg-white/5 " +
                  (hasActiveFilters ? "text-teal-200 bg-teal-500/10" : "")
                }
                onClick={() => setFiltersOpen(true)}
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Фільтри</span>
              </Button>

              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 gap-2 border-0 bg-transparent hover:bg-white/5 text-slate-200"
                  onClick={clearFilters}
                  aria-label="Очистити фільтри"
                >
                  <X className="h-4 w-4" />
                  <span className="hidden sm:inline">Очистити</span>
                </Button>
              ) : null}

              {!isEmbedMode && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9 gap-2 border-0 bg-transparent hover:bg-white/5"
                    disabled={printIds.length === 0}
                  >
                    <Printer className="h-4 w-4" />
                    <span className="hidden sm:inline">Друк</span>
                    <span className="text-xs text-slate-300">({printIds.length})</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Обрано предметів: {printIds.length}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={doPrint} className="gap-2 cursor-pointer">
                    <Printer className="h-4 w-4" />
                    <span>Друкувати</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setPrintIds([])}
                    className="gap-2 text-red-300 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Очистити список</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CORE GRID LAYOUT */}
      <div className="mx-auto grid h-[calc(100vh-140px)] w-full max-w-6xl grid-cols-1 gap-4 px-3 py-4 sm:px-4 lg:grid-cols-5">
        {/* LEFT COLUMN: LIST */}
        <div className="lg:col-span-2 h-full">
           <div className="custom-scrollbar h-full">
            {flatRows.length === 0 ? (
               <div className="glass-panel rounded-2xl border border-white/10 p-4 text-sm text-slate-400">
                 Нічого не знайдено
               </div>
            ) : (
               <Virtuoso
                style={{ height: "100%" }}
                data={flatRows}
                itemContent={(index, row) => {
                  if (row.kind === "header") {
                    return (
                        <div className="pt-4 px-1">
                             <div className="glass-panel rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-base text-slate-200 backdrop-blur-xl">
                                  <span className="font-semibold">{rarityLabel(row.rarity)}</span>
                                  <span className="ml-2 text-sm text-slate-400">({row.count})</span>
                             </div>
                        </div>
                    );
                  }

                  const item = row.item;
                  const isActive = selectedItem?.magicItemId === item.magicItemId;
                  const inPrint = printIds.includes(item.magicItemId);

                  return (
                    <div className="pt-1.5 px-1">
                        <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: isActive ? 1.005 : 1 }}
                            whileHover={{ scale: isActive ? 1.005 : 1.003 }}
                            transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.7 }}
                            className={
                              "glass-panel group relative overflow-hidden rounded-xl border p-2 transition-all duration-300 " +
                              (isActive
                                ? "border-gradient-rpg border-gradient-rpg-active glass-active bg-white/5 text-white"
                                : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/7")
                            }
                        >
                            <div className="flex items-start justify-between gap-3">
                                <button
                                    type="button"
                                    className="min-w-0 flex-1 text-left"
                                    onClick={() => onSelectItem(item)}
                                >
                                    <div className="flex items-baseline gap-2">
                                         <span className="truncate text-sm font-semibold font-sans text-slate-100">
                                            {item.name}
                                         </span>
                                    </div>
                                    <div className="mt-1 truncate text-xs text-slate-400">
                                        {typeLabel(item.itemType)} {item.requiresAttunement ? "• " : ""}{item.requiresAttunement ? "Налаштування" : ""}
                                    </div>
                                </button>
                                
                                <div className="flex flex-shrink-0 items-center gap-1">
                                    {!isEmbedMode && (
                                    <>
                                     <button
                                      type="button"
                                      className={
                                        "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition " +
                                        (inPrint ? "text-teal-300" : "hover:text-teal-300")
                                      }
                                      onClick={() => {
                                        setPrintIds((prev) =>
                                          prev.includes(item.magicItemId)
                                            ? prev.filter((id) => id !== item.magicItemId)
                                            : [...prev, item.magicItemId]
                                        );
                                      }}
                                      aria-label={inPrint ? "Прибрати з друку" : "Додати до друку"}
                                    >
                                      <Printer className="h-4 w-4" />
                                    </button>
                                    
                                    <InventoryDropdown 
                                        magicItemId={item.magicItemId}
                                        persIndex={persIndex}
                                        setPersIndex={setPersIndex}
                                    />
                                    </>
                                    )}

                                    {isEmbedMode && embedParams.persId && (
                                        <button
                                            onClick={() => handleAddItem(item.magicItemId)}
                                            disabled={isPending}
                                            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:text-teal-300 ${isPending ? "opacity-50" : ""}`}
                                        >
                                            {addedItems.has(item.magicItemId) ? <Check className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                  )
                }}
               />
            )}
           </div>
        </div>

        {/* RIGHT COLUMN: DETAILS */}
        <div className="hidden lg:col-span-3 lg:block h-full overflow-hidden">
           <div className="custom-scrollbar h-full overflow-auto pr-1">
            {selectedItem ? (
               <MagicItemDetailPane item={selectedItem} isEmbedMode={isEmbedMode} />
            ) : (
                <div className="glass-panel rounded-2xl border border-white/10 p-6 text-sm text-slate-400">
                 Обери предмет зі списку
               </div>
            )}
           </div>
        </div>

      </div>

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="max-h-[85vh] w-[95vw] max-w-3xl overflow-y-auto p-0" showClose={false}>
          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <DialogTitle className="font-rpg-display text-2xl font-semibold tracking-wide text-teal-400">Фільтри</DialogTitle>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="glass-panel inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700/50 text-slate-200/90 hover:text-teal-300"
                aria-label="Закрити"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Rarity */}
              <div className="glass-panel rounded-xl border border-white/10 p-3">
                 <div className="text-xs font-semibold text-slate-300">Рідкість</div>
                 <div className="mt-2 text-sm text-slate-400">
                    <div className="flex flex-wrap gap-2">
                     {available.rarities.map(rar => {
                         const active = selection.rarities.has(rar);
                         return (
                             <Badge
                                key={rar}
                                variant={active ? "default" : "outline"}
                                className={active ? "bg-teal-500/15 text-teal-300 border-teal-500/30" : ""}
                                onClick={() => toggleSetValue("rar", rar)}
                                role="button"
                             >
                                {rarityLabel(rar)}
                             </Badge>
                         )
                     })}
                    </div>
                 </div>
              </div>

              {/* Type */}
               <div className="glass-panel rounded-xl border border-white/10 p-3">
                 <div className="text-xs font-semibold text-slate-300">Тип</div>
                 <div className="mt-2 text-sm text-slate-400">
                    <div className="flex flex-wrap gap-2">
                     {available.types.map(t => {
                         const active = selection.types.has(t);
                         return (
                             <Badge
                                key={t}
                                variant={active ? "default" : "outline"}
                                className={active ? "bg-teal-500/15 text-teal-300 border-teal-500/30" : ""}
                                onClick={() => toggleSetValue("type", t)}
                                role="button"
                             >
                                {typeLabel(t)}
                             </Badge>
                         )
                     })}
                    </div>
                 </div>
              </div>

              {/* Attunement */}
               <div className="glass-panel rounded-xl border border-white/10 p-3">
                 <div className="text-xs font-semibold text-slate-300">Налаштування</div>
                 <div className="mt-2 flex flex-wrap gap-2">
                     <Badge
                        variant={selection.attunement === true ? "default" : "outline"}
                        className={selection.attunement === true ? "bg-teal-500/15 text-teal-300 border-teal-500/30" : ""}
                        onClick={() => setParams(next => setBoolParam(next, "attn", selection.attunement === true ? null : true))}
                        role="button"
                     >
                        Потрібне
                     </Badge>
                     <Badge
                        variant={selection.attunement === false ? "default" : "outline"}
                        className={selection.attunement === false ? "bg-teal-500/15 text-teal-300 border-teal-500/30" : ""}
                        onClick={() => setParams(next => setBoolParam(next, "attn", selection.attunement === false ? null : false))}
                        role="button"
                     >
                        Не потрібне
                     </Badge>
                 </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="border border-white/10 bg-slate-900/40"
                  onClick={clearFilters}
                >
                  Очистити
                </Button>
                <Button
                  type="button"
                  className="bg-teal-500/15 text-teal-300 border border-teal-500/30"
                  onClick={() => setFiltersOpen(false)}
                >
                  Застосувати
                </Button>
              </div>

            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


import { MagicItemDetailPane } from "@/lib/components/magicItems/MagicItemDetailPane";
