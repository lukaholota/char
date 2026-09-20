"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { reportContent } from "@/lib/actions/content-report-actions";
import { MAX_REPORT_DETAILS_LENGTH, REPORT_REASONS, type ReportReason } from "@/rules/discussion-limits";

const REASON_LABELS: Record<ReportReason, string> = {
  SPAM: "Спам або реклама",
  OFFENSIVE: "Образи чи неприйнятний вміст",
  COPYRIGHT: "Скопійовано з платної книги",
  OTHER: "Інше",
};

type Props = { target: string; commentId: number | null; open: boolean; onOpenChange: (open: boolean) => void };

export function ReportDialog({ target, commentId, open, onOpenChange }: Props) {
  const [reason, setReason] = useState<ReportReason | "">("");
  const [details, setDetails] = useState("");
  const [isPending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      const result = await reportContent({ target, commentId, reason, details });
      if (!result.success) return void toast.error(result.error);
      toast.success("Дякуємо, модератори перевірять");
      setReason("");
      setDetails("");
      onOpenChange(false);
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-md overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="pr-6 text-lg">{commentId === null ? "Поскаржитися на запис" : "Поскаржитися на коментар"}</DialogTitle>
          <DialogDescription>Скаргу бачать лише модератори.</DialogDescription>
        </DialogHeader>
        <RadioGroup value={reason} onValueChange={(value) => setReason(value as ReportReason)} className="gap-1">
          {REPORT_REASONS.map((value) => (
            <label key={value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-slate-200 has-[[data-state=checked]]:border-amber-400/50">
              <RadioGroupItem value={value} />
              {REASON_LABELS[value]}
            </label>
          ))}
        </RadioGroup>
        <textarea
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          maxLength={MAX_REPORT_DETAILS_LENGTH}
          placeholder={reason === "OTHER" ? "Що не так?" : "Пояснення (необовʼязково)"}
          aria-label="Пояснення"
          className="min-h-20 w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-base text-slate-100 outline-none focus:ring-1 focus:ring-white/20 sm:text-sm"
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" className="h-11 sm:h-9" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button type="button" className="h-11 sm:h-9" disabled={isPending || !reason} onClick={submit}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Надіслати скаргу"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
