"use client";

import { useEffect, useRef, type RefObject } from "react";
import { toast } from "sonner";
import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { duplicateMapCreatureAction, removeMapCreaturesAction } from "@/lib/actions/game-sessions";
import { findPastePosition } from "@/rules/game-map";
import { scatterObjectPlacement, toObjectPlacement, type ObjectPlacement } from "@/rules/game-objects";
import type { GameSessionView } from "@/server/db/game-sessions";
import { pushUndoStep } from "./map-history";
import { findIdInGroupKey } from "@/rules/map-group";
import type { MapGroup } from "./use-map-group";
import type { SelectedToken } from "./TokenTransformControls";
import { toDraft, type LightDraft, type MapLights } from "./use-map-lights";
import type { MapObjects } from "./use-map-objects";

export type MapClipboardItem = { kind: "object"; imageKey: string; placement: ObjectPlacement } | { kind: "light"; light: LightDraft } | { kind: "creature"; creatureId: number };
type KeyPress = { code: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean };
type Options = { view: GameSessionView; canEdit: boolean; scope: RefObject<Element | null>; objects: MapObjects; lights: MapLights; token: SelectedToken | null; group: MapGroup };

/// Буфер живе поза Reactом: скопійоване на одній сцені вставляється на іншій.
let copied: MapClipboardItem[] = [];
let pasteCount = 0;

/// event.code — фізична клавіша, тож Ctrl+C працює й на українській розкладці. Shift+V кидає обʼєкти з іншим розміром і поворотом — для каміння й кущів.
export function findClipboardAction(press: KeyPress): "copy" | "paste" | "paste-scattered" | null {
  if (!(press.ctrlKey || press.metaKey) || press.altKey) return null;
  if (press.code === "KeyV") return press.shiftKey ? "paste-scattered" : "paste";
  return press.code === "KeyC" && !press.shiftKey ? "copy" : null;
}

export function useMapClipboard(options: Options) {
  const router = useModeRouter();
  const latest = useRef(options);
  latest.current = options;

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const action = findClipboardAction(event);
      const { canEdit, scope } = latest.current;
      if (!action || !canEdit || event.defaultPrevented || !scope.current || scope.current.closest('[aria-hidden="true"]')) return;
      if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable]")) return;
      if (action === "copy" ? !copyChosen(latest.current) : !pasteCopied(latest.current, () => router.refresh(), action === "paste-scattered")) return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return { duplicateChosen: () => copyChosen(latest.current) && pasteCopied(latest.current, () => router.refresh()) };
}

/// Герої не копіюються, тож група з самих героїв нічого не дає.
export const hasCopyableMembers = (group: MapGroup) => group.findMembers().some((member) => !member.key.startsWith("hero-"));

function copyChosen({ objects, lights, token, group }: Options): boolean {
  if (window.getSelection()?.isCollapsed === false) return false;
  const members = group.findMembers();
  const single = members.length > 1 ? null : findChosenItem(objects, lights, token);
  const items = single ? [single] : members.flatMap((member) => findGroupItem(objects, member.key) ?? []);
  if (!items.length) return false;
  copied = items;
  pasteCount = 0;
  return true;
}

function findChosenItem(objects: MapObjects, lights: MapLights, token: SelectedToken | null): MapClipboardItem | null {
  if (objects.chosen) return { kind: "object", imageKey: objects.chosen.imageKey, placement: toObjectPlacement(objects.chosen) };
  if (lights.chosen) return { kind: "light", light: toDraft(lights.chosen) };
  if (token?.lightTarget.kind === "creature") return { kind: "creature", creatureId: token.lightTarget.creature.id };
  return null;
}

function findGroupItem(objects: MapObjects, key: string): MapClipboardItem | null {
  const id = findIdInGroupKey(key);
  if (key.startsWith("creature-")) return { kind: "creature", creatureId: id };
  const object = key.startsWith("object-") ? objects.shown.find((shown) => shown.id === id) : undefined;
  return object ? { kind: "object", imageKey: object.imageKey, placement: toObjectPlacement(object) } : null;
}

/// Копія зсувається вниз-праворуч, група — цілою; розмір і поворот міняються лише на прохання.
function pasteCopied({ view, objects, lights }: Options, refresh: () => void, isScattered = false): boolean {
  if (!copied.length) return false;
  pasteCount += 1;
  const step = pasteCount;
  const copiedObjects = copied.flatMap((item) => (item.kind === "object" ? [item] : []));
  const creatureIds = copied.flatMap((item) => (item.kind === "creature" ? [item.creatureId] : []));
  const [only] = copied;
  const placeCopy = (placement: ObjectPlacement) => ({ ...(isScattered ? scatterObjectPlacement(placement) : placement), at: findPastePosition(placement.at, step) });
  if (copied.length === 1 && only.kind === "object") objects.pasteCopy(only.imageKey, placeCopy(only.placement));
  else if (copiedObjects.length) void objects.pasteMany(copiedObjects.map((item) => ({ imageKey: item.imageKey, placement: placeCopy(item.placement) })));
  if (copied.length === 1 && only.kind === "light") void lights.place({ ...only.light, at: findPastePosition(only.light.at, step) });
  if (creatureIds.length) void pasteCreatures(view, creatureIds, step, refresh);
  return true;
}

/// Копії створює сервер (номер, хіти), тож скасування прибирає ті істоти, які він повернув, — одним кроком.
async function pasteCreatures(view: GameSessionView, creatureIds: number[], step: number, refresh: () => void) {
  const duplicateAll = async () => {
    const results = await Promise.all(creatureIds.map((id) => duplicateMapCreatureAction(view.id, id, step).catch(() => ({ ok: false as const, error: "Немає звʼязку — копію не додано" }))));
    const failed = results.find((result) => !result.ok);
    if (failed && !failed.ok) toast.error(failed.error);
    refresh();
    return results.flatMap((result) => (result.ok ? [result.value.id] : []));
  };
  let copyIds = await duplicateAll();
  if (!copyIds.length || view.viewedSceneId === null) return;
  pushUndoStep(view.viewedSceneId, {
    undo: async () => {
      await Promise.all(copyIds.map((id) => removeMapCreaturesAction(view.id, id)));
      refresh();
    },
    redo: async () => {
      copyIds = await duplicateAll();
    },
  });
}
