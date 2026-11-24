"use client";

import { useEffect, useRef, useState } from "react";
import { Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cancelGameRollAction } from "@/lib/actions/game-sessions";
import { addGameEvents, useGameSessionLiveStore } from "@/lib/components/game/game-session-live-store";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";

export function GameRollCancelButton({ isAsking, onAsk }: { isAsking: boolean; onAsk: () => void }) {
  return (
    <Button type="button" variant="ghost" size="icon" aria-label="Скасувати кидок" aria-expanded={isAsking} onClick={onAsk} className="h-11 w-11 text-slate-400 hover:text-slate-100">
      <Undo2 className="h-4 w-4" aria-hidden />
    </Button>
  );
}

export function GameRollCancelConfirm({ seq, onClose }: { seq: number; onClose: () => void }) {
  const sessionId = useGameSessionLiveStore((state) => state.sessionId);
  const [isCancelling, setIsCancelling] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    boxRef.current?.scrollIntoView?.({ block: "nearest" });
    confirmRef.current?.focus({ preventScroll: true });
  }, []);
  const cancel = async () => {
    if (sessionId === null) return;
    setIsCancelling(true);
    const result = await cancelGameRollAction(sessionId, seq);
    setIsCancelling(false);
    if (!result.ok) return void toast.error(result.error);
    addGameEvents(sessionId, result.value);
    captureGameEvent("game_roll_cancelled", {});
    onClose();
  };
  return (
    <div ref={boxRef} className="mt-2 flex flex-wrap items-center gap-2 border-t border-white/10 pt-2">
      <p className="basis-full text-xs text-slate-300">Скасувати кидок для всіх? Шкоду, лікування й стани від нього буде повернуто, а в журналі зʼявиться запис.</p>
      <Button ref={confirmRef} type="button" variant="outline" disabled={isCancelling} onClick={cancel} className="h-11 px-3 text-sm">
        Так, скасувати
      </Button>
      <Button type="button" variant="ghost" disabled={isCancelling} onClick={onClose} className="h-11 px-3 text-sm">
        Залишити
      </Button>
    </div>
  );
}
