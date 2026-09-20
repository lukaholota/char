"use client";

import { useEffect, useState } from "react";
import { Castle } from "lucide-react";
import { loadBastion } from "@/lib/actions/bastion-actions";
import { describeBastionLevelUp } from "@/rules/bastions";
import type { Ruleset } from "@/rules/types";

export function BastionLevelUpNote({
  persId,
  ruleset,
  fromLevel,
  toLevel,
}: {
  persId: number;
  ruleset: Ruleset;
  fromLevel: number;
  toLevel: number;
}) {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    setLines([]);
    if (ruleset !== "RULES_2024") return;

    let isStale = false;
    loadBastion(persId)
      .then((result) => {
        if (isStale || !result.ok) return;
        setLines(describeBastionLevelUp({ ruleset, fromLevel, toLevel, hasBastion: result.standing.bastion !== null }));
      })
      .catch(() => {});

    return () => {
      isStale = true;
    };
  }, [persId, ruleset, fromLevel, toLevel]);

  if (lines.length === 0) return null;

  return (
    <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-200">
      <Castle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
      <div className="space-y-1">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}
