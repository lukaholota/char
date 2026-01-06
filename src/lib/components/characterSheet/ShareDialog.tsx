"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, Copy, Check, Link as LinkIcon } from "lucide-react";
import { generateShareToken } from "@/lib/actions/share-actions";
import { toast } from "sonner";

interface ShareDialogProps {
  persId: number;
  initialToken?: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  noButtonTrigger?: boolean;
}

export function ShareDialog({ persId, initialToken, open: openOverride, onOpenChange: onOpenChangeOverride, noButtonTrigger: hideTrigger }: ShareDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = openOverride !== undefined ? openOverride : internalOpen;
  const setIsOpen = onOpenChangeOverride !== undefined ? onOpenChangeOverride : setInternalOpen;

  const [token, setToken] = useState<string | null>(initialToken || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Use a stable origin to avoid layout shift on open (SSR -> hydration).
  // Keep consistent with other places in the app (e.g. sitemap/robots).
  const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://char.holota.family").replace(/\/$/, "");

  const handleGenerate = async () => {
    setIsGenerating(true);
    const result = await generateShareToken(persId);
    setIsGenerating(false);
    if (result.success && result.token) {
      setToken(result.token);
      toast.success("Посилання згенеровано!");
    } else {
      toast.error(result.error || "Не вдалося згенерувати посилання");
    }
  };

  const shareUrl = token && origin ? `${origin}/char/share/${token}` : "";

  const copyToClipboard = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Посилання скопійовано!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {hideTrigger !== true && (
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-white">
            <Share2 className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent 
        className="w-[calc(100%-2rem)] max-w-[425px] overflow-hidden glass-card border-white/10 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Поділитися персонажем
          </DialogTitle>
        </DialogHeader>
        
        <div className="w-full py-4 space-y-4 max-w-full min-w-0">
          <p className="text-sm text-slate-400">
            Згенеруйте публічне посилання, щоб інші могли переглянути вашого персонажа (тільки для читання).
          </p>
          
          {token ? (
            <div className="w-full space-y-3 max-w-full">
              <div className="w-full flex min-w-0 max-w-full items-center gap-2 overflow-hidden p-2 bg-black/30 rounded border border-white/10">
                <code className="block min-w-0 max-w-full flex-1 truncate text-xs text-indigo-300">
                  {origin}/char/share/{token.slice(0, 8)}...
                </code>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={copyToClipboard}>
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-[10px] text-slate-500 text-center">
                Будь-хто з цим посиланням зможе бачити вашого персонажа.
              </p>
            </div>
          ) : (
            <Button 
                onClick={handleGenerate} 
                disabled={isGenerating}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-slate-200"
            >
              {isGenerating ? "Генерація..." : "Згенерувати посилання"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
