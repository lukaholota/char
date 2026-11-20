"use client";

import SignInDialog from "@/lib/components/auth/SignInDialog";

export function HomebrewSignInPrompt() {
  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-5 text-center">
      <p className="text-sm text-slate-300">Щоб публікувати хоумбрю, голосувати й коментувати, увійдіть в акаунт.</p>
      <SignInDialog analyticsTrigger="homebrew" />
    </div>
  );
}
