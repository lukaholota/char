import { toast } from "sonner";

const NEXT_ACTION_HEADER = "next-action";
const TOAST_ID = "offline-action";

export const OFFLINE_ACTION_MESSAGE =
  "Немає мережі — ця дія потребує звʼязку з сервером. Хіти, комірки, ресурси рис, заряди, підготовка, відпочинок і нотатки працюють офлайн і поїдуть самі.";

/// Серверна дія — це POST із заголовком `next-action`, який Next шле глобальним `fetch`. Без
/// мережі він падає «Failed to fetch» усередині `startTransition`, а React 19 несе такий виняток
/// у найближчий error boundary — тобто один клік по «Відпочинку» без мережі стирав увесь лист.
/// Один перехоплювач замість шлагбаума на кожній із ~40 кнопок: дія не йде, користувач бачить
/// пояснення, а error boundary впізнає цю помилку й повертає сторінку.
export class OfflineActionError extends Error {
  readonly isOfflineActionError = true;

  constructor(message = OFFLINE_ACTION_MESSAGE) {
    super(message);
    this.name = "OfflineActionError";
  }
}

export function isOfflineActionError(error: unknown): error is OfflineActionError {
  return Boolean(error && typeof error === "object" && (error as OfflineActionError).isOfflineActionError === true);
}

let installed = false;

export function installOfflineActionGuard(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    if (!isServerActionRequest(input, init)) return originalFetch(input, init);
    if (!navigator.onLine) throw refuseOfflineAction();

    try {
      return await originalFetch(input, init);
    } catch (error) {
      if (navigator.onLine && !(error instanceof TypeError)) throw error;
      throw refuseOfflineAction("Звʼязок обірвався — дія не виконана. Спробуйте ще раз, коли мережа повернеться.");
    }
  };

  window.addEventListener("unhandledrejection", (event) => {
    if (isOfflineActionError(event.reason)) event.preventDefault();
  });
}

function refuseOfflineAction(message?: string): OfflineActionError {
  const error = new OfflineActionError(message);
  toast.error(error.message, { id: TOAST_ID });
  return error;
}

export function isServerActionRequest(input: RequestInfo | URL, init?: RequestInit): boolean {
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  if (method !== "POST") return false;
  return readHeader(init?.headers, NEXT_ACTION_HEADER) !== null || (input instanceof Request && input.headers.has(NEXT_ACTION_HEADER));
}

function readHeader(headers: HeadersInit | undefined, name: string): string | null {
  if (!headers) return null;
  if (headers instanceof Headers) return headers.get(name);
  if (Array.isArray(headers)) return headers.find(([key]) => key.toLowerCase() === name)?.[1] ?? null;
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name);
  return entry ? String(entry[1]) : null;
}
