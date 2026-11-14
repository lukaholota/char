"use client";

import { Fragment } from "react";
import { showMapPing, useGameSessionLiveStore, type MapPing } from "@/lib/components/game/game-session-live-store";
import type { TokenPosition } from "@/rules/game-map";
import type { GameSessionView } from "@/server/db/game-sessions";
import { MapLabel } from "./MapOverlay";
import { COUNTER_ZOOM } from "./MapTokenSlot";

const NO_PINGS: MapPing[] = [];

/// Свій пінг видно одразу, решта кімнати отримує його з потоку; загублений сигнал нічого не ламає, тож без черги й повторів.
export function pingMap(view: GameSessionView, at: TokenPosition) {
  showMapPing(view.id, { userId: view.myUserId, at });
  void fetch(`/api/game-sessions/${view.id}/ping`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(at), keepalive: true }).catch(() => undefined);
}

export function MapPings({ view }: { view: GameSessionView }) {
  const pings = useGameSessionLiveStore((state) => (state.sessionId === view.id ? state.mapPings : NO_PINGS));
  return pings.map((ping) => (
    <Fragment key={ping.userId}>
      <span aria-hidden className="pointer-events-none absolute z-50 h-10 w-10" style={{ left: `${ping.at.x * 100}%`, top: `${ping.at.y * 100}%`, transform: `translate(-50%, -50%) ${COUNTER_ZOOM}` }}>
        <span className="absolute inset-0 rounded-full border-2 border-amber-200 motion-safe:animate-ping" />
        <span className="absolute inset-3 rounded-full border-2 border-slate-950 bg-amber-200" />
      </span>
      <MapLabel at={ping.at} className="text-amber-100">
        {findPingerName(view, ping.userId)}
      </MapLabel>
    </Fragment>
  ));
}

function findPingerName(view: GameSessionView, userId: number): string {
  const members = view.members.filter((member) => member.userId === userId);
  if (members.some((member) => member.role === "GM")) return "Майстер";
  return members[0]?.persName ?? members[0]?.name ?? "Учасник";
}
