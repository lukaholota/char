import { afterAll, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { claimEmailVerifiedByGoogle, createPasswordUser, findOrCreateGoogleUser, findPasswordHash } from "@/server/db/auth";
import { disconnectDatabase } from "../user-data";

afterAll(disconnectDatabase);

function buildEmail(label: string): string {
  return `password-${label}-${Math.random().toString(36).slice(2)}@holota.family`;
}

it("пошта з паролем реєструється один раз і знаходиться за паролем", async () => {
  const email = buildEmail("once");
  const created = await createPasswordUser(email, "scrypt$hash");
  expect(created).toMatchObject({ email, name: email.split("@")[0] });
  expect(await createPasswordUser(email, "scrypt$other")).toBeNull();
  expect(await findPasswordHash(email)).toEqual({ user: created, passwordHash: "scrypt$hash" });
});

it("пошту Google-користувача не можна зайняти паролем", async () => {
  const email = buildEmail("google");
  await findOrCreateGoogleUser({ providerAccountId: email, email, name: "Кім", image: "" });
  expect(await createPasswordUser(email, "scrypt$hash")).toBeNull();
});

it("вхід через Google на ту саму пошту стирає непідтверджений пароль", async () => {
  const email = buildEmail("claim");
  const passwordUser = await createPasswordUser(email, "scrypt$hash");
  const googleUser = await findOrCreateGoogleUser({ providerAccountId: email, email, name: "Справжній власник", image: "" });

  expect(googleUser.id).toBe(passwordUser?.id);
  expect(await findPasswordHash(email)).toBeNull();
  const stored = await prisma.user.findUniqueOrThrow({ where: { email } });
  expect(stored.emailVerified).not.toBeNull();
});

it("підтверджена пошта зберігає пароль при повторному вході через Google", async () => {
  const email = buildEmail("verified");
  const user = await prisma.user.create({ data: { email, passwordHash: "scrypt$kept", emailVerified: new Date() } });
  await claimEmailVerifiedByGoogle(user.id);
  expect((await findPasswordHash(email))?.passwordHash).toBe("scrypt$kept");
});
