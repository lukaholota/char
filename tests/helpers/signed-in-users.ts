import { vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function signInAs(label: string) {
  const email = `${label}@signed-in.test`;
  const user = await prisma.user.upsert({ where: { email }, create: { email, name: `${label} Тестовий` }, update: {} });
  vi.mocked(auth).mockResolvedValue({ user: { email } } as never);
  return user;
}
