"use client";

import { CloudCheck, CloudDownload, CloudOff, RefreshCw, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import type { OfflineSyncStatus } from "@/lib/offline/queue";
import type { OfflineReadiness } from "@/lib/offline/offline-readiness";

const OFFLINE_TONE = "border-amber-500/30 bg-amber-500/10 text-amber-400";
const SYNCING_TONE = "border-sky-500/30 bg-sky-500/10 text-sky-300";
const STUCK_TONE = "border-rose-500/30 bg-rose-500/10 text-rose-300";

const READINESS_LABEL = {
  preparing: { icon: <CloudDownload aria-hidden className="h-3 w-3" />, label: "Зберігаю для офлайну…", tone: "text-slate-400" },
  ready: { icon: <CloudCheck aria-hidden className="h-3 w-3" />, label: "Доступний офлайн", tone: "text-emerald-300/80" },
  failed: { icon: <TriangleAlert aria-hidden className="h-3 w-3" />, label: "Офлайн не збережено", tone: "text-amber-300/80" },
} as const;

export default function OfflineStatusBadge({ readiness, className }: { readiness: OfflineReadiness; className?: string }) {
  const { isOnline, pendingCount, syncStatus, flush } = useOfflineQueue();

  if (isOnline && pendingCount === 0) {
    if (readiness === "unavailable") return null;
    const { icon, label, tone } = READINESS_LABEL[readiness];
    return (
      <span data-offline-readiness={readiness} role="status" className={`inline-flex items-center gap-1 ${tone}`}>
        {icon}
        {label}
      </span>
    );
  }

  const { tone, icon, label } = describeStatus(isOnline, pendingCount, syncStatus);
  const canRetry = isOnline && syncStatus.state !== "syncing";

  return (
    <Badge
      variant="outline"
      className={`gap-1.5 ${tone} ${canRetry ? "cursor-pointer" : ""} ${className ?? ""}`}
      role="status"
      onClick={canRetry ? flush : undefined}
      title={canRetry ? "Натисніть, щоб надіслати зараз" : undefined}
    >
      {icon}
      {label}
    </Badge>
  );
}

function describeStatus(isOnline: boolean, pendingCount: number, status: OfflineSyncStatus) {
  if (!isOnline) {
    return {
      tone: OFFLINE_TONE,
      icon: <CloudOff className="h-3 w-3" />,
      label: pendingCount > 0 ? `Офлайн · незбережених змін: ${pendingCount}` : "Офлайн",
    };
  }
  if (status.state === "unauthorized") {
    return {
      tone: STUCK_TONE,
      icon: <TriangleAlert className="h-3 w-3" />,
      label: `Увійдіть знову, щоб надіслати зміни: ${pendingCount}`,
    };
  }
  if (status.state === "retrying") {
    return {
      tone: STUCK_TONE,
      icon: <TriangleAlert className="h-3 w-3" />,
      label: `Не вдалося надіслати зміни: ${pendingCount} · повторю`,
    };
  }
  return {
    tone: SYNCING_TONE,
    icon: <RefreshCw className="h-3 w-3 animate-spin" />,
    label: `Надсилаю зміни: ${pendingCount}`,
  };
}
