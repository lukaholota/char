"use client";

import type { ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { askToConfirm } from "@/components/ui/confirm-dialog";
import { resizeToken, turnToken, type TokenTransform } from "@/rules/token-transform";
import type { GameSessionView } from "@/server/db/game-sessions";
import { ToolPanel } from "./MapToolbar";
import { DELETE_KEYS, useMapKey } from "./use-map-key";
import { findIdInGroupKey, type GroupShift, type MapGroup } from "./use-map-group";
import type { GroupTokenLook } from "./MapTokenSlot";
import { ROTATION_STEP, SpotlightPicker, TokenLookSteps, describeRotation, describeScale } from "./TokenTransformControls";
import { joinUndoSteps } from "./map-history";
import type { MapObjects } from "./use-map-objects";
import { useGroupSpotlight } from "./use-token-conditions";


type MapGroupActionsProps = { view: GameSessionView; group: MapGroup; objects: MapObjects | null; findLook: (key: string) => GroupTokenLook | null; moveTokenGroup: (shifts: GroupShift[]) => void; removeCreature: (id: number) => void };

/// shortcut: істоти групи прибираються кожна своїм запитом; для сотень істот за раз — пакетна дія на сервері.
export function MapGroupActions({ view, group, objects, findLook, moveTokenGroup, removeCreature }: MapGroupActionsProps) {
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
  const looks = objects ? [] : members.flatMap((item) => findLook(item.key) ?? []);
  return (
    <MapGroupPanel count={members.length} removeLabel={objects ? "Видалити" : "Прибрати з мапи"} onRemove={objects ? () => removeObjects(objects) : () => void removeTokens()} onClear={group.clear}>
      {looks.length ? <GroupLookControls looks={looks} sessionId={view.id} sceneId={view.viewedSceneId} /> : null}
    </MapGroupPanel>
  );
}

const describeShared = (values: string[]) => (values.every((value) => value === values[0]) ? values[0] : "різні");
const isSameTransform = (left: TokenTransform, right: TokenTransform) => left.scale === right.scale && left.rotation === right.rotation;

/// shortcut: кожен токен — окремий запит, а герої діляться лімітом 30 змін за 10 с; для великих груп — пакетна дія на сервері.
function GroupLookControls({ looks, sessionId, sceneId }: { looks: GroupTokenLook[]; sessionId: number; sceneId: number | null }) {
  const spotlight = useGroupSpotlight(sessionId, sceneId, looks);
  const transformAll = (change: (transform: TokenTransform) => TokenTransform) =>
    joinUndoSteps(sceneId, () =>
      looks.forEach((look) => {
        const next = change(look.transform);
        if (!isSameTransform(next, look.transform)) look.sendTransform(next);
      }),
    );
  const resizeAll = (scale: number) => joinUndoSteps(sceneId, () => looks.forEach((look) => look.sendTransform(resizeToken(look.transform, scale))));
  return (
    <>
      <TokenLookSteps
        scale={looks[0].transform.scale}
        size={describeShared(looks.map((look) => describeScale(look.transform)))}
        rotation={describeShared(looks.map((look) => describeRotation(look.transform)))}
        onPreviewScale={(scale) => looks.forEach((look) => look.showTransform(resizeToken(look.transform, scale)))}
        onScale={resizeAll}
        onTurn={(direction) => transformAll((transform) => turnToken(transform, direction * ROTATION_STEP))}
      />
      <SpotlightPicker spotlight={spotlight} />
    </>
  );
}

type MapGroupPanelProps = { count: number; removeLabel: string; onRemove: () => void; onClear: () => void; children?: ReactNode };

function MapGroupPanel({ count, removeLabel, onRemove, onClear, children }: MapGroupPanelProps) {
  useMapKey(DELETE_KEYS, onRemove);
  return (
    <ToolPanel title={`Вибрано: ${count}`} onClose={onClear}>
      <p className="text-sm text-slate-300">Перетягніть будь-кого з рамкою — решта переїде разом.</p>
      {children}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={onRemove} className="h-11 gap-2 text-rose-200"><Trash2 className="h-4 w-4" aria-hidden />{removeLabel}</Button>
        <Button type="button" variant="ghost" onClick={onClear} className="h-11 text-slate-300">Зняти вибір</Button>
      </div>
    </ToolPanel>
  );
}
