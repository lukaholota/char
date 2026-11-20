"use client";

import { useId, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/lib/components/auth/PasswordInput";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-rules";
import { rememberSignInAttempt } from "@/lib/auth/sign-in-notice";
import type { PasswordSignInErrorCode } from "@/lib/auth/password-sign-in";
import { captureAuthCompleted, captureAuthFailed, captureAuthStarted } from "@/lib/monitoring/funnel-analytics";

type Mode = "sign_in" | "register";

const PASSWORD_LENGTH_HINT = `Пароль — щонайменше ${PASSWORD_MIN_LENGTH} символів.`;

const ERROR_MESSAGES: Record<PasswordSignInErrorCode, string> = {
  email_taken: "Ця пошта вже має акаунт. Введіть свій пароль або увійдіть через Google.",
  wrong_credentials: "Пошта або пароль не підходять. Якщо раніше ви входили через Google, увійдіть через Google — пароль можна додати в меню «Пароль для входу».",
  invalid_input: `Перевірте пошту. ${PASSWORD_LENGTH_HINT}`,
};

const isErrorCode = (code: string | undefined): code is PasswordSignInErrorCode => code !== undefined && code in ERROR_MESSAGES;

type Props = { callbackUrl: string; autoFocus?: boolean; onModeChange?: (isRegister: boolean) => void };

export function PasswordSignInForm({ callbackUrl, autoFocus = false, onModeChange }: Props) {
  const [mode, setMode] = useState<Mode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const fieldId = useId();
  const isRegister = mode === "register";

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    onModeChange?.(nextMode === "register");
    setError(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.length < PASSWORD_MIN_LENGTH) return setError(PASSWORD_LENGTH_HINT);
    setSubmitting(true);
    setError(null);
    captureAuthStarted("password");
    try {
      const result = await signIn("password", { mode, email, password, redirect: false });
      if (result?.error) {
        const code = isErrorCode(result.code) ? result.code : "wrong_credentials";
        captureAuthFailed("password", code === "email_taken" ? "email_taken" : "wrong_credentials");
        if (code === "email_taken") switchMode("sign_in");
        setError(ERROR_MESSAGES[code]);
        return;
      }
      captureAuthCompleted("password");
      rememberSignInAttempt();
      window.location.assign(callbackUrl);
    } catch {
      captureAuthFailed("password", "network");
      setError("Немає зʼєднання. Спробуйте ще раз.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor={`${fieldId}-email`} className="text-sm text-slate-300">Пошта</label>
        <Input
          id={`${fieldId}-email`}
          type="email"
          inputMode="email"
          autoComplete="username"
          autoFocus={autoFocus}
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-11 border-slate-700 bg-slate-900/70 text-white"
          data-ph-mask
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${fieldId}-password`} className="text-sm text-slate-300">Пароль</label>
        <PasswordInput
          id={`${fieldId}-password`}
          autoComplete={isRegister ? "new-password" : "current-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-describedby={isRegister ? `${fieldId}-password-hint` : undefined}
        />
        {isRegister ? (
          <p id={`${fieldId}-password-hint`} className="text-xs text-slate-400">
            Щонайменше {PASSWORD_MIN_LENGTH} символів. Скинути забутий пароль поки не можна — збережіть його.
          </p>
        ) : null}
      </div>
      {error ? <p role="alert" className="text-sm text-rose-300">{error}</p> : null}
      <Button type="submit" disabled={isSubmitting} className="h-11 w-full">
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {isRegister ? "Створити акаунт" : "Увійти"}
      </Button>
      <p className="text-center text-sm text-slate-400">
        {isRegister ? "Вже маєте акаунт?" : "Ще немає акаунта?"}{" "}
        <button type="button" onClick={() => switchMode(isRegister ? "sign_in" : "register")} className="min-h-10 font-medium text-white underline underline-offset-4">
          {isRegister ? "Увійти" : "Створити"}
        </button>
      </p>
    </form>
  );
}
