"use client";

import SignInDialog from "@/lib/components/auth/SignInDialog";

export function GameSignInPrompt({ text }: { text: string }) {
  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-5 text-center">
      <p className="text-sm text-slate-300">{text}</p>
      <SignInDialog analyticsTrigger="game" />
    </div>
  );
}
