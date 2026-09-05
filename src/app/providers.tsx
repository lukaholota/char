"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import GoogleOneTap from "@/lib/components/auth/GoogleOneTap";
import { Toaster } from "@/components/ui/sonner";
import { PostHogProvider } from "@/lib/monitoring/posthog-provider";
import { SentryUserSync } from "@/lib/monitoring/sentry-user-sync";
import { NoAiModeProvider } from "@/components/no-ai/NoAiModeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NoAiModeProvider>
        <GoogleOneTap />
        <PostHogProvider />
        <SentryUserSync />
        {children}
        <Toaster position="top-right" richColors closeButton />
      </NoAiModeProvider>
    </SessionProvider>
  );
}
