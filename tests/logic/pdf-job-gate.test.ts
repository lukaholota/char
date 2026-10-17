import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PdfBusyError, PdfTimeoutError, createPdfJobGate, findPdfJobErrorMessage } from "@/server/pdf/pdfJobGate";

type Deferred = { promise: Promise<string>; resolve: (value: string) => void };

function createDeferred(): Deferred {
  let resolve: (value: string) => void = () => {};
  const promise = new Promise<string>((done) => (resolve = done));
  return { promise, resolve };
}

describe("PDF job gate", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("runs one job at a time and starts the next queued job when the first settles", async () => {
    const runPdfJob = createPdfJobGate({ maxRunning: 1, maxWaiting: 2, maxWaitMs: 15_000, timeoutMs: 45_000 });
    const first = createDeferred();
    const started: string[] = [];

    const firstResult = runPdfJob(async () => {
      started.push("first");
      return first.promise;
    });
    const secondResult = runPdfJob(async () => {
      started.push("second");
      return "second done";
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(started).toEqual(["first"]);

    first.resolve("first done");
    await expect(firstResult).resolves.toBe("first done");
    await expect(secondResult).resolves.toBe("second done");
    expect(started).toEqual(["first", "second"]);
  });

  it("refuses a job with a Ukrainian message when the queue is full", async () => {
    const runPdfJob = createPdfJobGate({ maxRunning: 1, maxWaiting: 1, maxWaitMs: 15_000, timeoutMs: 45_000 });
    const blocker = createDeferred();
    const running = runPdfJob(() => blocker.promise);
    const queued = runPdfJob(async () => "queued");

    const refused = runPdfJob(async () => "refused");
    await expect(refused).rejects.toBeInstanceOf(PdfBusyError);
    await refused.catch((error) => expect(findPdfJobErrorMessage(error)).toMatch(/Спробуйте ще раз/));

    blocker.resolve("done");
    await expect(running).resolves.toBe("done");
    await expect(queued).resolves.toBe("queued");
  });

  it("rejects a slow job at the deadline, aborts its signal and keeps the slot until the job really ends", async () => {
    const runPdfJob = createPdfJobGate({ maxRunning: 1, maxWaiting: 1, maxWaitMs: 1_000, timeoutMs: 1_000 });
    const slow = createDeferred();
    let signal: AbortSignal | undefined;
    const slowResult = runPdfJob((jobSignal) => {
      signal = jobSignal;
      return slow.promise;
    });
    const timeoutCheck = expect(slowResult).rejects.toBeInstanceOf(PdfTimeoutError);

    await vi.advanceTimersByTimeAsync(1_000);
    await timeoutCheck;
    expect(signal?.aborted).toBe(true);

    const started: string[] = [];
    const next = runPdfJob(async () => {
      started.push("next");
      return "next done";
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(started).toEqual([]);

    slow.resolve("late");
    await expect(next).resolves.toBe("next done");
  });

  it("drops a queued job that timed out before its turn, freeing its queue place", async () => {
    const runPdfJob = createPdfJobGate({ maxRunning: 1, maxWaiting: 1, maxWaitMs: 5_000, timeoutMs: 1_000 });
    const blocker = createDeferred();
    const neverStarted = vi.fn(async () => "never");
    const running = runPdfJob(() => blocker.promise);
    const expired = runPdfJob(neverStarted);
    const expiredCheck = expect(expired).rejects.toBeInstanceOf(PdfTimeoutError);
    const runningCheck = expect(running).rejects.toBeInstanceOf(PdfTimeoutError);

    await vi.advanceTimersByTimeAsync(1_000);
    await expiredCheck;
    await runningCheck;

    const following = runPdfJob(async () => "following");
    blocker.resolve("late");
    await expect(following).resolves.toBe("following");
    expect(neverStarted).not.toHaveBeenCalled();
  });

  it("refuses a queued job as busy when it cannot start in time, long before the overall deadline", async () => {
    const runPdfJob = createPdfJobGate({ maxRunning: 1, maxWaiting: 1, maxWaitMs: 15_000, timeoutMs: 45_000 });
    const blocker = createDeferred();
    const neverStarted = vi.fn(async () => "never");
    const running = runPdfJob(() => blocker.promise);
    const queued = runPdfJob(neverStarted);
    const queuedCheck = expect(queued).rejects.toBeInstanceOf(PdfBusyError);

    await vi.advanceTimersByTimeAsync(15_000);
    await queuedCheck;

    blocker.resolve("done");
    await expect(running).resolves.toBe("done");
    expect(neverStarted).not.toHaveBeenCalled();
  });

  it("lets a started job run past the queue limit until the overall deadline", async () => {
    const runPdfJob = createPdfJobGate({ maxRunning: 1, maxWaiting: 1, maxWaitMs: 15_000, timeoutMs: 45_000 });
    const slow = createDeferred();
    const result = runPdfJob(() => slow.promise);

    await vi.advanceTimersByTimeAsync(30_000);
    slow.resolve("done");
    await expect(result).resolves.toBe("done");
  });

  it("keeps character and catalog prints in separate queues", async () => {
    const { runCatalogPdfJob, runCharacterPdfJob } = await import("@/server/pdf/pdfJobGate");
    const catalogBlockers = [createDeferred(), createDeferred(), createDeferred()];
    const catalogJobs = catalogBlockers.map((blocker) => runCatalogPdfJob(() => blocker.promise));
    await expect(runCatalogPdfJob(async () => "one too many")).rejects.toBeInstanceOf(PdfBusyError);

    await expect(runCharacterPdfJob(async () => "character")).resolves.toBe("character");

    catalogBlockers.forEach((blocker) => blocker.resolve("catalog"));
    await expect(Promise.all(catalogJobs)).resolves.toEqual(["catalog", "catalog", "catalog"]);
  });

  it("frees the slot when a job throws synchronously", async () => {
    const runPdfJob = createPdfJobGate({ maxRunning: 1, maxWaiting: 1, maxWaitMs: 15_000, timeoutMs: 45_000 });
    await expect(
      runPdfJob(() => {
        throw new Error("broken template");
      }),
    ).rejects.toThrow("broken template");
    await expect(runPdfJob(async () => "after")).resolves.toBe("after");
  });

  it("does not translate unrelated errors", () => {
    expect(findPdfJobErrorMessage(new Error("Not found"))).toBeNull();
  });
});
