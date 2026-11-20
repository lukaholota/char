"use server";

import { auth } from "@/lib/auth";
import { changeAccountPassword, type PasswordChangeFailure } from "@/lib/auth/password-change";

export async function changeOwnPassword(input: unknown): Promise<PasswordChangeFailure | "signed_out" | null> {
  const userId = Number((await auth())?.user?.id);
  if (!Number.isInteger(userId) || userId <= 0) return "signed_out";
  return changeAccountPassword(userId, input);
}
