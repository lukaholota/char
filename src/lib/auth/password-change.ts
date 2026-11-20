import { z } from "zod";
import { findPasswordAccount, replacePasswordHash } from "@/server/db/auth";
import { hashPassword, isPasswordMatch } from "@/lib/auth/password-hash";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-rules";

export type PasswordChangeFailure = "invalid_input" | "not_verified" | "wrong_password" | "changed_elsewhere";

const passwordChangeSchema = z.object({
  currentPassword: z.string().max(200).optional(),
  newPassword: z.string().min(PASSWORD_MIN_LENGTH).max(200),
});

export async function changeAccountPassword(userId: number, rawInput: unknown): Promise<PasswordChangeFailure | null> {
  const input = passwordChangeSchema.safeParse(rawInput);
  if (!input.success) return "invalid_input";
  const account = await findPasswordAccount(userId);
  if (!account?.isEmailVerified) return "not_verified";
  if (account.passwordHash && !(await isPasswordMatch(input.data.currentPassword ?? "", account.passwordHash))) return "wrong_password";
  const isSaved = await replacePasswordHash(userId, account.passwordHash, await hashPassword(input.data.newPassword));
  return isSaved ? null : "changed_elsewhere";
}
