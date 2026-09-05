"use client";

import { CloudOff, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";

export default function OfflineStatusBadge({ className }: { className?: string }) {
  const { isOnline, pendingCount } = useOfflineQueue();

  if (isOnline && pendingCount === 0) return null;

  const tone = isOnline
    ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
    : "border-amber-500/30 bg-amber-500/10 text-amber-400";

  return (
    <Badge variant="outline" className={`gap-1.5 ${tone} ${className ?? ""}`} role="status">
      {isOnline ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CloudOff className="h-3 w-3" />}
      {isOnline
        ? `Надсилаю зміни: ${pendingCount}`
        : pendingCount > 0
          ? `Офлайн · незбережених змін: ${pendingCount}`
          : "Офлайн"}
    </Badge>
  );
}
