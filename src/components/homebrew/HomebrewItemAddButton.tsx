"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSignInGate } from "@/components/discussion/useSignInGate";
import { InventoryDropdown, type PersIndexItem } from "@/lib/components/magicItems/InventoryDropdown";
import type { HomebrewMagicItem } from "@/lib/logic/homebrew-view";

export function HomebrewItemAddButton({ item }: { item: HomebrewMagicItem }) {
  const [persIndex, setPersIndex] = useState<PersIndexItem[] | null>(null);
  const { isSignedIn, requireSignIn, signInDialog } = useSignInGate();
  const button = (
    <Button type="button" variant="secondary" className="h-11 gap-2 sm:h-9" onClick={isSignedIn ? undefined : () => requireSignIn(() => undefined)}>
      <UserPlus className="h-4 w-4" />
      Додати персонажу
    </Button>
  );

  if (!isSignedIn) {
    return (
      <>
        {button}
        {signInDialog}
      </>
    );
  }

  return <InventoryDropdown item={item} ruleset={item.ruleset} persIndex={persIndex} setPersIndex={setPersIndex} trigger={button} />;
}
