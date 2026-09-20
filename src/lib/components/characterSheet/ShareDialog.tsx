"use client";

import type { ComponentProps, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Copy, Eye, Loader2, Pencil, Share2 } from "lucide-react";
import { ensurePersShareLinks } from "@/lib/actions/share-actions";
import { toast } from "sonner";

interface ShareDialogProps {
  persId: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  noButtonTrigger?: boolean;
  triggerClassName?: string;
  triggerLabel?: string;
  triggerLabelClassName?: string;
  triggerVariant?: ComponentProps<typeof Button>["variant"];
}

type ShareLinks = { viewUrl: string; editUrl: string };
type LinksState = { status: "loading" } | { status: "ready"; links: ShareLinks } | { status: "failed"; error: string };

const SITE_ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://char.holota.family").replace(/\/$/, "");

function buildShareUrl(token: string): string {
  return `${SITE_ORIGIN}/char/share/${token}`;
}

export function ShareDialog({
  persId,
  open: openOverride,
  onOpenChange: onOpenChangeOverride,
  noButtonTrigger: hideTrigger,
  triggerClassName,
  triggerLabel,
  triggerLabelClassName,
  triggerVariant = "ghost",
}: ShareDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = openOverride !== undefined ? openOverride : internalOpen;
  const setIsOpen = onOpenChangeOverride !== undefined ? onOpenChangeOverride : setInternalOpen;
  const linksState = useShareLinks(persId, isOpen);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {hideTrigger !== true && (
        <DialogTrigger asChild>
          <Button
            variant={triggerVariant}
            size="sm"
            title="Поділитися"
            className={triggerClassName ?? "h-8 w-8 text-slate-300 hover:text-white"}
          >
            <Share2 className="h-4 w-4" />
            <span className={triggerLabelClassName ?? "hidden sm:inline"}>{triggerLabel ?? "Поділитися"}</span>
          </Button>
        </DialogTrigger>
      )}
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-[440px] overflow-hidden glass-card border-white/10 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Поділитися персонажем
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Оберіть, що зможе робити людина, якій ви надішлете посилання.
          </DialogDescription>
        </DialogHeader>

        {linksState.status === "loading" && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Готуємо посилання…
          </div>
        )}

        {linksState.status === "failed" && (
          <p className="py-6 text-center text-sm text-red-300">{linksState.error}</p>
        )}

        {linksState.status === "ready" && (
          <div className="min-w-0 space-y-3">
            <ShareLinkOption
              icon={<Eye className="h-4 w-4 text-indigo-300" />}
              title="Лише перегляд"
              description="Для гравців і друзів: бачать лист, можуть надрукувати його або скопіювати персонажа собі."
              url={linksState.links.viewUrl}
              accentClassName="text-indigo-300"
            />
            <ShareLinkOption
              icon={<Pencil className="h-4 w-4 text-emerald-300" />}
              title="Може редагувати (наприклад, ДМ)"
              description="Після входу через Google персонаж зʼявиться в списку цієї людини, і вона зможе змінювати його разом із вами."
              url={linksState.links.editUrl}
              accentClassName="text-emerald-300"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function useShareLinks(persId: number, isOpen: boolean): LinksState {
  const [state, setState] = useState<LinksState>({ status: "loading" });
  const loadedFor = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen || loadedFor.current === persId) return;
    let cancelled = false;
    setState({ status: "loading" });

    ensurePersShareLinks(persId)
      .then((result) => {
        if (cancelled) return;
        if (!result.success) {
          setState({ status: "failed", error: result.error });
          return;
        }
        loadedFor.current = persId;
        setState({
          status: "ready",
          links: { viewUrl: buildShareUrl(result.viewToken), editUrl: buildShareUrl(result.editToken) },
        });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "failed", error: "Не вдалося отримати посилання. Перевірте звʼязок." });
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, persId]);

  return state;
}

function ShareLinkOption({
  icon,
  title,
  description,
  url,
  accentClassName,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  url: string;
  accentClassName: string;
}) {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const copyUrl = () => {
    navigator.clipboard.writeText(url).then(
      () => {
        setCopied(true);
        toast.success("Посилання скопійовано");
        setTimeout(() => setCopied(false), 2000);
      },
      () => {
        inputRef.current?.select();
        toast.error("Не вдалося скопіювати — виділіть посилання й скопіюйте вручну");
      }
    );
  };

  return (
    <section className="min-w-0 space-y-2 rounded-lg border border-white/10 bg-black/20 p-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
        {icon}
        {title}
      </h3>
      <p className="text-xs text-slate-400">{description}</p>
      <div className="flex min-w-0 items-center gap-2">
        <input
          ref={inputRef}
          readOnly
          value={url}
          aria-label={`Посилання: ${title}`}
          onFocus={(e) => e.currentTarget.select()}
          className={`min-w-0 flex-1 truncate rounded border border-white/10 bg-black/30 px-2 py-1.5 font-mono text-xs ${accentClassName}`}
        />
        <Button size="sm" variant="secondary" className="shrink-0 gap-1.5" onClick={copyUrl}>
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          Копіювати
        </Button>
      </div>
    </section>
  );
}
