"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Download, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { capturePostHogEvent } from "@/lib/monitoring/posthog-client";
import { requestAppInstall, useInstallPath } from "@/lib/pwa/install-prompt";
import type { InstallPath } from "@/lib/pwa/install-platform";
import { dismissInstallBanner, recordInstallBannerVisit, shouldOfferInstallBanner } from "@/lib/pwa/install-banner";

const InstallAppInstructions = dynamic(() => import("./InstallAppInstructions").then((module) => module.InstallAppInstructions), { loading: () => null });

export function InstallAppEntry({ placement, className, onActivate, onInstructions }: { placement: "menu" | "banner"; className?: string; onActivate?: () => void; onInstructions?: (path: InstallPath) => void }) {
  const path = useInstallPath();
  const [instructions, setInstructions] = useState<InstallPath | null>(null);
  const [isPrompting, setIsPrompting] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const visited = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const offeredPath = useRef<InstallPath | null>(null);
  const visible = path !== null && path !== "installed" && (placement === "menu" || showBanner);

  useEffect(() => {
    if (placement !== "banner" || path === null || path === "installed" || visited.current) return;
    visited.current = true;
    recordInstallBannerVisit();
    setShowBanner(shouldOfferInstallBanner());
  }, [placement, path]);

  useEffect(() => {
    if (!visible || offeredPath.current === path || !buttonRef.current?.getClientRects().length) return;
    offeredPath.current = path;
    capturePostHogEvent("app_install_offered", { path, placement });
  }, [visible, path, placement]);

  const openInstructions = onInstructions ?? setInstructions;

  function activateInstall() {
    if (!path || isPrompting) return;
    onActivate?.();
    if (path === "native-prompt") {
      setIsPrompting(true);
      void runNativeInstall({ openInstructions, setIsPrompting });
      return;
    }
    openInstructions(path);
    if (path.startsWith("ios-")) capturePostHogEvent("app_ios_instructions_opened");
  }

  const button = <Button ref={buttonRef} type="button" variant="ghost" disabled={isPrompting} onClick={() => void activateInstall()} className={cn("min-h-10 justify-start gap-2 text-sm", className)}><Download aria-hidden className="h-4 w-4 shrink-0" />{isPrompting ? "Відкриваю встановлення…" : "Встановити застосунок"}</Button>;
  return <>
    {visible ? placement === "menu" ? button : <aside aria-label="Встановлення застосунку" className="mb-4 flex items-start gap-2 rounded-xl border border-white/10 bg-slate-900/60 p-3">
      <div className="min-w-0 flex-1"><p className="mb-1 text-sm text-slate-300">Ваші персонажі — з головного екрана телефона чи планшета.</p>{button}</div>
      <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0" aria-label="Приховати пропозицію встановлення на 30 днів" onClick={() => { dismissInstallBanner(); setShowBanner(false); }}><X className="h-4 w-4" /></Button>
    </aside> : null}
    {instructions && path !== "installed" ? <InstallAppInstructions path={instructions} onClose={() => setInstructions(null)} /> : null}
  </>;
}

async function runNativeInstall({ openInstructions, setIsPrompting }: {
  openInstructions: (path: InstallPath) => void;
  setIsPrompting: (pending: boolean) => void;
}) {
  try {
    const outcome = await requestAppInstall();
    if (outcome) capturePostHogEvent("app_install_prompt_result", { outcome });
    else openInstructions("android-menu");
  } catch (error) {
    if (!(error instanceof DOMException)) throw error;
    toast.error("Не вдалося відкрити встановлення. Спробуйте через меню браузера.");
    openInstructions("android-menu");
  } finally {
    setIsPrompting(false);
  }
}
