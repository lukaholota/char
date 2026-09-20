"use client";

import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function HomebrewToggleButton({ isOn, onToggle }: { isOn: boolean; onToggle: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-pressed={isOn}
      onClick={onToggle}
      className={cn("h-9 gap-1.5 rounded-xl text-xs", isOn ? "border-amber-400/50 bg-amber-500/15 text-amber-100" : "border-white/10 bg-slate-900/60")}
    >
      <Users className="h-3.5 w-3.5" />
      <span>Хоумбрю</span>
    </Button>
  );
}
