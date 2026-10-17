export class PdfBusyError extends Error {
  constructor() {
    super("Сервер зараз збирає інші PDF. Спробуйте ще раз за хвилину.");
  }
}

export class PdfTimeoutError extends Error {
  constructor() {
    super("PDF збирався надто довго. Спробуйте ще раз або оберіть менше розділів.");
  }
}

export type PdfJob<T> = (signal: AbortSignal) => Promise<T>;
export type PdfJobGateLimits = { maxRunning: number; maxWaiting: number; timeoutMs: number };

/// Тайм-аут рахується від постановки в чергу. Слот звільняється лише коли робота справді скінчилася:
/// синхронний підрахунок таймер не перерве, тож робота лише отримує сигнал і зупиняється між кроками.
export function createPdfJobGate(limits: PdfJobGateLimits) {
  let running = 0;
  const waiting: Array<() => void> = [];

  function releaseSlot() {
    const next = waiting.shift();
    if (next) next();
    else running -= 1;
  }

  function waitForSlot(): { ready: Promise<void>; cancel: () => void } {
    if (running < limits.maxRunning) {
      running += 1;
      return { ready: Promise.resolve(), cancel: () => {} };
    }
    let start = () => {};
    const ready = new Promise<void>((resolve) => (start = resolve));
    waiting.push(start);
    return {
      ready,
      cancel: () => {
        const index = waiting.indexOf(start);
        if (index >= 0) waiting.splice(index, 1);
      },
    };
  }

  return async function runPdfJob<T>(job: PdfJob<T>): Promise<T> {
    if (running >= limits.maxRunning && waiting.length >= limits.maxWaiting) throw new PdfBusyError();
    const controller = new AbortController();
    const slot = waitForSlot();
    const work = slot.ready.then(async () => {
      try {
        controller.signal.throwIfAborted();
        return await job(controller.signal);
      } finally {
        releaseSlot();
      }
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        slot.cancel();
        controller.abort(new PdfTimeoutError());
        reject(new PdfTimeoutError());
      }, limits.timeoutMs);
    });
    work.catch(() => {});
    try {
      return await Promise.race([work, deadline]);
    } finally {
      clearTimeout(timer);
    }
  };
}

export const runPdfJob = createPdfJobGate({ maxRunning: 1, maxWaiting: 3, timeoutMs: 60_000 });

export function findPdfJobErrorMessage(error: unknown): string | null {
  return error instanceof PdfBusyError || error instanceof PdfTimeoutError ? error.message : null;
}
