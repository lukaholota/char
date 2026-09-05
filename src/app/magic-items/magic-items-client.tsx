"use client";

import { useMemo, useState } from "react";
import {
  Printer,
  UserPlus,
  Check,
  Loader2,
  Trash2,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { MagicItemType, ItemRarity, Ruleset } from "@prisma/client";
import { MagicItemDetailPane } from "@/lib/components/magicItems/MagicItemDetailPane";
import { MagicItemsFilterDialog } from "@/lib/components/magicItems/MagicItemsFilterDialog";
import { ContentListPage } from "@/components/catalogs/ContentListPage";
import { getMagicItemTypeVisual, getMagicItemRarityBadge } from "@/components/catalogs/catalog-visuals";
import { useCatalogUrlSync } from "@/hooks/useCatalogUrlSync";
import {
  getParamSet,
  setParamSet,
  getBoolParam,
  setBoolParam,
  getSearchParamsFromLocation,
  replaceUrlSearchParams,
} from "@/lib/catalog-url-helpers";
import { getUserPersesMagicItemIndex } from "@/lib/actions/pers";
import {
  clearSourceParams,
  collectCatalogSources,
  countSourceFilters,
  matchesSourceSelection,
  parseSourceSelection,
  toggleHomebrewParam,
  toggleSourceParam,
  type SourceSelection,
} from "@/lib/catalog-source-filter";
import { collectMagicItemTraits, hasMagicItemTrait } from "@/lib/magic-item-traits";
import { toggleMagicItemForPers } from "@/lib/actions/magic-item-actions";
import { cn } from "@/lib/utils";

export type MagicItemListItem = {
  magicItemId: number;
  name: string;
  engName: string;
  itemType: MagicItemType;
  rarity: ItemRarity;
  requiresAttunement: boolean;
  typeLineEng?: string | null;
  attunementConditionEng?: string | null;
  ruleset?: Ruleset | string;
  source?: string | null;
  isCursed?: boolean;
  isConsumable?: boolean;
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
  traits: Set<string>;
  source: SourceSelection;
  q: string;
  item: string;
};

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

const parseSelection = (params: URLSearchParams): SelectionState => {
  return {
    rarities: getParamSet(params, "rar"),
    types: getParamSet(params, "type"),
    attunement: getBoolParam(params, "attn"),
    traits: getParamSet(params, "trait"),
    source: parseSourceSelection(params),
    q: params.get("q") ?? "",
    item: params.get("item")?.trim() || "",
  };
};

function rarityLabel(rarity: string) {
  return itemRarityTranslations[rarity as keyof typeof itemRarityTranslations] || rarity;
}

function typeLabel(type: string) {
  return magicItemTypeTranslations[type as keyof typeof magicItemTypeTranslations] || type;
}

type PersIndexItem = {
  persId: number;
  name: string;
  magicItemIds: number[];
};

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
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:text-arcane-300"
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
                {has ? <Check className="h-4 w-4 text-arcane-400" /> : null}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type RowItem =
  | { kind: "header"; rarity: string; count: number }
  | { kind: "item"; rarity: string; item: MagicItemListItem };

export function MagicItemsClient({
  items,
  initialSearchParams = {},
  ruleset = "RULES_2014",
}: {
  items: MagicItemListItem[];
  initialSearchParams?: InitialSearchParams;
  ruleset?: Ruleset | string;
}) {
  const is2024 = ruleset === "RULES_2024" || items[0]?.ruleset === "RULES_2024";
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [persIndex, setPersIndex] = useState<PersIndexItem[] | null>(null);
  const [selectedModalItem, setSelectedModalItem] = useState<MagicItemListItem | null>(null);
  const [printIds, setPrintIds] = useState<number[]>([]);

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

  const { qInput, setQInput, selection } = useCatalogUrlSync<SelectionState>(
    parseSelection,
    initialSearchParams
  );

  const filtered = useMemo(() => {
    const q = selection.q.trim().toLowerCase();
    return items.filter((item) => {
      if (q) {
        const hay = `${item.name} ${item.engName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (selection.rarities.size > 0 && !selection.rarities.has(item.rarity)) {
        return false;
      }

      if (selection.types.size > 0 && !selection.types.has(item.itemType)) {
        return false;
      }

      if (selection.attunement !== null && item.requiresAttunement !== selection.attunement) {
        return false;
      }

      if (selection.traits.size > 0) {
        const hasAll = Array.from(selection.traits).every((trait) => hasMagicItemTrait(item, trait));
        if (!hasAll) return false;
      }

      if (!matchesSourceSelection(item.source, selection.source)) {
        return false;
      }

      return true;
    });
  }, [items, selection]);

  const selectedItem = useMemo(() => {
    if (selection.item) {
      const byParam = items.find(
        (i) =>
          String(i.magicItemId) === selection.item ||
          i.engName.toLowerCase() === selection.item.toLowerCase() ||
          i.name.toLowerCase() === selection.item.toLowerCase()
      );
      if (byParam) return byParam;
    }
    return filtered[0] ?? null;
  }, [filtered, selection.item, items]);

  const setParams = (mutate: (next: URLSearchParams) => void) => {
    const next = getSearchParamsFromLocation();
    mutate(next);
    replaceUrlSearchParams(next);
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
      traits: collectMagicItemTraits(items),
      sources: collectCatalogSources(items),
    };
  }, [items]);

  const clearFilters = () => {
    setParams((next) => {
      next.delete("rar");
      next.delete("type");
      next.delete("attn");
      next.delete("trait");
      clearSourceParams(next);
    });
  };

  const activeFiltersCount =
    selection.rarities.size +
    selection.types.size +
    selection.traits.size +
    countSourceFilters(selection.source) +
    (selection.attunement !== null ? 1 : 0);
  const hasActiveFilters = activeFiltersCount > 0;

  const [isPending, setIsPending] = useState(false);
  const [addedItems, setAddedItems] = useState<Set<number>>(new Set());

  const handleAddItem = async (itemId: number) => {
    if (!embedParams.persId) return;
    setIsPending(true);
    try {
      const res = await toggleMagicItemForPers({ persId: embedParams.persId, magicItemId: itemId });
      if (res.success) {
        setAddedItems((prev) => new Set(prev).add(itemId));
        if (isEmbedMode) {
          window.parent.postMessage({ type: "ITEM_ADDED" }, "*");
        }
      }
    } catch (e) {
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

  const flatRows = useMemo<RowItem[]>(() => {
    const rarityOrder = ["COMMON", "UNCOMMON", "RARE", "VERY_RARE", "LEGENDARY", "ARTIFACT"];
    const grouped = new Map<string, MagicItemListItem[]>();
    for (const item of filtered) {
      const arr = grouped.get(item.rarity) ?? [];
      arr.push(item);
      grouped.set(item.rarity, arr);
    }

    const sortedRarities = Array.from(grouped.keys()).sort((a, b) => {
      return rarityOrder.indexOf(a) - rarityOrder.indexOf(b);
    });

    return sortedRarities.flatMap((rar) => {
      const list = grouped.get(rar) || [];
      list.sort((a, b) => a.name.localeCompare(b.name, "uk"));
      return [
        { kind: "header" as const, rarity: rar, count: list.length },
        ...list.map((item) => ({ kind: "item" as const, rarity: rar, item })),
      ];
    });
  }, [filtered]);

  return (
    <ContentListPage<MagicItemListItem, RowItem>
      title={is2024 ? "Магічні предмети 2024" : "Магічні предмети"}
      is2024={is2024}
      topBanner={
        isEmbedMode && (
          <div className="mb-4 rounded-xl border border-arcane-500/30 bg-arcane-500/10 p-2.5 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-sm text-arcane-200">
              <UserPlus className="h-4 w-4" />
              <span>
                Додавання предметів для <strong>{embedParams.persName || `персонажа #${embedParams.persId}`}</strong>
              </span>
            </div>
          </div>
        )
      }
      searchQuery={qInput}
      onSearchChange={setQInput}
      searchPlaceholder="Пошук предметів..."
      hasActiveFilters={hasActiveFilters}
      activeFiltersCount={activeFiltersCount}
      onOpenFilters={() => setFiltersOpen(true)}
      onClearFilters={clearFilters}
      headerActions={
        !isEmbedMode && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-xl border-white/10 bg-slate-900/60 text-xs"
                disabled={printIds.length === 0}
              >
                <Printer className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Друк</span>
                <span className="text-xs text-slate-400">({printIds.length})</span>
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
        )
      }
      data={flatRows}
      emptyState={
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <Package className="h-10 w-10 text-slate-600 mb-2" />
          <p className="text-sm font-medium text-slate-400">Предметів не знайдено</p>
          <p className="text-xs text-slate-500 mt-1">Спробуйте змінити фільтри або пошуковий запит</p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4 rounded-xl text-xs">
              Скинути всі фільтри
            </Button>
          )}
        </div>
      }
      renderItem={(_index, row) => {
        if (row.kind === "header") {
          return (
            <div className="pt-3 pb-1 px-1">
              <div
                className={cn(
                  "rounded-xl border bg-slate-900/70 px-3.5 py-2 text-slate-200 backdrop-blur-xl flex items-center justify-between shadow-sm",
                  is2024 ? "border-amber-500/20" : "border-arcane-500/20"
                )}
              >
                <span
                  className={cn(
                    "font-sans text-sm sm:text-base font-semibold tracking-wide text-transparent bg-clip-text",
                    is2024
                      ? "bg-gradient-to-r from-amber-300 via-amber-100 to-amber-400"
                      : "bg-gradient-to-r from-arcane-300 via-arcane-100 to-arcane-400"
                  )}
                >
                  {rarityLabel(row.rarity)}
                </span>
                <span className="text-xs font-mono font-medium text-slate-400">({row.count})</span>
              </div>
            </div>
          );
        }

        const item = row.item;
        const isSelected = selectedItem?.magicItemId === item.magicItemId;
        const inPrint = printIds.includes(item.magicItemId);
        const visual = getMagicItemTypeVisual(item.itemType);
        const rarityBadgeClass = getMagicItemRarityBadge(item.rarity);
        const Icon = visual.icon;

        return (
          <div key={item.magicItemId} className="pt-2 pb-0.5 px-0.5">
            <div
              onClick={() => {
                setParams((next) => next.set("item", String(item.magicItemId)));
                if (typeof window !== "undefined" && window.innerWidth < 1024) {
                  setSelectedModalItem(item);
                }
              }}
              className={cn(
                "glass-panel group relative overflow-hidden rounded-xl border p-3 transition-all duration-300 cursor-pointer",
                isSelected
                  ? is2024
                    ? "border-gradient-rpg border-gradient-rpg-active glass-active bg-white/5 text-white ring-1 ring-amber-400/40"
                    : "border-gradient-rpg border-gradient-rpg-active glass-active bg-white/5 text-white ring-1 ring-arcane-400/40"
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/7"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                {/* Left type icon badge */}
                <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border", visual.iconWrap)}>
                  <Icon className={cn("h-5 w-5", visual.iconColor)} />
                </div>

                {/* Center item info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={cn(
                        "truncate text-[15px] font-semibold transition-colors",
                        isSelected
                          ? is2024 ? "text-amber-300" : "text-arcane-300"
                          : "text-slate-100 group-hover:text-white"
                      )}
                    >
                      {item.name} {item.engName && <span className="font-normal text-slate-400 text-sm ml-1">[{item.engName}]</span>}
                    </span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
                    <span>{typeLabel(item.itemType)}</span>
                    <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium border", rarityBadgeClass)}>
                      {rarityLabel(item.rarity)}
                    </span>
                    {item.requiresAttunement && (
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-medium border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                        Налаштування
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {!isEmbedMode && (
                    <>
                      <button
                        type="button"
                        className={cn(
                          "inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:text-arcane-300 hover:bg-white/5",
                          inPrint && "text-arcane-300 bg-arcane-500/10"
                        )}
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
                      type="button"
                      onClick={() => handleAddItem(item.magicItemId)}
                      disabled={isPending}
                      className={cn(
                        "inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:text-arcane-300 hover:bg-white/5",
                        isPending && "opacity-50"
                      )}
                    >
                      {addedItems.has(item.magicItemId) ? <Check className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      }}
      desktopDetailView={
        selectedItem ? (
          <MagicItemDetailPane item={selectedItem} isEmbedMode={isEmbedMode} />
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40 p-8 text-center backdrop-blur-xl">
            <p className="text-sm text-slate-400">Оберіть предмет для перегляду деталей</p>
          </div>
        )
      }
      selectedModalItem={selectedModalItem}
      onCloseModal={() => setSelectedModalItem(null)}
      modalTitle={selectedModalItem?.name || "Деталі предмета"}
      renderModalContent={(item) => <MagicItemDetailPane item={item} isEmbedMode={isEmbedMode} />}
      filterDialogOpen={filtersOpen}
      onFilterDialogClose={() => setFiltersOpen(false)}
      filterDialogContent={
        <MagicItemsFilterDialog
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          is2024={is2024}
          availableRarities={available.rarities}
          availableTypes={available.types}
          availableTraits={available.traits}
          availableSources={available.sources}
          selectedRarities={selection.rarities}
          selectedTypes={selection.types}
          selectedTraits={selection.traits}
          sourceSelection={selection.source}
          selectedAttunement={selection.attunement}
          toggleRarity={(rar) => toggleSetValue("rar", rar)}
          toggleType={(t) => toggleSetValue("type", t)}
          toggleTrait={(trait) => toggleSetValue("trait", trait)}
          toggleSource={(src) => setParams((next) => toggleSourceParam(next, src))}
          toggleHomebrew={() => setParams((next) => toggleHomebrewParam(next))}
          setAttunement={(v) => setParams((next) => setBoolParam(next, "attn", v))}
          clearFilters={clearFilters}
        />
      }
    />
  );
}
