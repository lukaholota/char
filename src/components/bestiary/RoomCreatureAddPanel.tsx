"use client";

import { useEffect, useState, useTransition } from "react";
import { Minus, Plus, Swords } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addMapCreaturesAction } from "@/lib/actions/game-sessions";
import type { CreatureIndexEntry } from "@/lib/bestiary-index";
import { cn } from "@/lib/utils";
import { MAP_CREATURE_LIMITS, type MapCreatureRuleset } from "@/rules/game-map-creatures";

export const ROOM_PICKER_PARAM = "room";
export const MAP_CREATURES_ADDED_MESSAGE = "MAP_CREATURES_ADDED";

/// Бестіарій у модалці кімнати (`?room=<id>`) — та сама сторінка каталогу, лише з кнопкою «на мапу».
export function RoomCreatureAddPanel({ creature, ruleset }: { creature: CreatureIndexEntry; ruleset: MapCreatureRuleset }) {
  const roomId = useRoomPickerId();
  const [count, setCount] = useState(1);
  const [isAlly, setIsAlly] = useState(false);
  const [customName, setCustomName] = useState("");
  const [isAdding, startAdding] = useTransition();
  if (roomId === null) return null;

  const add = () =>
    startAdding(async () => {
      const result = await addMapCreaturesAction(roomId, { creatureKey: creature.key, ruleset, count, isAlly, customName });
      if (!result.ok) return void toast.error(result.error);
      window.parent?.postMessage({ type: MAP_CREATURES_ADDED_MESSAGE, name: result.value.name, count }, window.location.origin);
    });

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-100">
        <Swords className="h-4 w-4" aria-hidden />
        На мапу кімнати
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Бік" className="flex rounded-xl border border-white/10 p-0.5">
          <SideButton isOn={!isAlly} onClick={() => setIsAlly(false)} tone="border-rose-400/60 bg-rose-500/15 text-rose-100">Ворог</SideButton>
          <SideButton isOn={isAlly} onClick={() => setIsAlly(true)} tone="border-emerald-400/60 bg-emerald-500/15 text-emerald-100">Союзник</SideButton>
        </div>
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
          <span className="text-xs text-slate-500">Залиште порожнім, щоб показати назву зі статблоку. Зі своїм імʼям гравці не бачать статблок і картинку.</span>
        </label>
        <Button type="button" onClick={add} disabled={isAdding} className="ml-auto h-10 self-end">
          {isAdding ? "Додаю…" : "Додати на мапу"}
        </Button>
      </div>
    </div>
  );
}

function SideButton({ isOn, onClick, tone, children }: { isOn: boolean; onClick: () => void; tone: string; children: string }) {
  return (
    <button type="button" aria-pressed={isOn} onClick={onClick} className={cn("h-9 rounded-lg border border-transparent px-3 text-sm", isOn ? tone : "text-slate-400 hover:text-slate-200")}>
      {children}
    </button>
  );
}

function useRoomPickerId(): number | null {
  const [roomId, setRoomId] = useState<number | null>(null);
  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get(ROOM_PICKER_PARAM));
    setRoomId(Number.isInteger(id) && id > 0 ? id : null);
  }, []);
  return roomId;
}
