"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpellbookDropdown, type PersIndexItem } from "@/components/spells/SpellbookDropdown";
import { useSignInGate } from "@/components/discussion/useSignInGate";
import { buildHomebrewSpellKey } from "@/lib/logic/homebrew-view";
import type { HomebrewEdition } from "@/lib/logic/homebrew-input";

export function HomebrewAddToPersButton({ entryId, edition }: { entryId: number; edition: HomebrewEdition }) {
  const [persIndex, setPersIndex] = useState<PersIndexItem[] | null>(null);
  const { isSignedIn, requireSignIn, signInDialog } = useSignInGate();
  const label = (
    <>
      <UserPlus className="h-4 w-4" />
      Додати персонажу
    </>
  );

  if (!isSignedIn) {
    return (
      <>
        <Button type="button" variant="secondary" className="h-11 gap-2 sm:h-9" onClick={() => requireSignIn(() => undefined)}>
          {label}
        </Button>
        {signInDialog}
      </>
    );
  }

  return (
    <SpellbookDropdown
      target={{ kind: "HOMEBREW", ruleset: edition, spellKey: buildHomebrewSpellKey(entryId), entryId }}
      persIndex={persIndex}
      setPersIndex={setPersIndex}
      trigger={
        <Button type="button" variant="secondary" className="h-11 gap-2 sm:h-9">
          {label}
        </Button>
      }
    />
  );
}
