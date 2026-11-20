import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { HomebrewPageShell } from "@/components/homebrew/HomebrewPageShell";
import { PasswordSettingsForm } from "@/components/account/PasswordSettingsForm";
import SignInDialog from "@/lib/components/auth/SignInDialog";
import { findPasswordAccount } from "@/server/db/auth";

export const metadata: Metadata = { title: "Пароль для входу — ДнД українською", robots: { index: false } };

const NOTE = "rounded-2xl border border-white/10 bg-slate-900/60 p-5 text-sm leading-relaxed text-slate-300";

export default async function PasswordSettingsPage() {
  const userId = Number((await auth())?.user?.id);
  const account = Number.isInteger(userId) && userId > 0 ? await findPasswordAccount(userId) : null;
  return (
    <HomebrewPageShell title="Пароль для входу" backHref="/" backLabel="Головна">
      {!account?.email ? (
        <div className={`${NOTE} space-y-3 text-center`}>
          <p>Щоб задати пароль, увійдіть в акаунт.</p>
          <SignInDialog />
        </div>
      ) : !account.isEmailVerified ? (
        <p className={NOTE}>
          Пароль цього акаунта змінити поки не можна: пошту <span data-ph-mask>{account.email}</span> ще не підтвердив Google. Увійдіть через Google з цією
          поштою — і тут можна буде задати новий пароль.
        </p>
      ) : (
        <section className="space-y-4">
          <p className="text-sm leading-relaxed text-slate-300">
            {account.passwordHash ? "Ви входите поштою й паролем або через Google. Тут можна змінити пароль." : "Задайте пароль, щоб входити без Google — наприклад, з чужого пристрою чи з браузера всередині Instagram або Threads."}{" "}
            Пошта для входу: <span className="text-slate-100" data-ph-mask>{account.email}</span>.
          </p>
          <PasswordSettingsForm email={account.email} hasPassword={account.passwordHash !== null} />
        </section>
      )}
    </HomebrewPageShell>
  );
}
