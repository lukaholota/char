"use client";

import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listMapLibraryAction } from "@/lib/actions/game-sessions";
import { buildMediaImageUrl } from "@/lib/media-url";
import { MAP_LIBRARY_PACK_LABELS, type LibraryMap } from "@/lib/refs/map-library";
import { cn } from "@/lib/utils";
import { filterLibraryMaps, findQuickLibraryMaps, listLibraryPacks } from "@/rules/game-scenes";

export type LibraryState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; maps: readonly LibraryMap[] };

/// Каталог вантажиться при першому відкритті діалогу й лишається до виходу з кімнати; помилку пробуємо знову при наступному відкритті.
export function useMapLibrary(isWanted: boolean): LibraryState {
  const [library, setLibrary] = useState<LibraryState>({ status: "loading" });
  const shouldLoad = isWanted && library.status !== "ready";
  useEffect(() => {
    if (!shouldLoad) return;
    let isCurrent = true;
    listMapLibraryAction().then(
      (result) => isCurrent && setLibrary(result.ok ? { status: "ready", maps: result.value } : { status: "error", message: result.error }),
      () => isCurrent && setLibrary({ status: "error", message: "Не вдалося завантажити бібліотеку мап" }),
    );
    return () => {
      isCurrent = false;
    };
  }, [shouldLoad]);
  return library;
}

type MapQuickPicksProps = { library: LibraryState; chosenSlug: string | null; onPick: (map: LibraryMap) => void };

export function MapQuickPicks({ library, chosenSlug, onPick }: MapQuickPicksProps) {
  if (library.status === "loading") return <div className="h-28 rounded-lg bg-white/5" aria-hidden />;
  if (library.status === "error") return null;
  const maps = findQuickLibraryMaps(library.maps);
  if (maps.length === 0) return null;
  return (
    <ul aria-label="Швидкий вибір мапи" className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-5 sm:overflow-visible">
      {maps.map((map) => (
        <li key={map.slug} className="w-[42%] shrink-0 snap-start sm:w-auto">
          <LibraryMapTile map={map} isChosen={map.slug === chosenSlug} onPick={onPick} />
        </li>
      ))}
    </ul>
  );
}

function LibraryMapTile({ map, isChosen, onPick }: { map: LibraryMap; isChosen: boolean; onPick: (map: LibraryMap) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPick(map)}
      aria-pressed={isChosen}
      className={cn(
        "block w-full overflow-hidden rounded-lg border bg-white/5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-arcane-300",
        isChosen ? "border-arcane-300 ring-1 ring-arcane-300" : "border-white/10 hover:border-white/30",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- мініатюра вже стиснута скриптом бібліотеки */}
      <img src={buildMediaImageUrl(map.key, "thumbnail")} alt="" loading="lazy" decoding="async" width={map.width} height={map.height} className="aspect-[4/3] w-full bg-white/5 object-cover" />
      <span className="line-clamp-2 min-h-[2.5rem] px-2 py-1 text-sm leading-tight text-slate-100">{map.name}</span>
    </button>
  );
}

type MapLibraryPickerProps = { library: LibraryState; chosenSlug: string | null; onPick: (map: LibraryMap) => void; onBack: () => void };

export function MapLibraryPicker({ library, chosenSlug, onPick, onBack }: MapLibraryPickerProps) {
  const [query, setQuery] = useState("");
  const [pack, setPack] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 pr-10">
        <Button type="button" variant="ghost" onClick={onBack} className="h-11 gap-1 px-2 text-slate-300">
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Назад
        </Button>
        <h3 className="font-rpg-display text-lg text-slate-100">Базові мапи</h3>
      </div>
      {library.status === "loading" ? <p className="text-sm text-slate-400">Завантажуємо бібліотеку…</p> : null}
      {library.status === "error" ? <p role="alert" className="text-sm text-rose-200">{library.message}</p> : null}
      {library.status === "ready" ? <LibraryResults maps={library.maps} query={query} pack={pack} chosenSlug={chosenSlug} onQueryChange={setQuery} onPackChange={setPack} onPick={onPick} /> : null}
    </div>
  );
}

type LibraryResultsProps = {
  maps: readonly LibraryMap[];
  query: string;
  pack: string | null;
  chosenSlug: string | null;
  onQueryChange: (query: string) => void;
  onPackChange: (pack: string | null) => void;
  onPick: (map: LibraryMap) => void;
};

function LibraryResults({ maps, query, pack, chosenSlug, onQueryChange, onPackChange, onPick }: LibraryResultsProps) {
  if (maps.length === 0) return <p className="text-sm text-slate-300">Бібліотека поки порожня. Завантажте свою мапу.</p>;
  const visible = filterLibraryMaps(maps, query, pack);
  return (
    <>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input type="search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Пошук за назвою" aria-label="Пошук мапи за назвою" className="h-11 text-base" />
        <select value={pack ?? ""} onChange={(event) => onPackChange(event.target.value || null)} aria-label="Набір мап" className="h-11 rounded-lg border border-white/15 bg-slate-950 px-3 text-base text-slate-100">
          <option value="">Усі набори</option>
          {listLibraryPacks(maps).map((id) => (
            <option key={id} value={id}>{MAP_LIBRARY_PACK_LABELS[id] ?? id}</option>
          ))}
        </select>
      </div>
      {visible.length === 0 ? <p className="text-sm text-slate-300">Нічого не знайдено.</p> : null}
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {visible.map((map) => (
          <li key={map.slug}>
            <LibraryMapTile map={map} isChosen={map.slug === chosenSlug} onPick={onPick} />
          </li>
        ))}
      </ul>
    </>
  );
}
