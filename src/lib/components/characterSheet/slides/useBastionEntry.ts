"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { loadBastion, loadSharedBastion } from "@/lib/actions/bastion-actions";
import type { BastionEntryCard } from "@/lib/components/characterSheet/slides/FeaturesHeaderCards";

/// Власник бачить вхід на сторінку бастіону (до 5-го рівня — приглушений, Р26); поширений лист —
/// бастіон лише для читання; знімок і 2014 — нічого.
export function useBastionEntry(input: {
  persId: number;
  ruleset: string;
  isReadOnly: boolean;
  isSnapshot: boolean;
}): BastionEntryCard | null {
  const params = useParams();
  const shareToken = typeof params?.token === "string" ? params.token : null;
  const [entry, setEntry] = useState<BastionEntryCard | null>(null);
  const { persId, ruleset, isReadOnly, isSnapshot } = input;

  useEffect(() => {
    setEntry(null);
    if (ruleset !== "RULES_2024" || isSnapshot) return;
    if (isReadOnly && !shareToken) return;
    if (!navigator.onLine) return;

    let isStale = false;
    findBastionEntry({ persId, shareToken: isReadOnly ? shareToken : null })
      .then((found) => {
        if (!isStale) setEntry(found);
      })
      .catch(() => {});

    return () => {
      isStale = true;
    };
  }, [persId, ruleset, isReadOnly, isSnapshot, shareToken]);

  return entry;
}

async function findBastionEntry(input: { persId: number; shareToken: string | null }): Promise<BastionEntryCard | null> {
  if (input.shareToken) return findSharedBastionEntry(input.shareToken);

  const result = await loadBastion(input.persId);
  if (!result.ok || !result.standing.access.isEntryCardShown) return null;

  return {
    kind: "owner",
    href: `/char/${input.persId}/bastion`,
    name: result.standing.bastion?.name ?? null,
    facilityCount: result.standing.bastion?.facilities.length ?? 0,
    isMuted: result.standing.access.isEntryCardMuted,
  };
}

async function findSharedBastionEntry(shareToken: string): Promise<BastionEntryCard | null> {
  const shared = await loadSharedBastion(shareToken);
  if (!shared) return null;

  return { kind: "shared", bastion: shared };
}
