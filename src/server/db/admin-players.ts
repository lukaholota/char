import type { Prisma } from "@prisma/client";
import type { PlayerWithPerses } from "@/lib/logic/admin-players";
import { prisma } from "@/lib/prisma";

const LIVE_PERS = { isSnapshot: false } satisfies Prisma.PersWhereInput;

const PLAYER_SELECT = {
  id: true,
  name: true,
  displayName: true,
  email: true,
  image: true,
  perses: {
    where: LIVE_PERS,
    orderBy: { updatedAt: "desc" },
    select: {
      persId: true,
      name: true,
      portraitKey: true,
      level: true,
      ruleset: true,
      updatedAt: true,
      race: { select: { name: true } },
      class: { select: { name: true } },
    },
  },
} satisfies Prisma.UserSelect;

type PlayerRow = Prisma.UserGetPayload<{ select: typeof PLAYER_SELECT }>;

export async function listPlayersWithPerses(): Promise<PlayerWithPerses[]> {
  const users = await prisma.user.findMany({ where: { perses: { some: LIVE_PERS } }, select: PLAYER_SELECT });
  return users.map(toPlayerWithPerses);
}

function toPlayerWithPerses(user: PlayerRow): PlayerWithPerses {
  return {
    userId: user.id,
    name: user.displayName || user.name || user.email || `Гравець #${user.id}`,
    email: user.email,
    avatarUrl: user.image,
    lastActivityAt: user.perses[0].updatedAt,
    perses: user.perses.map((pers) => ({
      persId: pers.persId,
      name: pers.name,
      portraitKey: pers.portraitKey,
      level: pers.level,
      ruleset: pers.ruleset,
      raceName: pers.race.name,
      className: pers.class.name,
      updatedAt: pers.updatedAt,
    })),
  };
}
