"use client";

import { useState, useTransition } from "react";
import { ChevronRight, Crown, Loader2, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createGameSessionAction } from "@/lib/actions/game-sessions";
import { useGameSessionStore } from "@/lib/stores/gameSessionStore";
import { countWithWordUk } from "@/lib/ukrainian-plural";
import { cn } from "@/lib/utils";
import type { GameSessionListItem } from "@/server/db/game-sessions";
import { useGamesHref } from "./use-games-href";

const MEMBER_FORMS = { one: "учасник", few: "учасники", many: "учасників" };
const NEW_ROOM_INPUT_ID = "new-game-session";

export function GameSessionsHome({ sessions }: { sessions: GameSessionListItem[] }) {
  const activeSessions = sessions.filter((session) => !session.isArchived);
  const archivedSessions = sessions.filter((session) => session.isArchived);
  if (!activeSessions.length) {
    return (
      <div className="space-y-8">
        <CreateGameSessionCard title={archivedSessions.length ? undefined : "Створіть першу кімнату"} />
        {archivedSessions.length ? <ArchivedSessions sessions={archivedSessions} /> : null}
      </div>
    );
  }
  return (
    <div className="space-y-8">
      <section aria-labelledby="game-sessions-active" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="game-sessions-active" className="font-rpg-display text-2xl text-slate-50">Мої кімнати</h2>
          <NewSessionToggle />
        </div>
        <GameSessionList sessions={activeSessions} />
      </section>
      {archivedSessions.length ? <ArchivedSessions sessions={archivedSessions} /> : null}
    </div>
  );
}

export function FocusNewRoomFormButton({ label, className }: { label: string; className?: string }) {
  const focusNewRoomForm = () => {
    const input = document.getElementById(NEW_ROOM_INPUT_ID);
    input?.scrollIntoView({ block: "center" });
    input?.focus({ preventScroll: true });
  };
  return (
    <Button type="button" size="lg" onClick={focusNewRoomForm} className={cn("gap-2", className)}>
      <Plus className="h-5 w-5" aria-hidden />
      {label}
    </Button>
  );
}

function NewSessionToggle() {
  const [isOpen, setIsOpen] = useState(false);
  if (isOpen) return <CreateGameSessionCard onCancel={() => setIsOpen(false)} className="w-full" />;
  return (
    <Button type="button" size="lg" onClick={() => setIsOpen(true)} className="h-12 w-full gap-2 px-6 sm:w-auto">
      <Plus className="h-5 w-5" aria-hidden />
      Нова кімната
    </Button>
  );
}

/// Створення — один крок: назва й кнопка. Запрошення й вибір персонажа чекають уже в кімнаті.
function CreateGameSessionCard({ title = "Нова кімната для партії", onCancel, className }: { title?: string; onCancel?: () => void; className?: string }) {
  const router = useModeRouter();
  const activate = useGameSessionStore((state) => state.activate);
  const gamesHref = useGamesHref();
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return void setName("");
    startTransition(async () => {
      const result = await createGameSessionAction(trimmed);
      if (!result.ok) return void toast.error(result.error);
      activate({ id: result.value.id, name: trimmed });
      router.push(gamesHref(`/games/${result.value.id}`));
    });
  };
  return (
    <form onSubmit={submit} className={cn("space-y-5 rounded-2xl border border-arcane-400/25 bg-slate-900/70 p-5 sm:p-6", className)}>
      <div className="space-y-2">
        <h2 className="font-rpg-display text-2xl text-slate-50">{title}</h2>
        <p className="max-w-prose text-sm text-slate-300">
          Дайте їй назву. Посилання для гравців отримаєте одразу після створення.
        </p>
      </div>
      <div className="space-y-2">
        <label htmlFor={NEW_ROOM_INPUT_ID} className="text-sm font-semibold text-slate-200">Назва нової кімнати</label>
        <Input
          id={NEW_ROOM_INPUT_ID}
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={80}
          required
          autoFocus={Boolean(onCancel)}
          placeholder="Напр. «Копальня Фанделвера»"
          className="h-12 text-base"
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" size="lg" disabled={isPending} className="h-12 gap-2 px-6 text-base">
          {isPending ? <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden /> : <Plus className="h-5 w-5" aria-hidden />}
          Створити кімнату
        </Button>
        {onCancel ? (
          <Button type="button" size="lg" variant="ghost" onClick={onCancel} className="h-12">
            Скасувати
          </Button>
        ) : null}
      </div>
      {onCancel ? null : <p className="border-t border-white/10 pt-4 text-sm text-slate-400">Ви гравець? Попросіть майстра надіслати посилання-запрошення — відкрийте його, і кімната зʼявиться тут.</p>}
    </form>
  );
}

function GameSessionList({ sessions }: { sessions: GameSessionListItem[] }) {
  const activeId = useGameSessionStore((state) => state.active?.id ?? null);
  const gamesHref = useGamesHref();
  return (
    <ul className="space-y-2">
      {sessions.map((session) => {
        const isActive = session.id === activeId;
        return (
          <li key={session.id}>
            <Link
              href={gamesHref(`/games/${session.id}`)}
              className={cn(
                "group flex min-h-20 items-center gap-4 rounded-2xl border px-4 py-3 transition-colors sm:px-5",
                isActive ? "border-arcane-400/40 bg-arcane-500/10 hover:bg-arcane-500/15" : "border-white/10 bg-slate-900/60 hover:border-white/20 hover:bg-slate-900",
              )}
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="truncate font-rpg-display text-lg text-slate-50 sm:text-xl">{session.name}</div>
                <SessionMeta session={session} isActive={isActive} />
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-500 group-hover:text-slate-300" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SessionMeta({ session, isActive }: { session: GameSessionListItem; isActive: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
      <span className="inline-flex items-center gap-1.5">
        {session.myRole === "GM" ? <Crown className="h-3.5 w-3.5 text-arcane-300" aria-hidden /> : null}
        {session.myRole === "GM" ? "Ви майстер" : "Ви гравець"}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5" aria-hidden />
        {countWithWordUk(session.memberCount, MEMBER_FORMS)}
      </span>
      {isActive ? <span className="font-semibold text-arcane-200">Кидки йдуть сюди</span> : null}
    </div>
  );
}

function ArchivedSessions({ sessions }: { sessions: GameSessionListItem[] }) {
  return (
    <details className="group rounded-2xl border border-white/10">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-semibold text-slate-300 hover:text-slate-100 [&::-webkit-details-marker]:hidden">
        Архів · {sessions.length}
        <ChevronRight className="h-4 w-4 text-slate-500 group-open:rotate-90" aria-hidden />
      </summary>
      <div className="px-2 pb-2">
        <GameSessionList sessions={sessions} />
      </div>
    </details>
  );
}
