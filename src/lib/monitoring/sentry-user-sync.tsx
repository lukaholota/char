"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import * as Sentry from "@sentry/nextjs";

// setUser() привʼязує лише вже наявний userId — без email, IP чи інших PII, той самий принцип,
// що в PostHogProvider.identify() (src/lib/monitoring/posthog-provider.tsx). Без цього виклику
// Sentry ніколи не дізнається, хто зіткнувся з помилкою, і userCount на кожному issue лишається
// 0 (D-002, docs/o21-user-signals/defects.md).
export function SentryUserSync() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      Sentry.setUser({ id: session.user.id });
    } else if (status === "unauthenticated") {
      Sentry.setUser(null);
    }
  }, [status, session?.user?.id]);

  return null;
}
