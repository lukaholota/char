"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { isRules2024Allowed } from "@/rules/access";
import { getEditionFromPathname, getTargetEditionPath } from "@/rules/route-helpers";
import { useIsEditionPinnedByPage } from "@/components/ui/PersEditionPin";
import { useNoAiHref, useRoutePathname } from "@/components/no-ai/NoAiModeProvider";

type Props = {
  className?: string;
  variant?: "pill" | "compact";
};

export function EditionSwitcher({ className, variant = "pill" }: Props) {
  const pathname = useRoutePathname();
  const buildHref = useNoAiHref();
  const router = useRouter();
  const isEditionPinnedByPage = useIsEditionPinnedByPage();
  const [isSwitching, startSwitch] = useTransition();

  const canAccess2024 = isRules2024Allowed();

  // If user does not have 2024 access, do not show the switcher
  if (!canAccess2024 || isEditionPinnedByPage) {
    return null;
  }

  const currentEdition = getEditionFromPathname(pathname);
  const pendingEdition = currentEdition === "2024" ? "2014" : "2024";

  const handleSwitch = (targetEdition: "2014" | "2024") => {
    if (targetEdition === currentEdition || isSwitching) return;
    const targetPath = getTargetEditionPath(pathname, targetEdition);
    startSwitch(() => router.push(buildHref(targetPath)));
  };

  if (variant === "compact") {
    return (
      <button
        onClick={() => handleSwitch(currentEdition === "2024" ? "2014" : "2024")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all shadow-sm",
          currentEdition === "2024"
            ? "border-prism-500/40 bg-prism-500/10 text-prism-300 hover:bg-prism-500/20"
            : "border-arcane-500/40 bg-arcane-500/10 text-arcane-300 hover:bg-arcane-500/20",
          className
        )}
        data-testid="edition-switcher"
        aria-busy={isSwitching}
        title={`Поточна редакція: ${currentEdition === "2024" ? "PHB 2024" : "PHB 2014"}`}
      >
        {isSwitching ? (
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        ) : (
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full animate-pulse",
              currentEdition === "2024" ? "bg-prism-400" : "bg-arcane-400"
            )}
          />
        )}
        <span>{isSwitching ? pendingEdition : currentEdition}</span>
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center rounded-xl border border-white/10 bg-slate-900/60 p-0.5 backdrop-blur-md",
        className
      )}
      data-testid="edition-switcher"
      aria-busy={isSwitching}
    >
      <button
        type="button"
        onClick={() => handleSwitch("2014")}
        className={cn(
          "rounded-lg px-2 py-1 text-[11px] font-medium transition-all",
          currentEdition === "2014"
            ? "bg-arcane-500/20 text-arcane-300 shadow-[inset_0_0_8px_rgba(45,212,191,0.2)] ring-1 ring-arcane-500/30"
            : "text-slate-400 hover:text-slate-200"
        )}
        data-testid="edition-2014-btn"
      >
        <EditionLabel edition="2014" isPending={isSwitching && pendingEdition === "2014"} />
      </button>
      <button
        type="button"
        onClick={() => handleSwitch("2024")}
        className={cn(
          "rounded-lg px-2 py-1 text-[11px] font-medium transition-all",
          currentEdition === "2024"
            ? "bg-prism-500/20 text-prism-300 shadow-[inset_0_0_8px_rgba(192,74,224,0.2)] ring-1 ring-prism-500/30"
            : "text-slate-400 hover:text-slate-200"
        )}
        data-testid="edition-2024-btn"
      >
        <EditionLabel edition="2024" isPending={isSwitching && pendingEdition === "2024"} />
      </button>
    </div>
  );
}

function EditionLabel({ edition, isPending }: { edition: "2014" | "2024"; isPending: boolean }) {
  if (!isPending) return edition;
  return (
    <span className="inline-flex items-center gap-1">
      <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
      {edition}
    </span>
  );
}
