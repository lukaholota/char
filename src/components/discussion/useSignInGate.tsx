"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import GoogleAuthDialog from "@/lib/components/auth/GoogleAuthDialog";

export function useSignInGate() {
  const { status } = useSession();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const isSignedIn = status === "authenticated";

  const requireSignIn = (action: () => void) => {
    if (isSignedIn) action();
    else setDialogOpen(true);
  };

  const signInDialog = <GoogleAuthDialog open={isDialogOpen} onOpenChange={setDialogOpen} />;
  return { isSignedIn, requireSignIn, signInDialog };
}
