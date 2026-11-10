"use client";

import { use, useState, useTransition } from "react";
import { CheckSquare, ChevronRight, ScrollText, Square, UserRound } from "lucide-react";
import { toast } from "sonner";
import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { bindGameSessionPersAction, toggleRoomHeroAction } from "@/lib/actions/game-sessions";
import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import { buildMediaImageUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";
import type { BindablePers, GameSessionMemberView, GameSessionView } from "@/server/db/game-sessions";
import { GameAvatar } from "./GameAvatar";
import { ROOM_CARD } from "./GameRoomSidebar";
import { useRoomHeroSheetOpener } from "./use-room-hero-sheet";
import { useGamesHref } from "./use-games-href";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";

const OPTION = "w-full rounded-xl border border-white/10 bg-slate-900/60 text-left hover:border-white/25 hover:bg-slate-900 disabled:opacity-60";

export function GameRoomPersPicker({ view, bindablePers }: { view: GameSessionView; bindablePers: Promise<BindablePers[]> }) {
  const options = use(bindablePers);
  const [isOpen, setIsOpen] = useState(false);
  const myHeroes = view.members.filter((member) => member.userId === view.myUserId && member.persId !== null);
  const canChange = !view.isArchived;
  const open = () => setIsOpen(true);

  return (
    <section aria-labelledby="game-room-pers" className={ROOM_CARD}>
      <h2 id="game-room-pers" className="font-rpg-display text-lg text-slate-100">{myHeroes.length > 1 ? `Мої персонажі · ${myHeroes.length}` : "Мій персонаж"}</h2>
      {myHeroes.length > 1 ? <HeroSheetList view={view} heroes={myHeroes} options={options} canChange={canChange} onChange={open} /> : myHeroes.length === 1 ? <OnlyHeroCard view={view} hero={myHeroes[0]} options={options} canChange={canChange} onChange={open} /> : <NoHeroCard isGm={view.myRole === "GM"} canChange={canChange} onChoose={open} />}
      {canChange ? <PersPickerDialog view={view} options={options} isOpen={isOpen} onOpenChange={setIsOpen} /> : null}
    </section>
  );
}

function NoHeroCard({ isGm, canChange, onChoose }: { isGm: boolean; canChange: boolean; onChoose: () => void }) {
  return (
    <>
      {canChange ? (
        <Button type="button" size="lg" variant={isGm ? "outline" : "default"} onClick={onChoose} className="h-12 w-full gap-2 text-base">
          <UserRound className="h-5 w-5" aria-hidden />
          {isGm ? "Додати персонажа на стіл" : "Обрати персонажа"}
        </Button>
      ) : (
        <p className="text-sm text-slate-400">Без персонажа</p>
      )}
      <p className="text-sm text-slate-400">{isGm ? "Якщо ведете власних героїв, їхні токени й листи будуть у кімнаті поруч із гравцями." : "Кидки з листа підписуються іменем персонажа. Вільні кубики — вашим іменем."}</p>
    </>
  );
}

function OnlyHeroCard({ view, hero, options, canChange, onChange }: { view: GameSessionView; hero: GameSessionMemberView; options: BindablePers[]; canChange: boolean; onChange: () => void }) {
  const openHeroSheet = useRoomHeroSheetOpener(view);
  return (
    <>
      <BoundPersButton pers={findBoundPers(options, hero)} name={hero.persName ?? hero.name} canChange={canChange} onOpen={onChange} />
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={() => {
          captureGameEvent("game_sheet_opened", { surface: "card" });
          void openHeroSheet(hero.persId as number);
        }}
        className="h-12 w-full gap-2 text-base"
      >
        <ScrollText className="h-5 w-5" aria-hidden />
        Відкрити лист персонажа
      </Button>
    </>
  );
}

function HeroSheetList({ view, heroes, options, canChange, onChange }: { view: GameSessionView; heroes: GameSessionMemberView[]; options: BindablePers[]; canChange: boolean; onChange: () => void }) {
  const openHeroSheet = useRoomHeroSheetOpener(view);
  const open = (persId: number) => {
    captureGameEvent("game_sheet_opened", { surface: "card" });
    void openHeroSheet(persId);
  };
  return (
    <>
      <ul className="space-y-1.5">
        {heroes.map((hero) => {
          const name = hero.persName ?? hero.name;
          return (
            <li key={hero.heroId}>
              <button type="button" onClick={() => open(hero.persId as number)} aria-label={`${name}. Відкрити лист`} className={cn(OPTION, "flex min-h-14 items-center gap-3 p-2")}>
                <GameAvatar src={hero.avatarUrl} name={name} className="h-10 w-10 text-base" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-rpg-display text-base text-slate-50">{name}</span>
                  <span className="block truncate text-sm text-slate-400">{summarizeBoundPers(findBoundPers(options, hero))}</span>
                </span>
                <ScrollText className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
      {canChange ? <Button type="button" variant="outline" size="lg" onClick={onChange} className="h-12 w-full text-base">Змінити склад</Button> : null}
    </>
  );
}

function findBoundPers(options: BindablePers[], hero: GameSessionMemberView): BindablePers | null {
  return options.find((pers) => pers.persId === hero.persId) ?? null;
}

function summarizeBoundPers(pers: BindablePers | null): string | null {
  return pers ? `${translateValue(pers.race.name)} ${translateValue(pers.class.name)} ${pers.level}` : null;
}

function BoundPersButton({ pers, name, canChange, onOpen }: { pers: BindablePers | null; name: string; canChange: boolean; onOpen: () => void }) {
  const summary = summarizeBoundPers(pers);
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
  const [pendingPersId, setPendingPersId] = useState<number | null>(null);
  const toggle = (persId: number) => {
    setPendingPersId(persId);
    startTransition(async () => {
      const result = await toggleRoomHeroAction(view.id, persId);
      if (!result.ok) return void toast.error(result.error);
      captureGameEvent("game_pers_bound", { has_pers: true, option_count: options.length });
      router.refresh();
    });
  };
  const playWithoutHero = () => {
    startTransition(async () => {
      const result = await bindGameSessionPersAction(view.id, null);
      if (!result.ok) return void toast.error(result.error);
      captureGameEvent("game_pers_bound", { has_pers: false, option_count: options.length });
      onOpenChange(false);
      router.refresh();
    });
  };
  const hasHero = view.myPersIds.length > 0;
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88svh] max-w-2xl grid-cols-1 overflow-y-auto">
        <DialogTitle className="pr-8 text-2xl normal-case leading-tight tracking-normal text-slate-50">Ким ви граєте в «{view.name}»?</DialogTitle>
        <DialogDescription>Можна обрати кількох. Інші учасники бачитимуть персонажа поруч із вашими кидками{view.myRole === "GM" ? "." : ", а майстер кімнати зможе відкрити й редагувати його лист."}</DialogDescription>
        {options.length ? (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {options.map((pers) => {
              const isChosen = view.myPersIds.includes(pers.persId);
              return (
                <li key={pers.persId}>
                  <button type="button" onClick={() => toggle(pers.persId)} disabled={isPending} aria-pressed={isChosen} className={cn(OPTION, "flex min-h-16 items-center gap-3 p-3", !(isPending && pendingPersId === pers.persId) && "disabled:opacity-100", isChosen && "border-arcane-400/60 ring-2 ring-arcane-400/60")}>
                    {isChosen ? <CheckSquare className="h-5 w-5 shrink-0 text-arcane-300" aria-hidden /> : <Square className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />}
                    <GameAvatar src={pers.portraitKey ? buildMediaImageUrl(pers.portraitKey, "thumbnail") : null} name={pers.name} className="h-12 w-12 text-lg" />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 font-rpg-display text-lg leading-tight text-slate-50">{pers.name}</span>
                      <span className="block truncate text-sm text-slate-400">{summarizeBoundPers(pers)}{pers.ruleset === "RULES_2024" ? " · 2024" : ""}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
        {hasHero ? <Button type="button" onClick={() => onOpenChange(false)} className="h-12 w-full text-base">Готово</Button> : null}
        <div className="space-y-3">
          <p className="text-sm text-slate-300">
            {options.length ? "Потрібен новий герой?" : "У вас ще немає персонажів."} Готовий герой потрібного рівня займе хвилину; назад у кімнату поверне плашка «Журнал» унизу екрана.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button asChild variant={options.length ? "outline" : "default"} className="h-12 text-base"><Link href={gamesHref("/char/presets")}>Взяти готового персонажа</Link></Button>
            <Button asChild variant="outline" className="h-12 text-base"><Link href={gamesHref("/char/create")}>Створити свого</Link></Button>
          </div>
        </div>
        {hasHero ? (
          <Button type="button" variant="outline" onClick={playWithoutHero} disabled={isPending} className="h-12 w-full text-base">
            Грати без персонажа
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
