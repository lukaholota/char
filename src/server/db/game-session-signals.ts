import { Client } from "pg";
import { parseTokenPosition, type TokenPosition } from "@/rules/game-map";
import { isGameRollVisibility, type GameRollVisibility } from "@/rules/game-roll";
import { GAME_SESSION_SIGNAL_CHANNEL, type GameSessionSignal } from "@/server/db/game-sessions";

export type GameRollStart = { rollerUserId: number; visibility: GameRollVisibility };
export type GameMapPing = { pingerUserId: number; sceneId: number; at: TokenPosition };
export type GameSessionWake = GameSessionSignal | "resync" | GameRollStart | GameMapPing;
type ParsedSignal = { sessionId: number; wake: GameSessionSignal | GameRollStart | GameMapPing };
type Listener = (wake: GameSessionWake) => void;

type Hub = {
  listeners: Map<number, Set<Listener>>;
  client: Client | null;
  connecting: Promise<void> | null;
  retryDelayMs: number;
};

const MAX_RETRY_DELAY_MS = 30_000;
const globalForHub = globalThis as unknown as { gameSessionHub?: Hub };
const hub: Hub = (globalForHub.gameSessionHub ??= { listeners: new Map(), client: null, connecting: null, retryDelayMs: 1000 });

/// NOTIFY лише будить: дані завжди перечитуються з бази від курсора, тож загублений сигнал не губить подію.
export function subscribeToGameSession(sessionId: number, listener: Listener): () => void {
  const sessionListeners = hub.listeners.get(sessionId) ?? new Set();
  sessionListeners.add(listener);
  hub.listeners.set(sessionId, sessionListeners);
  void ensureListening();
  return () => {
    sessionListeners.delete(listener);
    if (!sessionListeners.size) hub.listeners.delete(sessionId);
  };
}

function ensureListening(): Promise<void> {
  if (hub.client) return Promise.resolve();
  hub.connecting ??= connectListener().finally(() => {
    hub.connecting = null;
  });
  return hub.connecting;
}

async function connectListener(): Promise<void> {
  const client = new Client({ connectionString: process.env.DATABASE_URL, keepAlive: true });
  client.on("notification", (message) => dispatchNotification(message.payload));
  client.on("error", () => dropListener(client));
  client.on("end", () => dropListener(client));
  try {
    await client.connect();
    await client.query(`LISTEN ${GAME_SESSION_SIGNAL_CHANNEL}`);
    hub.client = client;
    hub.retryDelayMs = 1000;
    wakeEverySession("resync");
  } catch (error) {
    console.warn("game session LISTEN failed", error instanceof Error ? error.name : "unknown");
    void client.end().catch(() => undefined);
    scheduleReconnect();
  }
}

function dropListener(client: Client) {
  if (hub.client !== client) return;
  hub.client = null;
  void client.end().catch(() => undefined);
  scheduleReconnect();
}

function scheduleReconnect() {
  if (!hub.listeners.size) return;
  const delay = hub.retryDelayMs;
  hub.retryDelayMs = Math.min(MAX_RETRY_DELAY_MS, hub.retryDelayMs * 2);
  setTimeout(() => void ensureListening(), delay).unref?.();
}

function dispatchNotification(payload: string | undefined) {
  const signal = parseSignal(payload);
  if (!signal) return;
  hub.listeners.get(signal.sessionId)?.forEach((listener) => listener(signal.wake));
}

function wakeEverySession(wake: GameSessionWake) {
  hub.listeners.forEach((listeners) => listeners.forEach((listener) => listener(wake)));
}

export function parseSignal(payload: string | undefined): ParsedSignal | null {
  try {
    const parsed = JSON.parse(payload ?? "") as { s?: unknown; k?: unknown; u?: unknown; v?: unknown; c?: unknown; x?: unknown; y?: unknown };
    if (typeof parsed.s !== "number") return null;
    if (parsed.k === "rolling") return typeof parsed.u === "number" && isGameRollVisibility(parsed.v) ? { sessionId: parsed.s, wake: { rollerUserId: parsed.u, visibility: parsed.v } } : null;
    if (parsed.k === "ping") {
      const at = parseTokenPosition(parsed);
      return typeof parsed.u === "number" && typeof parsed.c === "number" && at ? { sessionId: parsed.s, wake: { pingerUserId: parsed.u, sceneId: parsed.c, at } } : null;
    }
    if (!["roll", "members", "session"].includes(parsed.k as string)) return null;
    return { sessionId: parsed.s, wake: parsed.k as GameSessionSignal };
  } catch {
    return null;
  }
}

export function isListening(): boolean {
  return hub.client !== null;
}
