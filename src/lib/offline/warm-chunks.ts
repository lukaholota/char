import { runWhenIdle } from "@/lib/run-when-idle";

type LoadChunk = () => Promise<unknown>;

const IDLE_TIMEOUT_MS = 5000;

/** One chunk per idle slot, so warming never competes with the sheet the player is using. */
export async function warmChunksWhenIdle(loadChunks: readonly LoadChunk[], signal: AbortSignal): Promise<boolean> {
  let isEveryChunkLoaded = true;
  for (const loadChunk of loadChunks) {
    await waitForIdle(signal);
    if (signal.aborted) return false;
    isEveryChunkLoaded = (await loadChunk().then(() => true, () => false)) && isEveryChunkLoaded;
  }
  return isEveryChunkLoaded;
}

function waitForIdle(signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const cancel = runWhenIdle(resolve, IDLE_TIMEOUT_MS);
    signal.addEventListener("abort", () => { cancel(); resolve(); }, { once: true });
  });
}
