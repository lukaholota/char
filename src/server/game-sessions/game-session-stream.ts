import { findGameSessionView, touchMemberPresence, signalGameSession, type GameSessionView } from "@/server/db/game-sessions";
import { listEventsAfter, listEventsBefore, type GameRollViewer } from "@/server/db/game-roll-events";
import { canSeeGameRoll } from "@/rules/game-roll";
import { subscribeToGameSession, type GameSessionWake } from "@/server/db/game-session-signals";

const FIRST_PAGE_SIZE = 50;
const CATCH_UP_BATCH = 200;
const HEARTBEAT_MS = 20_000;
const MAX_STREAM_MS = 10 * 60_000;

type StreamInput = { sessionId: number; userId: number; afterSeq: number | null; abortSignal: AbortSignal };

/// Живий потік і догін після реконекту — один шлях: будь-яке пробудження перечитує події від курсора з фільтром видимості.
export function openGameSessionStream(input: StreamInput): ReadableStream<Uint8Array> {
  let cleanup = () => {};
  return new ReadableStream<Uint8Array>({
    start(controller) {
      cleanup = runStream(input, controller);
    },
    cancel() {
      cleanup();
    },
  });
}

function runStream({ sessionId, userId, afterSeq, abortSignal }: StreamInput, controller: ReadableStreamDefaultController<Uint8Array>): () => void {
  const encoder = new TextEncoder();
  const state = { cursor: afterSeq ?? 0, viewer: { userId, isGm: false } as GameRollViewer, sessionJson: "", isClosed: false };
  let queue = Promise.resolve();
  const pending = new Set<"rolls" | "session" | "presence">();

  const send = (chunk: string) => {
    if (state.isClosed) return;
    try {
      controller.enqueue(encoder.encode(chunk));
    } catch {
      close();
    }
  };
  const sendEvent = (event: string, data: unknown, id?: number) => send(`${id !== undefined ? `id: ${id}\n` : ""}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  const refreshSession = async (): Promise<boolean> => {
    const view = await findGameSessionView(sessionId, userId);
    if (!view) {
      sendEvent("removed", {});
      close();
      return false;
    }
    state.viewer = { userId, isGm: view.myRole === "GM" };
    const json = JSON.stringify(view);
    if (json !== state.sessionJson) {
      state.sessionJson = json;
      sendEvent("session", view satisfies GameSessionView);
    }
    return true;
  };

  const catchUp = async () => {
    for (;;) {
      const events = await listEventsAfter(sessionId, state.viewer, state.cursor, CATCH_UP_BATCH);
      for (const event of events) {
        sendEvent("roll", event, event.seq);
        state.cursor = event.seq;
      }
      if (events.length < CATCH_UP_BATCH || state.isClosed) return;
    }
  };

  const sendFirstPage = async () => {
    const { events, hasOlder } = await listEventsBefore(sessionId, state.viewer, null, FIRST_PAGE_SIZE);
    for (const event of events) sendEvent("roll", event, event.seq);
    state.cursor = events.at(-1)?.seq ?? 0;
    sendEvent("ready", { hasOlder, isFresh: true });
  };

  const runTask = (task: () => Promise<unknown>) => {
    queue = queue.then(async () => {
      if (state.isClosed) return;
      try {
        await task();
      } catch (error) {
        console.warn("game session stream task failed", error instanceof Error ? error.name : "unknown");
      }
    });
  };

  const wake = (kind: "rolls" | "session" | "presence") => {
    if (pending.has(kind)) return;
    pending.add(kind);
    runTask(async () => {
      pending.delete(kind);
      if (kind === "presence" && !(await touchMemberPresence(sessionId, userId))) {
        sendEvent("removed", {});
        return close();
      }
      if (kind !== "rolls" && !(await refreshSession())) return;
      await catchUp();
    });
  };

  const onSignal = (signal: GameSessionWake) => {
    if (typeof signal === "object") {
      if (signal.rollerUserId !== userId && canSeeGameRoll(signal.visibility, { isAuthor: false, isGm: state.viewer.isGm })) sendEvent("rolling", { userId: signal.rollerUserId });
      return;
    }
    if (signal === "roll") return wake("rolls");
    wake("session");
  };

  runTask(async () => {
    await touchMemberPresence(sessionId, userId);
    if (!(await refreshSession())) return;
    if (afterSeq === null) await sendFirstPage();
    else {
      await catchUp();
      sendEvent("ready", { hasOlder: null, isFresh: false });
    }
    void signalGameSession(sessionId, "members").catch(() => undefined);
  });

  const unsubscribe = subscribeToGameSession(sessionId, onSignal);
  const heartbeat = setInterval(() => {
    send(": ping\n\n");
    wake("presence");
  }, HEARTBEAT_MS);
  const lifetime = setTimeout(() => runTask(async () => close()), MAX_STREAM_MS);

  function close() {
    if (state.isClosed) return;
    state.isClosed = true;
    unsubscribe();
    clearInterval(heartbeat);
    clearTimeout(lifetime);
    abortSignal.removeEventListener("abort", close);
    try {
      controller.close();
    } catch {}
  }

  abortSignal.addEventListener("abort", close);
  return close;
}
