"use client";

import { toast } from "sonner";
import { create } from "zustand";
import { useGameSessionLiveStore } from "@/lib/components/game/game-session-live-store";

type Failure = { ok: false; error: string };
type Override = { value: unknown; settledAt: number | null };

const NETWORK_ERROR = "Не вдалося зберегти. Перевірте звʼязок і спробуйте ще раз.";

/// Спільне для всієї кімнати: позначки під токеном, діалог і повноекранна мапа показують те саме,
/// а запит не губиться, коли діалог закрили до відповіді.
const useOverrides = create<Record<string, Override>>(() => ({}));
const versions = new Map<string, number>();

/// Стан кімнати, який сервер почав читати до збереження, приходить і після відповіді: без запасу токен блимав би на старому місці.
const SETTLED_GRACE_MS = 3000;

function dropOverride(key: string) {
  useOverrides.setState((overrides) => {
    const { [key]: _dropped, ...rest } = overrides;
    return rest;
  }, true);
}

/// Після відповіді показане тримається до першого вигляду кімнати з сервера, що прийшов уже після запасу, — він точно правда.
function dropSettledOverrides() {
  const now = Date.now();
  const isKept = (override: Override) => override.settledAt === null || now - override.settledAt < SETTLED_GRACE_MS;
  const overrides = useOverrides.getState();
  if (Object.values(overrides).every(isKept)) return;
  useOverrides.setState(Object.fromEntries(Object.entries(overrides).filter(([, override]) => isKept(override))), true);
}

useGameSessionLiveStore.subscribe((state, previous) => {
  if (state.view !== previous.view) dropSettledOverrides();
});

export function readOptimistic<T>(key: string, server: T): T {
  const override = useOverrides.getState()[key];
  return override ? (override.value as T) : server;
}

export function useOptimistic<T>(key: string, server: T): T {
  const override = useOverrides((overrides) => overrides[key]);
  return override ? (override.value as T) : server;
}

/// Для списків токенів: одна підписка на всі ключі.
export function useOptimisticReader() {
  const overrides = useOverrides();
  return <T>(key: string, server: T): T => (overrides[key] ? (overrides[key].value as T) : server);
}

/// Показати без запиту — наприклад, токен під стрілками, поки клавішу не відпустили.
export function showOptimistic(key: string, value: unknown): number {
  const version = (versions.get(key) ?? 0) + 1;
  versions.set(key, version);
  useOverrides.setState({ [key]: { value, settledAt: null } });
  return version;
}

/// Кожен тап видно одразу; показане змінює лише відповідь на останній тап цього ключа.
/// Помилку показуємо завжди, але відкочуємо лише тоді, коли новіших тапів немає.
export async function sendOptimistic<R extends { ok: true } | Failure>(key: string, value: unknown, send: () => Promise<R>): Promise<R | Failure> {
  const version = showOptimistic(key, value);
  const result: R | Failure = await send().catch((): Failure => ({ ok: false, error: NETWORK_ERROR }));
  if (!result.ok) toast.error((result as Failure).error);
  if (versions.get(key) !== version) return result;
  if (result.ok) useOverrides.setState({ [key]: { value, settledAt: Date.now() } });
  else dropOverride(key);
  return result;
}

export function resetOptimisticValues() {
  versions.clear();
  useOverrides.setState({}, true);
}
