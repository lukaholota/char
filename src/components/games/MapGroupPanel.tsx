"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { askToConfirm } from "@/components/ui/confirm-dialog";
import { ToolPanel } from "./MapToolbar";
import { DELETE_KEYS, useMapKey } from "./MapObjects";
import { findIdInGroupKey, type GroupShift, type MapGroup } from "./use-map-group";
import type { MapObjects } from "./use-map-objects";

const ESCAPE_KEYS = ["Escape"];

type MapGroupActionsProps = { group: MapGroup; objects: MapObjects | null; moveTokenGroup: (shifts: GroupShift[]) => void; removeCreature: (id: number) => void };

/// shortcut: істоти групи прибираються кожна своїм запитом; для сотень істот за раз — пакетна дія на сервері.
export function MapGroupActions({ group, objects, moveTokenGroup, removeCreature }: MapGroupActionsProps) {
  const members = group.findMembers();
  const removeTokens = async () => {
    const creatureIds = members.filter((item) => item.key.startsWith("creature-")).map((item) => findIdInGroupKey(item.key));
    if (creatureIds.length && !(await askToConfirm({ title: `Прибрати істот: ${creatureIds.length}?`, description: "Вони зникнуть і з мапи, і з ряду під нею.", confirmLabel: "Прибрати", isDestructive: true }))) return;
    moveTokenGroup(members.filter((item) => item.key.startsWith("hero-")).map((item) => ({ key: item.key, from: item.position, to: null })));
    creatureIds.forEach(removeCreature);
    group.clear();
  };
  const removeObjects = (shown: MapObjects) => {
    shown.eraseMany(members.map((item) => findIdInGroupKey(item.key)));
    group.clear();
  };
  return <MapGroupPanel count={members.length} removeLabel={objects ? "Видалити" : "Прибрати з мапи"} onRemove={objects ? () => removeObjects(objects) : () => void removeTokens()} onClear={group.clear} />;
}

type MapGroupPanelProps = { count: number; removeLabel: string; onRemove: () => void; onClear: () => void };

function MapGroupPanel({ count, removeLabel, onRemove, onClear }: MapGroupPanelProps) {
  useMapKey(DELETE_KEYS, onRemove);
  useMapKey(ESCAPE_KEYS, onClear);
  return (
    <ToolPanel title={`Вибрано: ${count}`} onClose={onClear}>
      <p className="text-sm text-slate-300">Перетягніть будь-кого з рамкою — решта переїде разом.</p>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={onRemove} className="h-11 gap-2 text-rose-200"><Trash2 className="h-4 w-4" aria-hidden />{removeLabel}</Button>
        <Button type="button" variant="ghost" onClick={onClear} className="h-11 text-slate-300">Зняти вибір</Button>
      </div>
    </ToolPanel>
  );
}
