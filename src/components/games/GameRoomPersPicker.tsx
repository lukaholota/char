"use client";

import { use, useState, useTransition } from "react";
import { ChevronRight, ScrollText, UserRound } from "lucide-react";
import { toast } from "sonner";
import { PersCardBody } from "@/app/char/home/PersCardBody";
import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { bindGameSessionPersAction } from "@/lib/actions/game-sessions";
import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import { buildMediaImageUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";
import type { BindablePers, GameSessionView } from "@/server/db/game-sessions";
import { GameAvatar } from "./GameAvatar";
import { ROOM_CARD } from "./GameRoomSidebar";
import { useGamesHref } from "./use-games-href";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";

const OPTION = "w-full rounded-xl border border-white/10 bg-slate-900/60 text-left hover:border-white/25 hover:bg-slate-900 disabled:opacity-60";

export function GameRoomPersPicker({ view, bindablePers }: { view: GameSessionView; bindablePers: Promise<BindablePers[]> }) {
  const options = use(bindablePers);
  const [isOpen, setIsOpen] = useState(false);
  const bound = options.find((pers) => pers.persId === view.myPersId) ?? null;
  const boundName = bound?.name ?? view.members.find((member) => member.userId === view.myUserId)?.persName ?? null;
  const canChange = !view.isArchived;

  return (
    <section aria-labelledby="game-room-pers" className={ROOM_CARD}>
      <h2 id="game-room-pers" className="font-rpg-display text-lg text-slate-100">Мій персонаж</h2>
      {view.myPersId && boundName ? (
        <BoundPersButton pers={bound} name={boundName} canChange={canChange} onOpen={() => setIsOpen(true)} />
      ) : canChange ? (
        <Button type="button" size="lg" onClick={() => setIsOpen(true)} className="h-12 w-full gap-2 text-base">
          <UserRound className="h-5 w-5" aria-hidden />
          Обрати персонажа
        </Button>
      ) : (
        <p className="text-sm text-slate-400">Без персонажа</p>
      )}
      {view.myPersId ? (
        <Link href={`/char/${view.myPersId}`} onClick={() => captureGameEvent("game_sheet_opened", { surface: "card" })} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 w-full gap-2 text-base")}>
          <ScrollText className="h-5 w-5" aria-hidden />
          Відкрити лист персонажа
        </Link>
      ) : (
        <p className="text-sm text-slate-400">Кидки з листа підписуються іменем персонажа. Вільні кубики — вашим іменем.</p>
      )}
      {canChange ? <PersPickerDialog view={view} options={options} isOpen={isOpen} onOpenChange={setIsOpen} /> : null}
    </section>
  );
}

function BoundPersButton({ pers, name, canChange, onOpen }: { pers: BindablePers | null; name: string; canChange: boolean; onOpen: () => void }) {
  const summary = pers ? `${translateValue(pers.race.name)} ${translateValue(pers.class.name)} ${pers.level}` : null;
  const avatar = pers?.portraitKey ? buildMediaImageUrl(pers.portraitKey, "thumbnail") : null;
  return (
    <button type="button" onClick={onOpen} disabled={!canChange} aria-label={`${name}. Змінити персонажа`} className={cn(OPTION, "flex min-h-16 items-center gap-3 p-3 disabled:opacity-100")}>
      <GameAvatar src={avatar} name={name} className="h-12 w-12 text-lg" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-rpg-display text-lg text-slate-50">{name}</span>
        {summary ? <span className="block truncate text-sm text-slate-400">{summary}</span> : null}
      </span>
      {canChange ? <span className="flex shrink-0 items-center gap-1 text-sm text-slate-400">Змінити<ChevronRight className="h-4 w-4" aria-hidden /></span> : null}
    </button>
  );
}

function PersPickerDialog({ view, options, isOpen, onOpenChange }: { view: GameSessionView; options: BindablePers[]; isOpen: boolean; onOpenChange: (isOpen: boolean) => void }) {
  const router = useModeRouter();
  const gamesHref = useGamesHref();
  const [isPending, startTransition] = useTransition();
  const choose = (persId: number | null) => {
    if (persId === view.myPersId) return onOpenChange(false);
    startTransition(async () => {
      const result = await bindGameSessionPersAction(view.id, persId);
      if (!result.ok) return void toast.error(result.error);
      captureGameEvent("game_pers_bound", { has_pers: persId !== null, option_count: options.length });
      onOpenChange(false);
      router.refresh();
    });
  };
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88svh] max-w-2xl overflow-y-auto">
        <DialogTitle className="pr-8 text-2xl normal-case leading-tight tracking-normal text-slate-50">Ким ви граєте в «{view.name}»?</DialogTitle>
        <DialogDescription>Інші учасники бачитимуть персонажа поруч із вашими кидками.</DialogDescription>
        {options.length ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {options.map((pers) => (
              <li key={pers.persId}>
                <button type="button" onClick={() => choose(pers.persId)} disabled={isPending} aria-pressed={pers.persId === view.myPersId} className={cn(OPTION, pers.persId === view.myPersId && "border-arcane-400/60 ring-2 ring-arcane-400/60")}>
                  <PersCardBody pers={{ name: pers.name, portraitKey: pers.portraitKey, ruleset: pers.ruleset, isPinned: pers.isPinned, raceName: pers.race.name, className: pers.class.name, level: pers.level }} selectionMode isSelected={pers.persId === view.myPersId} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-300">
            У вас ще немає персонажів. <Link href={gamesHref("/char/home")} className="underline">До моїх персонажів</Link>
          </p>
        )}
        <Button type="button" variant="outline" onClick={() => choose(null)} disabled={isPending || !view.myPersId} className="h-12 w-full text-base">
          Грати без персонажа
        </Button>
      </DialogContent>
    </Dialog>
  );
}
