"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import SignInDialog from "@/lib/components/auth/SignInDialog";

export function useSignInGate() {
  const { status } = useSession();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const isSignedIn = status === "authenticated";

  const requireSignIn = (action: () => void) => {
    if (isSignedIn) action();
    else setDialogOpen(true);
  };

  const signInDialog = <SignInDialog open={isDialogOpen} onOpenChange={setDialogOpen} analyticsTrigger="discussion" />;
  return { isSignedIn, requireSignIn, signInDialog };
}
