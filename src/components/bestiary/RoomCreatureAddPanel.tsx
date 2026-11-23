"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Minus, Plus, Swords } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addMapCreaturesAction } from "@/lib/actions/game-sessions";
import type { CreatureIndexEntry } from "@/lib/bestiary-index";
import { MAP_CREATURE_LIMITS, type MapCreatureRuleset } from "@/rules/game-map-creatures";

export const ROOM_PICKER_PARAM = "room";
export const MAP_CREATURES_ADDED_MESSAGE = "MAP_CREATURES_ADDED";
export const STATBLOCK_PICK_PARAM = "pick";
export const STATBLOCK_PICKED_MESSAGE = "NPC_STATBLOCK_PICKED";
export type PickedStatblock = { key: string; name: string; ruleset: MapCreatureRuleset; imageUrl: string | null };

export function readPickedStatblock(data: unknown): PickedStatblock | null {
  if (typeof data !== "object" || data === null) return null;
  const { type, key, name, ruleset, imageUrl } = data as Record<string, unknown>;
  if (type !== STATBLOCK_PICKED_MESSAGE || typeof key !== "string" || typeof name !== "string" || (ruleset !== "RULES_2014" && ruleset !== "RULES_2024")) return null;
  return { key, name, ruleset, imageUrl: typeof imageUrl === "string" ? imageUrl : null };
}

/// Бестіарій у модалці кімнати (`?room=<id>`) — та сама сторінка каталогу, лише з кнопкою «на мапу».
export function RoomCreatureAddPanel({ creature, ruleset }: { creature: CreatureIndexEntry; ruleset: MapCreatureRuleset }) {
  const roomId = useRoomPickerId();
  const isPickingStatblock = useHasSearchParam(STATBLOCK_PICK_PARAM);
  const [count, setCount] = useState(1);
  const [customName, setCustomName] = useState("");
  const [isAdding, startAdding] = useTransition();
  if (roomId === null) return null;
  if (isPickingStatblock) return <StatblockPickButton statblock={{ key: creature.key, name: creature.name, ruleset, imageUrl: creature.imageUrl ?? null }} />;

  const add = () =>
    startAdding(async () => {
      const result = await addMapCreaturesAction(roomId, { creatureKey: creature.key, ruleset, count, customName });
      if (!result.ok) return void toast.error(result.error);
      window.parent?.postMessage({ type: MAP_CREATURES_ADDED_MESSAGE, name: result.value.name, count }, window.location.origin);
    });

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-100">
        <Swords className="h-4 w-4" aria-hidden />
        На мапу кампанії
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Кількість" className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className="h-10 w-10" aria-label="Менше" disabled={count <= 1} onClick={() => setCount(count - 1)}>
            <Minus className="h-4 w-4" aria-hidden />
          </Button>
          <output aria-live="polite" className="w-6 text-center text-base tabular-nums text-slate-100">{count}</output>
          <Button type="button" variant="ghost" size="icon" className="h-10 w-10" aria-label="Більше" disabled={count >= MAP_CREATURE_LIMITS.perAdd} onClick={() => setCount(count + 1)}>
            <Plus className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        <label className="grid min-w-48 flex-1 gap-1 text-sm text-slate-400">
          Імʼя для гравців
          <input
            value={customName}
            onChange={(event) => setCustomName(event.target.value)}
            maxLength={MAP_CREATURE_LIMITS.customNameLength}
            placeholder={creature.name}
            className="h-10 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-base text-slate-100 placeholder:text-slate-500"
          />
          <span className="text-xs text-slate-500">Залиште порожнім, щоб показати назву зі статблоку. Статблок гравці не бачать ніколи.</span>
        </label>
        <Button type="button" onClick={add} disabled={isAdding} className="ml-auto h-10 self-end">
          {isAdding ? "Додаю…" : "Додати на мапу"}
        </Button>
      </div>
    </div>
  );
}

function StatblockPickButton({ statblock }: { statblock: PickedStatblock }) {
  const pick = () => window.parent?.postMessage({ type: STATBLOCK_PICKED_MESSAGE, ...statblock }, window.location.origin);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-3">
      <p className="text-sm text-slate-300">Статблок для НІПа. Гравці його не бачать.</p>
      <Button type="button" onClick={pick} className="h-11 gap-2">
        <Check className="h-4 w-4" aria-hidden />
        Обрати для НІПа
      </Button>
    </div>
  );
}

function useHasSearchParam(name: string): boolean {
  const [hasParam, setHasParam] = useState(false);
  useEffect(() => setHasParam(new URLSearchParams(window.location.search).has(name)), [name]);
  return hasParam;
}

export function useRoomPickerId(): number | null {
  const [roomId, setRoomId] = useState<number | null>(null);
  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get(ROOM_PICKER_PARAM));
    setRoomId(Number.isInteger(id) && id > 0 ? id : null);
  }, []);
  return roomId;
}
