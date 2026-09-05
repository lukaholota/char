"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import posthog from "posthog-js";

import { sharedPostHogOptions } from "@/lib/monitoring/posthog-options";

// Поза продом PostHog вимкнений — той самий запобіжник, що в Sentry
// (src/lib/monitoring/sentry-options.ts): події з `bun dev` ще не бачив жоден користувач,
// вони зʼїдали б безкоштовну квоту і змішувалися б у панелі зі справжніми.
const isEnabled = process.env.NODE_ENV === "production";

function initPostHog() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!key || !host) return;

  posthog.init(key, {
    api_host: host,
    ...sharedPostHogOptions,
  });
}

// identify() привʼязує подальші події до вже наявного userId, а не до нового ідентифікатора —
// саме це замінює тут потребу в постійному анонімному cookie. reset() на виході повертає
// PostHog до анонімного стану, щоб події наступного відвідувача на тому ж пристрої (спільний
// компʼютер, той самий браузер) не приписались попередньому акаунту.
export function PostHogProvider() {
  const { data: session, status } = useSession();
  const didInit = useRef(false);

  useEffect(() => {
    if (!isEnabled || didInit.current) return;
    didInit.current = true;
    initPostHog();
  }, []);

  useEffect(() => {
    if (!isEnabled || !didInit.current) return;
    if (status === "authenticated" && session?.user?.id) {
      posthog.identify(session.user.id);
    } else if (status === "unauthenticated") {
      posthog.reset();
    }
  }, [status, session?.user?.id]);

  return null;
}
