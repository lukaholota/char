"use client";

import { ScrollText } from "lucide-react";
import { ContentImage } from "@/components/no-ai/ContentImage";
import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { setRoomHeroCutoutAction } from "@/lib/actions/game-sessions";
import { isMediaImageUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";
import { listSheetPersIds } from "@/rules/game-room-heroes";
import type { GameSessionMemberView, GameSessionView } from "@/server/db/game-sessions";
import { sendOptimistic, useOptimistic } from "./optimistic-values";
import { findHeroCutoutKey, useCutoutImage } from "./token-cutout";
import { TokenConditionToggles } from "./TokenConditionToggles";
import { useRoomHeroSheetOpener } from "./use-room-hero-sheet";
import { useShownConditions, useTokenConditionChanges } from "./use-token-conditions";

type Props = { view: GameSessionView; hero: GameSessionMemberView | null; onClose: () => void };

const OPEN_SHEET_BUTTON = "h-12 w-full gap-2 text-base";
const LOOK_CHOICES = [{ isCutout: false, label: "Токен" }, { isCutout: true, label: "Прозорий" }];

/// Відкривається дотиком на токен героя: власник і майстер міняють стани й вигляд токена, решта токенів без тапу.
export function HeroConditionsDialog({ view, hero, onClose }: Props) {
  const sessionId = view.id;
  return (
    <Dialog open={hero !== null} onOpenChange={(isOpen) => (isOpen ? undefined : onClose())}>
      <DialogContent aria-describedby={undefined} className="max-w-md overflow-y-auto">
        <DialogTitle className="pr-10 normal-case leading-8 tracking-normal">{hero?.persName ?? hero?.name}: стани</DialogTitle>
        {hero ? <OpenHeroSheetAction view={view} hero={hero} onClose={onClose} /> : null}
        {hero ? <HeroConditionToggles sessionId={sessionId} hero={hero} /> : null}
        {hero ? <HeroTokenLook key={hero.heroId} sessionId={sessionId} hero={hero} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function OpenHeroSheetAction({ view, hero, onClose }: { view: GameSessionView; hero: GameSessionMemberView; onClose: () => void }) {
  const openHeroSheet = useRoomHeroSheetOpener(view);
  if (hero.persId !== null && listSheetPersIds(view).includes(hero.persId)) {
    const persId = hero.persId;
    return (
      <Button
        type="button"
        variant="outline"
        size="lg"
        className={OPEN_SHEET_BUTTON}
        onClick={() => {
          onClose();
          void openHeroSheet(persId);
        }}
      >
        <ScrollText className="h-5 w-5" aria-hidden />
        Відкрити лист персонажа
      </Button>
    );
  }
  return (
    <Button asChild variant="outline" size="lg" className={OPEN_SHEET_BUTTON}>
      <Link href={`/char/${hero.persId}`} target="_blank" rel="noopener">
        <ScrollText className="h-5 w-5" aria-hidden />
        Відкрити лист персонажа
      </Link>
    </Button>
  );
}

function HeroConditionToggles({ sessionId, hero }: { sessionId: number; hero: GameSessionMemberView }) {
  const changeConditions = useTokenConditionChanges(sessionId);
  const token = { kind: "hero" as const, id: hero.heroId };
  const value = useShownConditions(token, hero.conditions);
  return <TokenConditionToggles control={{ value, onChange: (change) => void changeConditions(token, hero.conditions, change) }} />;
}

/// Прозорим може бути лише портрет із прозорими краями, тож перемикач зʼявляється після перевірки картинки.
function HeroTokenLook({ sessionId, hero }: { sessionId: number; hero: GameSessionMemberView }) {
  const router = useModeRouter();
  const portraitSrc = isMediaImageUrl(hero.avatarUrl) ? hero.avatarUrl : null;
  const { isCutout: hasTransparentArt, inspectImage } = useCutoutImage(portraitSrc);
  const cutoutKey = findHeroCutoutKey(hero.heroId);
  const isCutout = useOptimistic(cutoutKey, hero.isCutout);
  const choose = async (next: boolean) => {
    if (next === isCutout) return;
    const result = await sendOptimistic(cutoutKey, next, () => setRoomHeroCutoutAction(sessionId, hero.heroId, next));
    if (result.ok) router.refresh();
  };
  return (
    <section aria-label="Вигляд токена" className="space-y-2 border-t border-white/10 pt-3">
      {portraitSrc ? (
        <div className={cn("relative h-14 w-14", !hasTransparentArt && "hidden")}>
          <ContentImage src={portraitSrc} alt="" provenance="manual" fill sizes="56px" loading="eager" onLoad={(event) => inspectImage(event.currentTarget)} className="object-contain" />
        </div>
      ) : null}
      {hasTransparentArt ? (
        <div role="group" aria-label="Форма токена" className="grid grid-cols-2 gap-1.5">
          {LOOK_CHOICES.map((choice) => (
            <button key={choice.label} type="button" aria-pressed={isCutout === choice.isCutout} onClick={() => void choose(choice.isCutout)} className={cn("h-11 rounded-xl border text-sm", isCutout === choice.isCutout ? "border-white/30 bg-white/10 text-slate-100" : "border-white/10 text-slate-400 hover:text-slate-200")}>
              {choice.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">Токен стане прозорим, якщо в персонажа портрет на прозорому фоні.</p>
      )}
    </section>
  );
}
