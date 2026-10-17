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
export type PdfJobGateLimits = { maxRunning: number; maxWaiting: number; maxWaitMs: number; timeoutMs: number };

/// Обидва строки рахуються від постановки в чергу: хто не почався за maxWaitMs — «зайнято», хто не скінчився за timeoutMs —
/// «надто довго». Слот звільняється лише коли робота справді скінчилася: синхронний підрахунок таймер не перерве,
/// тож робота лише отримує сигнал і зупиняється між кроками.
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
    let hasStarted = false;
    const work = slot.ready.then(async () => {
      hasStarted = true;
      try {
        controller.signal.throwIfAborted();
        return await job(controller.signal);
      } finally {
        releaseSlot();
      }
    });
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    const stop = (error: Error) => {
      slot.cancel();
      controller.abort(error);
      return error;
    };
    const deadline = new Promise<never>((_, reject) => {
      timers.push(setTimeout(() => {
        if (!hasStarted) reject(stop(new PdfBusyError()));
      }, limits.maxWaitMs));
      timers.push(setTimeout(() => reject(stop(new PdfTimeoutError())), limits.timeoutMs));
    });
    work.catch(() => {});
    try {
      return await Promise.race([work, deadline]);
    } finally {
      timers.forEach(clearTimeout);
    }
  };
}

/// nginx обриває мовчазний запит через 60 с, тож відмова мусить піти раніше, інакше гравець її не побачить.
const PDF_DEADLINES = { maxWaitMs: 15_000, timeoutMs: 45_000 };

export const runCharacterPdfJob = createPdfJobGate({ maxRunning: 2, maxWaiting: 4, ...PDF_DEADLINES });
/// Каталоги друкуються без входу, тож мають власне місце й не займають чергу листів персонажів.
export const runCatalogPdfJob = createPdfJobGate({ maxRunning: 1, maxWaiting: 2, ...PDF_DEADLINES });

export function findPdfJobErrorMessage(error: unknown): string | null {
  return error instanceof PdfBusyError || error instanceof PdfTimeoutError ? error.message : null;
}
