"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { Button } from "@/components/ui/button";
import { resolveContentReports, type OpenReportGroup } from "@/lib/actions/content-report-actions";
import type { ReportReason } from "@/rules/discussion-limits";

const REASON_LABELS: Record<ReportReason, string> = {
  SPAM: "Спам",
  OFFENSIVE: "Образи",
  COPYRIGHT: "Платна книга",
  OTHER: "Інше",
};

export function ReportQueue({ reports }: { reports: OpenReportGroup[] }) {
  if (reports.length === 0) {
    return <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-400">Відкритих скарг немає.</p>;
  }
  return (
    <ul className="space-y-3">
      {reports.map((group) => (
        <li key={`${group.target}#${group.commentId ?? ""}`}>
          <ReportCard group={group} />
        </li>
      ))}
    </ul>
  );
}

function ReportCard({ group }: { group: OpenReportGroup }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const resolve = (action: "DELETE" | "DISMISS") =>
    startTransition(async () => {
      const result = await resolveContentReports({ target: group.target, commentId: group.commentId, action });
      if (!result.success) return void toast.error(result.error);
      toast.success(action === "DELETE" ? "Видалено" : "Скаргу відхилено");
      router.refresh();
    });

  return (
    <article className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <header className="space-y-1">
        <div className="text-xs uppercase tracking-wide text-slate-500">{group.commentId === null ? "Запис" : "Коментар"} · скарг: {group.reasons.length}</div>
        <Link href={group.targetHref} className="break-words font-semibold text-amber-200 underline-offset-2 hover:underline">
          {group.targetLabel}
        </Link>
      </header>
      {group.commentBody !== null ? (
        <blockquote className="whitespace-pre-wrap break-words rounded-lg border-l-2 border-white/20 bg-white/5 p-2 text-sm text-slate-200">
          <span className="mb-1 block text-xs text-slate-400">{group.commentAuthor}</span>
          {group.commentBody}
        </blockquote>
      ) : null}
      <ul className="space-y-1 text-sm text-slate-300">
        {group.reasons.map((report, index) => (
          <li key={`${report.createdAt}-${index}`}>
            <span className="font-medium text-slate-100">{REASON_LABELS[report.reason]}</span>
            {report.details ? <span className="break-words text-slate-400"> — {report.details}</span> : null}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" className="h-11 gap-2 sm:h-9" disabled={isPending} onClick={() => resolve("DISMISS")}>
          <Check className="h-4 w-4" />
          Лишити
        </Button>
        <Button type="button" variant="destructive" className="h-11 gap-2 sm:h-9" disabled={isPending} onClick={() => resolve("DELETE")}>
          <Trash2 className="h-4 w-4" />
          Видалити
        </Button>
      </div>
    </article>
  );
}
