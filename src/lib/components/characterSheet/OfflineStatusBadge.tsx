"use client";

import { CloudOff, RefreshCw, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import type { OfflineSyncStatus } from "@/lib/offline/queue";

const OFFLINE_TONE = "border-amber-500/30 bg-amber-500/10 text-amber-400";
const SYNCING_TONE = "border-sky-500/30 bg-sky-500/10 text-sky-300";
const STUCK_TONE = "border-rose-500/30 bg-rose-500/10 text-rose-300";

export default function OfflineStatusBadge({ className }: { className?: string }) {
  const { isOnline, pendingCount, syncStatus, flush } = useOfflineQueue();

  if (isOnline && pendingCount === 0) return null;

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
