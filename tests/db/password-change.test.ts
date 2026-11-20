import { afterAll, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { findPasswordAccount, replacePasswordHash } from "@/server/db/auth";
import { disconnectDatabase } from "../user-data";

afterAll(disconnectDatabase);

const buildEmail = (label: string) => `password-change-${label}-${Math.random().toString(36).slice(2)}@holota.family`;

it("пароль пишеться лише підтвердженій пошті й лише поверх перевіреного хешу", async () => {
  const verified = await prisma.user.create({ data: { email: buildEmail("verified"), emailVerified: new Date() } });
  expect(await findPasswordAccount(verified.id)).toMatchObject({ isEmailVerified: true, passwordHash: null });
  expect(await replacePasswordHash(verified.id, null, "scrypt$first")).toBe(true);
  expect(await replacePasswordHash(verified.id, null, "scrypt$stale")).toBe(false);
  expect(await replacePasswordHash(verified.id, "scrypt$first", "scrypt$second")).toBe(true);
  expect((await findPasswordAccount(verified.id))?.passwordHash).toBe("scrypt$second");

  const unverified = await prisma.user.create({ data: { email: buildEmail("unverified"), passwordHash: "scrypt$own" } });
  expect(await replacePasswordHash(unverified.id, "scrypt$own", "scrypt$taken")).toBe(false);
  expect((await findPasswordAccount(unverified.id))?.passwordHash).toBe("scrypt$own");
});
