"use client";

import { useState } from "react";
import { ChevronDown, Layers, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { activateGameSceneAction, openGameSceneAction } from "@/lib/actions/game-sessions";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import { cn } from "@/lib/utils";
import { GAME_SCENE_LIMITS, type GameSceneListItem } from "@/rules/game-scenes";
import type { GameSessionView } from "@/server/db/game-sessions";
import { SceneFormDialog } from "./SceneFormDialog";

type FormTarget = { scene: GameSceneListItem | null } | null;

/// Сцени перемикають посеред гри, тож вони в шапці мапи, а не в кінці сторінки.
export function ScenesButton({ view }: { view: GameSessionView }) {
  const [isOpen, setIsOpen] = useState(false);
  const opened = view.scenes.find((scene) => scene.id === view.viewedSceneId);
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setIsOpen(true)} aria-haspopup="dialog" className="h-11 min-w-0 max-w-[60%] gap-2 px-3">
        <Layers className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate">{opened?.name ?? "Сцени"}</span>
        <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent aria-describedby={undefined} className="max-h-[85dvh] overflow-y-auto">
          <DialogTitle className="sr-only">Сцени</DialogTitle>
          <GameScenesCard view={view} onSceneOpened={() => setIsOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

export function GameScenesCard({ view, onSceneOpened }: { view: GameSessionView; onSceneOpened?: () => void }) {
  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const isFull = view.scenes.length >= GAME_SCENE_LIMITS.perRoom;
  return (
    <section aria-labelledby="game-room-scenes" className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 id="game-room-scenes" className="flex-1 font-rpg-display text-lg text-slate-100">Сцени · {view.scenes.length}</h2>
        {view.scenes.length > 0 ? (
          <Button type="button" variant="outline" onClick={() => setFormTarget({ scene: null })} disabled={isFull} className="h-11 gap-1.5 px-3">
            <Plus className="h-4 w-4" aria-hidden />
            Додати сцену
          </Button>
        ) : null}
      </div>
      {view.scenes.length === 0 ? <EmptyScenes onAdd={() => setFormTarget({ scene: null })} /> : (
        <ul className="space-y-2">
          {view.scenes.map((scene) => (
            <SceneRow key={scene.id} sessionId={view.id} scene={scene} isOpen={scene.id === view.viewedSceneId} onEdit={() => setFormTarget({ scene })} onOpened={onSceneOpened} />
          ))}
        </ul>
      )}
      <SceneFormDialog sessionId={view.id} scene={formTarget?.scene ?? null} open={formTarget !== null} onOpenChange={(isOpen) => !isOpen && setFormTarget(null)} />
    </section>
  );
}

function EmptyScenes({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-300">Сцена — це мапа з істотами й токенами героїв. Гравці бачать ту, яку ви їм покажете.</p>
      <Button type="button" onClick={onAdd} className="h-12 w-full gap-2 text-base">
        <Plus className="h-4 w-4" aria-hidden />
        Додайте першу сцену
      </Button>
    </div>
  );
}

function SceneRow({ sessionId, scene, isOpen, onEdit, onOpened }: { sessionId: number; scene: GameSceneListItem; isOpen: boolean; onEdit: () => void; onOpened?: () => void }) {
  const router = useModeRouter();
  const [isBusy, setIsBusy] = useState(false);
  const run = async (work: () => Promise<{ ok: boolean; error?: string }>, onDone?: () => void) => {
    setIsBusy(true);
    const result = await work();
    setIsBusy(false);
    if (!result.ok) return void toast.error(result.error);
    onDone?.();
    router.refresh();
  };
  const show = () =>
    run(async () => {
      const result = await activateGameSceneAction(sessionId, scene.id);
      if (result.ok) captureGameEvent("game_scene_shown", {});
      return result;
    });
  return (
    <li className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border p-1", scene.isActive ? "border-arcane-400/50 bg-arcane-500/10" : "border-white/10")}>
      <button
        type="button"
        onClick={() => run(() => openGameSceneAction(sessionId, scene.id), onOpened)}
        disabled={isBusy || isOpen}
        aria-current={isOpen ? "true" : undefined}
        className={cn("min-h-11 min-w-0 flex-1 basis-32 rounded-lg px-3 py-1 text-left", isOpen ? "bg-white/10" : "hover:bg-white/5")}
      >
        <span className="block truncate text-base text-slate-100">{scene.name}</span>
        <span className="block text-xs text-slate-300">
          {[isOpen ? "Відкрита" : null, scene.isActive ? "Гравці бачать" : null, scene.hasMap ? null : "Без мапи"].filter(Boolean).join(" · ") || " "}
        </span>
      </button>
      {scene.isActive ? null : (
        <Button type="button" variant="outline" onClick={show} disabled={isBusy} className="h-11 px-3 text-sm">
          Показати гравцям
        </Button>
      )}
      <Button type="button" variant="ghost" onClick={onEdit} aria-label={`Налаштування сцени «${scene.name}»`} className="h-11 w-11 p-0 text-slate-300">
        <Pencil className="h-4 w-4" aria-hidden />
      </Button>
    </li>
  );
}
