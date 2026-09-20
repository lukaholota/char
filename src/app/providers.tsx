"use client";

import React, { useState } from "react";
import { SessionProvider } from "next-auth/react";
import GoogleOneTap from "@/lib/components/auth/GoogleOneTap";
import { Toaster } from "@/components/ui/sonner";
import { PostHogProvider } from "@/lib/monitoring/posthog-provider";
import { SentryUserSync } from "@/lib/monitoring/sentry-user-sync";
import { NoAiModeProvider } from "@/components/no-ai/NoAiModeProvider";
import { WhatsNewAnnouncement } from "@/lib/components/whatsNew/WhatsNewAnnouncement";

export function Providers({ children }: { children: React.ReactNode }) {
  /// null — «що нового» ще не вирішило, показуватись йому чи ні; доти підказку Google не чіпаємо.
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState<boolean | null>(null);

  return (
    <SessionProvider>
      <NoAiModeProvider>
        <GoogleOneTap suppressed={isWhatsNewOpen !== false} />
        <PostHogProvider />
        <SentryUserSync />
        {children}
        <WhatsNewAnnouncement onResolved={setIsWhatsNewOpen} />
        <Toaster position="top-right" richColors closeButton />
      </NoAiModeProvider>
    </SessionProvider>
  );
}
