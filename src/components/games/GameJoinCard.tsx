"use client";

import { useTransition } from "react";
import { Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { Button } from "@/components/ui/button";
import { joinGameSessionAction } from "@/lib/actions/game-sessions";
import { useGameSessionStore } from "@/lib/stores/gameSessionStore";
import { useGamesHref } from "./use-games-href";

export function GameJoinCard({ token, name, isArchived, isFull }: { token: string; name: string; isArchived: boolean; isFull: boolean }) {
  const router = useModeRouter();
  const activate = useGameSessionStore((state) => state.activate);
  const gamesHref = useGamesHref();
  const [isPending, startTransition] = useTransition();
  const blocker = isArchived ? "Кімнату заархівовано — приєднатися вже не можна." : isFull ? "У кімнаті вже максимум гравців. Попросіть майстра звільнити місце." : null;
  const join = () =>
    startTransition(async () => {
      const result = await joinGameSessionAction(token);
      if (!result.ok) return void toast.error(result.error);
      activate({ id: result.value.sessionId, name });
      router.push(gamesHref(`/games/${result.value.sessionId}`));
    });

  return (
    <div className="space-y-5 rounded-2xl border border-arcane-400/25 bg-slate-900/70 p-5 sm:p-6">
      <div className="space-y-1">
        <p className="text-sm text-slate-400">Вас запрошено в кімнату</p>
        <h2 className="font-rpg-display text-3xl text-slate-50">{name}</h2>
      </div>
      {blocker ? (
        <p className="text-sm text-slate-300">{blocker}</p>
      ) : (
        <>
          <p className="max-w-prose text-sm text-slate-300">Ваші кидки з листа персонажа й вільних кубиків зʼявлятимуться в спільному журналі партії. Персонажа оберете вже в кімнаті.</p>
          <Button type="button" size="lg" onClick={join} disabled={isPending} className="h-12 w-full gap-2 px-6 text-base sm:w-auto">
            {isPending ? <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden /> : <LogIn className="h-5 w-5" aria-hidden />}
            Приєднатися до кімнати
          </Button>
        </>
      )}
    </div>
  );
}
