import type { Ruleset } from "@prisma/client";

export type PlayerPers = {
  persId: number;
  name: string;
  portraitKey: string | null;
  level: number;
  ruleset: Ruleset;
  raceName: string;
  className: string;
  updatedAt: Date;
};

export type PlayerWithPerses = {
  userId: number;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  lastActivityAt: Date;
  perses: PlayerPers[];
};

export const PLAYER_SORTS = ["recent", "persCount", "portraitCount"] as const;
export type PlayerSort = (typeof PLAYER_SORTS)[number];

export type PlayerGalleryView = { onlyWithPortraits: boolean; sort: PlayerSort };

type GallerySearchParams = { sort?: string | string[]; all?: string | string[] };

export function readPlayerGalleryView(params: GallerySearchParams): PlayerGalleryView {
  const sort = PLAYER_SORTS.find((option) => option === params.sort) ?? "recent";
  return { onlyWithPortraits: params.all !== "1", sort };
}

export function buildPlayerGalleryHref(view: PlayerGalleryView): string {
  const query = new URLSearchParams();
  if (view.sort !== "recent") query.set("sort", view.sort);
  if (!view.onlyWithPortraits) query.set("all", "1");
  const search = query.toString();
  return search ? `/admin/players?${search}` : "/admin/players";
}

export function arrangePlayers(players: PlayerWithPerses[], view: PlayerGalleryView): PlayerWithPerses[] {
  const shown = view.onlyWithPortraits ? players.filter((player) => countPortraits(player) > 0) : players;
  return [...shown].sort(COMPARE_BY_SORT[view.sort]);
}

export function countPortraits(player: PlayerWithPerses): number {
  return player.perses.filter((pers) => pers.portraitKey).length;
}

type ComparePlayers = (a: PlayerWithPerses, b: PlayerWithPerses) => number;

const compareByRecent: ComparePlayers = (a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime();
const compareByPersCount: ComparePlayers = (a, b) => b.perses.length - a.perses.length;
const compareByPortraitCount: ComparePlayers = (a, b) => countPortraits(b) - countPortraits(a);

const COMPARE_BY_SORT: Record<PlayerSort, ComparePlayers> = {
  recent: compareByRecent,
  persCount: chainComparisons(compareByPersCount, compareByPortraitCount, compareByRecent),
  portraitCount: chainComparisons(compareByPortraitCount, compareByPersCount, compareByRecent),
};

function chainComparisons(...comparisons: ComparePlayers[]): ComparePlayers {
  return (a, b) => {
    for (const compare of comparisons) {
      const result = compare(a, b);
      if (result !== 0) return result;
    }
    return 0;
  };
}
