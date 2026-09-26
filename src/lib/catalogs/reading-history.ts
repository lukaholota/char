import { goBackInHistory } from "@/lib/history-back";

/// Відкрита гілка (підклас, підраса) — окремий запис історії, щоб «Назад» повертав до батька.
/// Стан Next і токен модалки класу копіюються в запис: без першого Next перемальовує сторінку,
/// без другого модалка класу вирішила б, що «Назад» закрив її саму.
const BRANCH_ENTRY_KEY = "__catalogBranchEntry";

export function pushBranchEntry(params: URLSearchParams): void {
  const state = (window.history.state as Record<string, unknown> | null) ?? {};
  window.history.pushState({ ...state, [BRANCH_ENTRY_KEY]: true }, "", buildUrl(params));
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
  window.history.replaceState(window.history.state, "", buildUrl(paramsWithoutBranch));
  return "replaced";
}

function buildUrl(params: URLSearchParams): string {
  const search = params.toString();
  return `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
}
