"use client";

import { RefreshCw } from "lucide-react";
import { useStandaloneMode } from "@/lib/pwa/standalone-navigation";
import { requestAppRestart } from "@/lib/pwa/app-updates";

export function ReloadAppEntry({ onActivate, className }: { onActivate: () => void; className: string }) {
  const standalone = useStandaloneMode();
  if (!standalone) return null;

  return <button type="button" className={`${className} min-h-10`} onClick={() => {
    onActivate();
    requestAppRestart();
  }}>
    <RefreshCw aria-hidden className="h-4 w-4" />
    Оновити застосунок
  </button>;
}
