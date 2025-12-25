"use client";

import { signIn, useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";

type GsiInitConfig = {
  client_id: string;
  callback: (response: { credential?: string }) => void;
  context?: "signin" | "signup" | "use";
  ux_mode?: "popup" | "redirect";
  auto_select?: boolean;
  use_fedcm_for_prompt?: boolean;
  cancel_on_tap_outside?: boolean;
  itp_support?: boolean;
};

interface GsiPromptNotification {
  isNotDisplayed: () => boolean;
  getNotDisplayedReason: () => string;
  isSkippedMoment: () => boolean;
  getSkippedReason: () => string;
  isDismissedMoment: () => boolean;
  getDismissedReason: () => string;
}

interface GsiId {
  initialize: (config: GsiInitConfig) => void;
  prompt: (cb?: (n: GsiPromptNotification) => void) => void;
  cancel: () => void;
  disableAutoSelect: () => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GsiId } };
    __gsiInit?: boolean;
    __gsiInFlight: boolean;
  }
}

export default function GoogleOneTap() {
  const { data: session, status } = useSession();
  const [ ready, setReady ] = useState(false);
  const initialized = useRef(false);

  const handleCredentialResponse = useCallback(async (response: { credential?: string }) => {
    const idToken = response?.credential;
    if (!idToken) {
      console.error("No credential received");
      return;
    }

    try {
      const result = await signIn("google-onetap", {
        id_token: idToken,
        redirect: false,
      });

      if (result?.error) {
        console.error("Sing in error", result.error);
      }

    } catch (error) {
      console.error("Sing in failed", error);
    }
  }, []);

  const init = useCallback(() => {
    if (!window.google || session || status === 'loading') return;
    if (initialized.current || window.__gsiInit || window.__gsiInFlight) return;

    try {
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        callback: handleCredentialResponse,
        context: "signin",
        ux_mode: "popup",
        auto_select: false,
        use_fedcm_for_prompt: true,
        cancel_on_tap_outside: true,
        itp_support: true,
      });
      initialized.current = true;
      window.__gsiInit = true;
      window.__gsiInFlight = true;

      window.google.accounts.id.prompt(() => {
        window.__gsiInFlight = false;
      });
    } catch {
      initialized.current = false;
      window.__gsiInit = false
      setTimeout(init, 800);
    }
  }, [session, status, handleCredentialResponse]);

  useEffect(() => {
    if (ready && !session && status !== 'loading') init();
  }, [ready, init, session, status])

  useEffect(() => {
    if (session && window.google) {
      window.google.accounts.id.cancel();
      window.google.accounts.id.disableAutoSelect();
      initialized.current = false;
      window.__gsiInit = false;
      window.__gsiInFlight = false;
    }
  }, [session]);

  useEffect(() => {
    return () => {
      if (window.google) {
        window.google.accounts.id.cancel();
      }
    }
  }, [])

  return (
    <Script
      src="https://accounts.google.com/gsi/client"
      async
      defer
      strategy="afterInteractive"
      onLoad={ () => setReady(true) }
      onError={(e) => {
        console.error("Failed to load Google GSI script:", e)
      }}
    />
  );
}