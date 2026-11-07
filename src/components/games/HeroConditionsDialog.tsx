"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { GameSessionMemberView } from "@/server/db/game-sessions";
import { TokenConditionToggles } from "./TokenConditionToggles";
import { useShownConditions, useTokenConditionChanges } from "./use-token-conditions";

type Props = { sessionId: number; hero: GameSessionMemberView | null; onClose: () => void };

/// Відкривається дотиком на токен героя: власник і майстер міняють стани, решта токенів без тапу.
export function HeroConditionsDialog({ sessionId, hero, onClose }: Props) {
  return (
    <Dialog open={hero !== null} onOpenChange={(isOpen) => (isOpen ? undefined : onClose())}>
      <DialogContent aria-describedby={undefined} className="max-w-md overflow-y-auto">
        <DialogTitle className="pr-10 normal-case leading-8 tracking-normal">{hero?.persName ?? hero?.name}: стани</DialogTitle>
        {hero ? <HeroConditionToggles sessionId={sessionId} hero={hero} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function HeroConditionToggles({ sessionId, hero }: { sessionId: number; hero: GameSessionMemberView }) {
  const changeConditions = useTokenConditionChanges(sessionId);
  const token = { kind: "hero" as const, id: hero.userId };
  const value = useShownConditions(token, hero.conditions);
  return <TokenConditionToggles control={{ value, onChange: (change) => void changeConditions(token, hero.conditions, change) }} />;
}
