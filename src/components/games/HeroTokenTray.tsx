import type { ReactNode } from "react";
import type { GameSessionMemberView, GameSessionView } from "@/server/db/game-sessions";

/// Лоток видно, лише коли є що поставити: порожній не забирає висоту в мапи.
export function HeroTokenTray({ view, waiting, children }: { view: GameSessionView; waiting: GameSessionMemberView[]; children: ReactNode }) {
  if (!waiting.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-400">{findTrayHint(view, waiting)}</p>
      <ul className="flex flex-wrap gap-3">{children}</ul>
    </div>
  );
}

function findTrayHint(view: GameSessionView, waiting: GameSessionMemberView[]): string {
  const canPlace = !view.isArchived && (view.myRole === "GM" || waiting.some((member) => member.userId === view.myUserId));
  return canPlace ? "Перетягніть токен на мапу." : "Ще не на мапі:";
}
