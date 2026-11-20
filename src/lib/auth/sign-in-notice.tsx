import { toast } from "sonner";

const SIGN_IN_ATTEMPT_KEY = "auth:sign-in-attempt";

export function rememberSignInAttempt(): void {
  try {
    window.sessionStorage.setItem(SIGN_IN_ATTEMPT_KEY, "1");
  } catch {}
}

export function takeSignInAttempt(): boolean {
  try {
    const hasAttempt = window.sessionStorage.getItem(SIGN_IN_ATTEMPT_KEY) !== null;
    window.sessionStorage.removeItem(SIGN_IN_ATTEMPT_KEY);
    return hasAttempt;
  } catch {
    return false;
  }
}

export function announceSignedIn(email: string | null | undefined): void {
  toast.success("Ви увійшли", { description: email ? <span data-ph-mask>{email}</span> : undefined });
}
