"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { Button } from "@/components/ui/button";
import { askToConfirm } from "@/components/ui/confirm-dialog";
import { removeMapCreaturesAction } from "@/lib/actions/game-sessions";
import { AddMapCreaturesDialog } from "./AddMapCreaturesDialog";
import { QuickNpcDialog } from "./QuickNpcDialog";

type TrayProps = { sessionId: number; hasCreatures: boolean; hasWaiting: boolean; children: ReactNode };

export function CreatureTray({ sessionId, hasCreatures, hasWaiting, children }: TrayProps) {
  const router = useModeRouter();
  const [isClearing, setIsClearing] = useState(false);
  const clearAll = async () => {
    if (!(await askToConfirm({ title: "Прибрати всіх істот?", description: "Зникнуть і з мапи, і з ряду під нею.", confirmLabel: "Прибрати всіх", isDestructive: true }))) return;
    setIsClearing(true);
    const result = await removeMapCreaturesAction(sessionId, null);
    setIsClearing(false);
    if (!result.ok) return void toast.error(result.error);
    router.refresh();
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <AddMapCreaturesDialog sessionId={sessionId} />
        <QuickNpcDialog sessionId={sessionId} />
        {hasWaiting ? <ul aria-label="Істоти поза мапою" className="flex flex-wrap gap-3">{children}</ul> : null}
        {hasCreatures ? (
          <Button type="button" variant="ghost" onClick={clearAll} disabled={isClearing} className="ml-auto h-11 px-3 text-slate-400">
            Прибрати всіх
          </Button>
        ) : null}
      </div>
      {hasWaiting ? <p className="text-sm text-slate-400">Перетягніть істоту на мапу. Дотик відкриває статблок.</p> : null}
    </div>
  );
}
