"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

import { loadPostHog } from "@/lib/monitoring/posthog-client";
import { runWhenIdle } from "@/lib/run-when-idle";

const LOAD_TIMEOUT_MS = 5000;

// identify() привʼязує подальші події до вже наявного userId, а не до нового ідентифікатора —
// саме це замінює тут потребу в постійному анонімному cookie. reset() на виході повертає
// PostHog до анонімного стану, щоб події наступного відвідувача на тому ж пристрої (спільний
// компʼютер, той самий браузер) не приписались попередньому акаунту.
export function PostHogProvider() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;

  useEffect(() => runWhenIdle(() => void loadPostHog(), LOAD_TIMEOUT_MS), []);

  useEffect(() => {
    if (status === "authenticated" && userId) return runWhenIdle(() => void identifyPostHogUser(userId), LOAD_TIMEOUT_MS);
    if (status === "unauthenticated") return runWhenIdle(() => void forgetPostHogUser(), LOAD_TIMEOUT_MS);
  }, [status, userId]);

  return null;
}

async function identifyPostHogUser(userId: string): Promise<void> {
  (await loadPostHog())?.identify(userId);
}

async function forgetPostHogUser(): Promise<void> {
  (await loadPostHog())?.reset();
}
