import { afterAll, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listPlayersWithPerses } from "@/server/db/admin-players";
import { isCurrentUserSiteOwner } from "@/server/db/current-user";
import { disconnectDatabase } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

afterAll(disconnectDatabase);

it("галерея гравців показує живих персонажів із портретом і без снапшотів", async () => {
  const user = await prisma.user.create({ data: { email: `admin-gallery-${Math.random()}@holota.family`, name: "Google-імʼя", displayName: "Шпигун" } });
  const [cls, race, background] = await Promise.all([
    prisma.class.findFirstOrThrow({ where: { ruleset: "RULES_2014" } }),
    prisma.race.findFirstOrThrow({ where: { ruleset: "RULES_2014" } }),
    prisma.background.findFirstOrThrow({ where: { ruleset: "RULES_2014" } }),
  ]);
  const base = { userId: user.id, classId: cls.classId, raceId: race.raceId, backgroundId: background.backgroundId, currentHp: 10, maxHp: 10, str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  const live = await prisma.pers.create({ data: { ...base, name: "Живий", portraitKey: "portraits/1/abc", level: 3 } });
  await prisma.pers.create({ data: { ...base, name: "Снапшот", isSnapshot: true, isActive: false, parentPersId: live.persId } });

  const player = (await listPlayersWithPerses()).find((entry) => entry.userId === user.id);

  expect(player).toMatchObject({ name: "Шпигун", email: user.email, perses: [{ persId: live.persId, name: "Живий", portraitKey: "portraits/1/abc", level: 3, raceName: race.name, className: cls.name }] });
  expect(player?.perses).toHaveLength(1);
});

it("адмінку бачить лише власник сайту", async () => {
  vi.mocked(auth).mockResolvedValue({ user: { email: "someone@holota.family" } } as never);
  expect(await isCurrentUserSiteOwner()).toBe(false);
  vi.mocked(auth).mockResolvedValue({ user: { email: "LukaGolota1@gmail.com" } } as never);
  expect(await isCurrentUserSiteOwner()).toBe(true);
  vi.mocked(auth).mockResolvedValue(null as never);
  expect(await isCurrentUserSiteOwner()).toBe(false);
});
