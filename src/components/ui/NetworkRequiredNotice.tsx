"use client";

import { CloudOff } from "lucide-react";

import { useIsOnline } from "@/hooks/useIsOnline";

export function NetworkRequiredNotice({ action }: { action: string }) {
  const isOnline = useIsOnline();
  if (isOnline) return null;

  return (
    <div
      role="alert"
      className="mx-auto mb-4 flex max-w-3xl items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
    >
      <CloudOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
      <span>
        Немає мережі. {action} потребує звʼязку з сервером — на відміну від правок у листі
        персонажа, які зберігаються офлайн і поїдуть на сервер самі.
      </span>
    </div>
  );
}
