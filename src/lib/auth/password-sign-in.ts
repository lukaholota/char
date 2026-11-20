import { CredentialsSignin } from "@auth/core/errors";
import { z } from "zod";
import { createPasswordUser, findPasswordHash, type AuthenticatedUser } from "@/server/db/auth";
import { hashPassword, isPasswordMatch } from "@/lib/auth/password-hash";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-rules";

export type PasswordSignInErrorCode = "invalid_input" | "email_taken" | "wrong_credentials";

class PasswordSignInError extends CredentialsSignin {
  constructor(code: PasswordSignInErrorCode) {
    super();
    this.code = code;
  }
}

const passwordCredentialsSchema = z.object({
  mode: z.enum(["sign_in", "register"]),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(200),
});

export async function authorizePasswordUser(rawCredentials: unknown): Promise<AuthenticatedUser> {
  const credentials = passwordCredentialsSchema.safeParse(rawCredentials);
  if (!credentials.success) throw new PasswordSignInError("invalid_input");
  const { mode, email, password } = credentials.data;
  return mode === "register" ? registerPasswordUser(email, password) : verifyPasswordUser(email, password);
}

async function registerPasswordUser(email: string, password: string): Promise<AuthenticatedUser> {
  const user = await createPasswordUser(email, await hashPassword(password));
  if (!user) throw new PasswordSignInError("email_taken");
  return user;
}

async function verifyPasswordUser(email: string, password: string): Promise<AuthenticatedUser> {
  const stored = await findPasswordHash(email);
  if (!stored || !(await isPasswordMatch(password, stored.passwordHash))) throw new PasswordSignInError("wrong_credentials");
  return stored.user;
}
