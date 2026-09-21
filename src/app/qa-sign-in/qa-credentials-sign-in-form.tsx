"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function QaCredentialsSignInForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const result = await signIn("qa-credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });

    setIsSubmitting(false);
    if (!result || result.error) {
      setError("Не вдалося увійти. Перевірте дані й спробуйте ще раз.");
      return;
    }

    router.replace("/char");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-white">
      <form
        className="w-full max-w-sm space-y-5 rounded-xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl"
        onSubmit={handleSubmit}
      >
        <div>
          <h1 className="text-xl font-semibold">QA-вхід</h1>
          <p className="mt-1 text-sm text-slate-400">Лише для автоматизованої перевірки сайту.</p>
        </div>

        <label className="block space-y-1.5 text-sm">
          <span>Електронна пошта</span>
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-indigo-500 focus:ring-2"
          />
        </label>

        <label className="block space-y-1.5 text-sm">
          <span>Пароль</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-indigo-500 focus:ring-2"
          />
        </label>

        {error && <p className="text-sm text-red-300">{error}</p>}

        <Button className="w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Вхід…" : "Увійти"}
        </Button>
      </form>
    </main>
  );
}
