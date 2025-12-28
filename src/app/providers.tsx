"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import GoogleOneTap from "@/lib/components/auth/GoogleOneTap";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <GoogleOneTap />
      {children}
      <Toaster position="top-right" richColors closeButton />
    </SessionProvider>
  );
}
