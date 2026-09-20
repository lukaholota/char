"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { reportProblem } from "@/lib/actions/problem-report-actions";
import { ReportAttachments, useReportAttachments } from "./ReportAttachments";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathname?: string;
};

function collectClientContext() {
  return {
    pageUrl: window.location.href,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

export function ReportProblemDialog({ open, onOpenChange, pathname }: Props) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const attachments = useReportAttachments();

  function submit() {
    const trimmed = message.trim();
    if (!trimmed) {
      toast.error("Опишіть проблему перед надсиланням");
      return;
    }

    startTransition(async () => {
      const result = await reportProblem({
        message: trimmed,
        pagePath: pathname ?? window.location.pathname,
        attachmentUrls: attachments.urls,
        ...collectClientContext(),
      });

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success("Дякуємо! Повідомлення надіслано.");
      setMessage("");
      attachments.clear();
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Повідомити про проблему</DialogTitle>
        </DialogHeader>

        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Що пішло не так? Опишіть, будь ласка, якомога детальніше."
          rows={5}
          maxLength={4000}
          autoFocus
          className="w-full rounded-lg border border-white/10 bg-slate-900/60 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-arcane-400/50"
        />

        <ReportAttachments attachments={attachments} disabled={isPending} />

        <DialogFooter>
          <Button type="button" disabled={isPending || attachments.isUploading || !message.trim()} onClick={submit}>
            {isPending ? "Надсилання…" : "Надіслати"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
