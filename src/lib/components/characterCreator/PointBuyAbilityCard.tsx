"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const POINT_BUY_MIN = 8;
export const POINT_BUY_MAX = 15;

const LIMIT_NOTES = {
  min: `${POINT_BUY_MIN} — найменше значення в «За очками».`,
  max: `${POINT_BUY_MAX} — найбільше значення в «За очками». Бонуси раси чи походження додаються зверху.`,
} as const;

interface Props {
  label: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
}

/// На межі «+»/«−» не вимикаються, а пояснюють чому (PostHog dead clicks 2026-09-27: 98 людей
/// тиснули їх раз у раз без відповіді).
export function PointBuyAbilityCard({ label, value, onDecrement, onIncrement }: Props) {
  const [limitNote, setLimitNote] = useState<{ limit: keyof typeof LIMIT_NOTES; value: number } | null>(null);
  const isAtMin = value <= POINT_BUY_MIN;
  const isAtMax = value >= POINT_BUY_MAX;
  const shownNote = limitNote?.value === value ? LIMIT_NOTES[limitNote.limit] : null;
  const bonus = Math.floor((value - 10) / 2);

  const handleDecrement = () => (isAtMin ? setLimitNote({ limit: "min", value }) : onDecrement());
  const handleIncrement = () => (isAtMax ? setLimitNote({ limit: "max", value }) : onIncrement());

  return (
    <Card className="shadow-sm transition hover:-translate-y-0.5 hover:ring-1 hover:ring-white/10">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
        </div>
        <Badge variant="outline" className="border-white/15 bg-white/5 text-slate-200">
          {bonus > 0 ? `+${bonus}` : bonus}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleDecrement}
            aria-disabled={isAtMin || undefined}
            aria-label="Зменшити"
            className={cn("border-indigo-500/60 bg-indigo-500/10 text-indigo-50 hover:bg-indigo-500/20", isAtMin && "opacity-50")}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-lg font-semibold text-white">{value}</div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleIncrement}
            aria-disabled={isAtMax || undefined}
            aria-label="Збільшити"
            className={cn("border-emerald-400/60 bg-emerald-500/10 text-emerald-50 hover:bg-emerald-500/20", isAtMax && "opacity-50")}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {shownNote && (
          <p role="status" className="text-xs leading-snug text-amber-200">
            {shownNote}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
