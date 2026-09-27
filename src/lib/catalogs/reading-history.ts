import { goBackInHistory, readHistoryStateWithoutNextRouter, replaceUrlKeepingHistoryState } from "@/lib/history-back";

/// Відкрита гілка (підклас, підраса) — окремий запис історії, щоб «Назад» повертав до батька.
/// Токен модалки класу копіюється в запис, інакше вона вирішила б, що «Назад» закрив її саму.
/// Ключі Next — ні: їх Next дописує сам і лише тоді бачить нову адресу.
const BRANCH_ENTRY_KEY = "__catalogBranchEntry";

export function pushBranchEntry(params: URLSearchParams): void {
  window.history.pushState({ ...readHistoryStateWithoutNextRouter(), [BRANCH_ENTRY_KEY]: true }, "", buildUrl(params));
}

export function isOnBranchEntry(): boolean {
  return Boolean((window.history.state as Record<string, unknown> | null)?.[BRANCH_ENTRY_KEY]);
}

/// Гілка, відкрита кліком, знімається своїм записом; відкрита з адреси (пошук, посилання)
/// запису не має — тоді лише переписуємо адресу, щоб не вийти зі сторінки.
export function leaveBranch(paramsWithoutBranch: URLSearchParams): "history" | "replaced" {
  if (isOnBranchEntry()) {
    goBackInHistory();
    return "history";
  }
  replaceUrlKeepingHistoryState(buildUrl(paramsWithoutBranch));
  return "replaced";
}

function buildUrl(params: URLSearchParams): string {
  const search = params.toString();
  return `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
}
