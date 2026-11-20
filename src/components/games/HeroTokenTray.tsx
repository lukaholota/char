import type { ReactNode, RefObject } from "react";
import type { GameSessionMemberView, GameSessionView } from "@/server/db/game-sessions";
import { FoldSection } from "./MapToolbar";

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

type MapTokenTrayProps = { view: GameSessionView; canEdit: boolean; trayRef: RefObject<HTMLDivElement | null>; heroes: { waiting: GameSessionMemberView[]; trayTokens: ReactNode; placedCount: number }; creatures: { waitingCount: number; tray: ReactNode } };

/// Плашка «Поза мапою» закриває кут мапи, тож сама розгортається лише тоді, коли з неї треба щось узяти просто зараз.
export function MapTokenTray({ view, canEdit, trayRef, heroes, creatures }: MapTokenTrayProps) {
  const waitingCount = heroes.waiting.length + creatures.waitingCount;
  if (waitingCount === 0 && creatures.tray === null) return null;
  const isMyHeroWaiting = heroes.waiting.some((member) => member.userId === view.myUserId);
  const isNeededNow = !view.isArchived && (canEdit ? heroes.placedCount === 0 || creatures.waitingCount > 0 || waitingCount === 0 : isMyHeroWaiting);
  return (
    <div ref={trayRef} className="absolute bottom-2 left-2 z-10 max-h-[calc(100%-4.5rem)] max-w-[min(18rem,calc(100%-4.5rem))] overflow-y-auto overscroll-contain rounded-2xl shadow-xl shadow-black/50">
      <FoldSection title={waitingCount ? `Поза мапою · ${waitingCount}` : "Поза мапою"} isOpenAtStart={isNeededNow} className="bg-slate-950/90">
        <div className="space-y-3">
          <HeroTokenTray view={view} waiting={heroes.waiting}>
            {heroes.trayTokens}
          </HeroTokenTray>
          {creatures.tray}
        </div>
      </FoldSection>
    </div>
  );
}
