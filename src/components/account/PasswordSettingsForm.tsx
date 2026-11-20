"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { changeOwnPassword } from "@/app/account/password/actions";
import { Button } from "@/components/ui/button";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-rules";
import { PasswordInput } from "@/lib/components/auth/PasswordInput";

const FAILURE_MESSAGES = {
  invalid_input: `Новий пароль — щонайменше ${PASSWORD_MIN_LENGTH} символів.`,
  wrong_password: "Поточний пароль не підходить.",
  not_verified: "Пароль можна задати, коли пошту підтвердить Google. Увійдіть через Google з цією поштою.",
  changed_elsewhere: "Пароль щойно змінили з іншого пристрою. Оновіть сторінку й спробуйте ще раз.",
  signed_out: "Ви вийшли з акаунта. Увійдіть і спробуйте ще раз.",
};

export function PasswordSettingsForm({ email, hasPassword }: { email: string; hasPassword: boolean }) {
  const router = useRouter();
  const fieldId = useId();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setSaved] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword.length < PASSWORD_MIN_LENGTH) return setError(FAILURE_MESSAGES.invalid_input);
    setSubmitting(true);
    setError(null);
    try {
      const failure = await changeOwnPassword({ currentPassword: hasPassword ? currentPassword : undefined, newPassword });
      if (failure) return setError(FAILURE_MESSAGES[failure]);
      setSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      router.refresh();
    } catch {
      setError("Немає зʼєднання. Спробуйте ще раз.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <input type="email" autoComplete="username" value={email} readOnly hidden />
      {hasPassword ? (
        <div className="space-y-1.5">
          <label htmlFor={`${fieldId}-current`} className="text-sm text-slate-300">Поточний пароль</label>
          <PasswordInput id={`${fieldId}-current`} autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
        </div>
      ) : null}
      <div className="space-y-1.5">
        <label htmlFor={`${fieldId}-new`} className="text-sm text-slate-300">{hasPassword ? "Новий пароль" : "Пароль"}</label>
        <PasswordInput id={`${fieldId}-new`} autoComplete="new-password" value={newPassword} onChange={(event) => { setNewPassword(event.target.value); setSaved(false); }} aria-describedby={`${fieldId}-hint`} />
        <p id={`${fieldId}-hint`} className="text-xs text-slate-400">Щонайменше {PASSWORD_MIN_LENGTH} символів. Скинути забутий пароль поки не можна — але вхід через Google лишається.</p>
      </div>
      {error ? <p role="alert" className="text-sm text-rose-300">{error}</p> : null}
      {isSaved ? (
        <p role="status" className="text-sm text-emerald-300">
          Пароль збережено. Тепер можна входити поштою <span data-ph-mask>{email}</span> і цим паролем.
        </p>
      ) : null}
      <Button type="submit" disabled={isSubmitting} className="h-11 w-full">
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {hasPassword ? "Змінити пароль" : "Задати пароль"}
      </Button>
    </form>
  );
}
