"use client";

import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, LogOut, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { leaveGameSessionAction, renameGameSessionAction, setGameSessionArchivedAction } from "@/lib/actions/game-sessions";
import { useGameSessionStore } from "@/lib/stores/gameSessionStore";
import type { GameSessionView } from "@/server/db/game-sessions";
import { ROOM_CARD } from "./GameRoomSidebar";
import { useGamesHref } from "./use-games-href";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import { askToConfirm } from "@/components/ui/confirm-dialog";

const MANAGEMENT_BUTTON = "h-12 w-full justify-start gap-3 px-4 text-base";

export function GameRoomManagement({ view }: { view: GameSessionView }) {
  return (
    <section aria-labelledby="game-room-management" className={ROOM_CARD}>
      <h2 id="game-room-management" className="font-rpg-display text-lg text-slate-100">Керування кімнатою</h2>
      {view.myRole === "GM" ? <GmManagement view={view} /> : <LeaveButton view={view} />}
    </section>
  );
}

function GmManagement({ view }: { view: GameSessionView }) {
  const [isRenaming, setIsRenaming] = useState(false);
  return (
    <div className="space-y-2">
      {view.isArchived ? null : isRenaming ? (
        <RenameForm view={view} onDone={() => setIsRenaming(false)} />
      ) : (
        <Button type="button" variant="outline" onClick={() => setIsRenaming(true)} className={MANAGEMENT_BUTTON}>
          <Pencil className="h-4 w-4" aria-hidden />
          Перейменувати
        </Button>
      )}
      <ArchiveButton view={view} />
      <p className="text-sm text-slate-400">
        {view.isArchived ? "Відновлена кімната знову приймає кидки. Гравцям треба буде знову обрати її для кидків." : "В архіві журнал лишається, але нові кидки сюди більше не надходять."}
      </p>
    </div>
  );
}

function RenameForm({ view, onDone }: { view: GameSessionView; onDone: () => void }) {
  const router = useModeRouter();
  const [name, setName] = useState(view.name);
  const [isPending, startTransition] = useTransition();
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await renameGameSessionAction(view.id, name.trim());
      if (!result.ok) return void toast.error(result.error);
      onDone();
      router.refresh();
    });
  };
  return (
    <form onSubmit={submit} className="space-y-2">
      <label htmlFor="rename-game-session" className="text-sm font-semibold text-slate-200">Назва кімнати</label>
      <Input id="rename-game-session" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoFocus className="h-12 text-base" />
      <div className="grid grid-cols-2 gap-2">
        <Button type="submit" disabled={isPending || !name.trim()} className="h-12 text-base">Зберегти</Button>
        <Button type="button" variant="ghost" onClick={onDone} className="h-12 text-base">Скасувати</Button>
      </div>
    </form>
  );
}

function ArchiveButton({ view }: { view: GameSessionView }) {
  const router = useModeRouter();
  const deactivate = useGameSessionStore((state) => state.deactivate);
  const [isPending, startTransition] = useTransition();
  const toggleArchived = async () => {
    if (!view.isArchived && !(await askToConfirm({ title: `Заархівувати «${view.name}»?`, description: "Нові кидки в кімнату більше не прийматимуться, журнал лишиться.", confirmLabel: "Заархівувати" }))) return;
    startTransition(async () => {
      const result = await setGameSessionArchivedAction(view.id, !view.isArchived);
      if (!result.ok) return void toast.error(result.error);
      captureGameEvent("game_session_archived", { is_archived: !view.isArchived });
      if (!view.isArchived) deactivate(view.id);
      router.refresh();
    });
  };
  const Icon = view.isArchived ? ArchiveRestore : Archive;
  return (
    <Button type="button" variant="outline" onClick={toggleArchived} disabled={isPending} className={MANAGEMENT_BUTTON}>
      <Icon className="h-4 w-4" aria-hidden />
      {view.isArchived ? "Відновити кімнату" : "Заархівувати кімнату"}
    </Button>
  );
}

function LeaveButton({ view }: { view: GameSessionView }) {
  const router = useModeRouter();
  const gamesHref = useGamesHref();
  const deactivate = useGameSessionStore((state) => state.deactivate);
  const [isPending, startTransition] = useTransition();
  const leave = async () => {
    if (!(await askToConfirm({ title: `Вийти з кімнати «${view.name}»?`, description: "Повернутися можна лише за новим запрошенням.", confirmLabel: "Вийти", isDestructive: true }))) return;
    startTransition(async () => {
      const result = await leaveGameSessionAction(view.id);
      if (!result.ok) return void toast.error(result.error);
      captureGameEvent("game_session_left", {});
      deactivate(view.id);
      router.push(gamesHref("/games"));
    });
  };
  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" onClick={leave} disabled={isPending} className={`${MANAGEMENT_BUTTON} border-rose-400/30 text-rose-200 hover:bg-rose-500/10 hover:text-rose-100`}>
        <LogOut className="h-4 w-4" aria-hidden />
        Вийти з кімнати
      </Button>
      <p className="text-sm text-slate-400">Повернутися можна лише за новим запрошенням від майстра.</p>
    </div>
  );
}
