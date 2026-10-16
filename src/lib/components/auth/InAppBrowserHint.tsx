"use client";

import { useEffect } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInAppBrowser } from "@/lib/components/auth/use-in-app-browser";
import { captureInAppWarningShown } from "@/lib/monitoring/in-app-browser-events";

export function InAppBrowserHint({ onOpenAuth }: { onOpenAuth: () => void }) {
  const inAppBrowser = useInAppBrowser();
  const isVisible = Boolean(inAppBrowser?.isEmbedded && inAppBrowser.variant !== "control");
  const variant = inAppBrowser?.variant;

  useEffect(() => {
    if (isVisible && variant) captureInAppWarningShown("creator", variant);
  }, [isVisible, variant]);

  if (!isVisible) return null;
  return (
    <div role="note" className="mt-3 flex flex-col gap-1 border-t border-white/10 pt-3 text-sm text-slate-300 sm:flex-row sm:items-center sm:gap-2">
      <p className="flex items-start gap-2">
        <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <span>Схоже, це вбудований браузер застосунку. Щоб зберегти персонажа, може знадобитися звичайний браузер.</span>
      </p>
      <Button type="button" variant="link" className="min-h-10 self-start pl-6 pr-2 text-arcane-200 sm:self-auto sm:pl-2" onClick={onOpenAuth}>
        Як увійти
      </Button>
    </div>
  );
}
