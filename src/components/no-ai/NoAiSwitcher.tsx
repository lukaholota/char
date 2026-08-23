"use client";

import { useRouter } from "next/navigation";
import { ImageOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { addNoAiPrefix, stripNoAiPrefix } from "@/lib/no-ai/no-ai-route";
import { useNoAiMode } from "./NoAiModeProvider";

type Props = {
  className?: string;
  onSwitched?: () => void;
};

export function NoAiSwitcher({ className, onSwitched }: Props) {
  const router = useRouter();
  const { enabled } = useNoAiMode();

  const switchMode = () => {
    const url = new URL(window.location.href);
    url.pathname = enabled ? stripNoAiPrefix(url.pathname) : addNoAiPrefix(url.pathname);
    router.push(`${url.pathname}${url.search}${url.hash}`);
    onSwitched?.();
  };

  return (
    <button
      type="button"
      onClick={switchMode}
      aria-pressed={enabled}
      title={
        enabled
          ? "Показувати всі ілюстрації, зокрема згенеровані"
          : "Сховати згенеровані ілюстрації. Посилання можна переслати — вигляд збережеться"
      }
      data-testid="no-ai-switcher"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-medium transition-all shadow-sm",
        enabled
          ? "border-violet-500/40 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20"
          : "border-white/10 bg-slate-900/60 text-slate-400 hover:text-slate-200",
        className
      )}
    >
      <ImageOff className="h-3.5 w-3.5" />
      <span>Без ШІ</span>
    </button>
  );
}
