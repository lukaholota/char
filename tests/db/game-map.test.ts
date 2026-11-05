import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase, resetUserData } from "../user-data";

const stored = vi.hoisted(() => new Map<string, Uint8Array>());

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
vi.mock("@/server/media/media-store", () => ({
  isMediaStoreConfigured: () => true,
  putMediaObject: async (key: string, bytes: Uint8Array) => void stored.set(key, bytes),
  deleteMediaObject: async (key: string) => void stored.delete(key),
}));

import {
  bindMemberPers,
  createGameSession,
  findGameSessionView,
  joinGameSessionByToken,
  moveGameToken,
  setGameSessionArchived,
  setGameSessionMap,
} from "@/server/db/game-sessions";
import { openGameSessionStream } from "@/server/game-sessions/game-session-stream";

vi.setConfig({ testTimeout: 60_000 });

beforeEach(async () => {
  stored.clear();
  await resetUserData();
});
afterAll(disconnectDatabase);

async function createUser(label: string) {
  return prisma.user.create({ data: { email: `${label}-${randomUUID()}@map.test`, name: `${label} Тестовий` } });
}

async function createPers(userId: number, name: string) {
  const cls = await prisma.class.findFirstOrThrow({ where: { name: "FIGHTER_2014" } });
  const race = await prisma.race.findFirstOrThrow({ where: { name: "HUMAN_2014" } });
  const background = await prisma.background.findFirstOrThrow({ where: { ruleset: "RULES_2014" } });
  const pers = await prisma.pers.create({
    data: { userId, name, ruleset: "RULES_2014", classId: cls.classId, raceId: race.raceId, backgroundId: background.backgroundId, currentHp: 10, maxHp: 10, str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  });
  return pers.persId;
}

async function createMapImage() {
  const bytes = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#335522" } }).png().toBuffer();
  return new Blob([new Uint8Array(bytes)], { type: "image/png" });
}

async function createTableWithHeroes() {
  const gm = await createUser("gm");
  const player = await createUser("player");
  const other = await createUser("other");
  const created = await createGameSession(gm.id, "Печера");
  if (!created.ok) throw new Error(created.error);
  const sessionId = created.value.id;
  const inviteToken = (await findGameSessionView(sessionId, gm.id))!.inviteToken!;
  for (const user of [player, other]) {
    await joinGameSessionByToken(inviteToken, user.id);
    await bindMemberPers(sessionId, user.id, await createPers(user.id, `Герой ${user.id}`));
  }
  return { gm, player, other, sessionId };
}

const findToken = async (sessionId: number, viewerId: number, tokenUserId: number) =>
  (await findGameSessionView(sessionId, viewerId))!.members.find((member) => member.userId === tokenUserId)!.token;

describe("мапа кімнати", () => {
  it("мапу ставить лише майстер; нова мапа прибирає стару картинку й повертає токени в ряд", async () => {
    const { gm, player, sessionId } = await createTableWithHeroes();
    expect(await setGameSessionMap(sessionId, player.id, await createMapImage())).toEqual({ ok: false, error: "forbidden" });
    expect((await findGameSessionView(sessionId, player.id))!.mapImageUrl).toBeNull();

    expect(await setGameSessionMap(sessionId, gm.id, await createMapImage())).toEqual({ ok: true, value: null });
    const firstUrl = (await findGameSessionView(sessionId, player.id))!.mapImageUrl!;
    expect(firstUrl).toMatch(new RegExp(`/games/${sessionId}/map/[0-9a-f-]+\\.webp$`));
    expect([...stored.keys()]).toHaveLength(1);
    await moveGameToken(sessionId, player.id, player.id, { x: 0.4, y: 0.6 });

    await setGameSessionMap(sessionId, gm.id, await createMapImage());
    expect((await findGameSessionView(sessionId, player.id))!.mapImageUrl).not.toBe(firstUrl);
    expect([...stored.keys()]).toHaveLength(1);
    expect(await findToken(sessionId, player.id, player.id)).toBeNull();

    expect(await setGameSessionMap(sessionId, gm.id, new Blob(["не картинка"]))).toEqual({ ok: false, error: "bad_image" });
    await setGameSessionMap(sessionId, gm.id, null);
    expect((await findGameSessionView(sessionId, player.id))!.mapImageUrl).toBeNull();
    expect(stored.size).toBe(0);
  });

  it("гравець рухає лише свій токен, майстер — будь-який, а без мапи, персонажа чи в архіві токен стоїть", async () => {
    const { gm, player, other, sessionId } = await createTableWithHeroes();
    expect(await moveGameToken(sessionId, player.id, player.id, { x: 0.5, y: 0.5 })).toEqual({ ok: false, error: "no_map" });
    await setGameSessionMap(sessionId, gm.id, await createMapImage());

    expect(await moveGameToken(sessionId, player.id, player.id, { x: 0.25, y: 0.75 })).toEqual({ ok: true, value: null });
    expect(await findToken(sessionId, other.id, player.id)).toEqual({ x: 0.25, y: 0.75 });
    expect(await moveGameToken(sessionId, player.id, other.id, { x: 0.1, y: 0.1 })).toEqual({ ok: false, error: "forbidden" });
    expect(await moveGameToken(sessionId, gm.id, other.id, { x: 0.9, y: 0.1 })).toEqual({ ok: true, value: null });
    expect(await findToken(sessionId, other.id, other.id)).toEqual({ x: 0.9, y: 0.1 });
    expect(await moveGameToken(sessionId, gm.id, gm.id, { x: 0.5, y: 0.5 })).toEqual({ ok: false, error: "no_map" });

    await moveGameToken(sessionId, player.id, player.id, null);
    expect(await findToken(sessionId, gm.id, player.id)).toBeNull();

    await bindMemberPers(sessionId, other.id, null);
    expect(await findToken(sessionId, gm.id, other.id)).toBeNull();

    const outsider = await createUser("outsider");
    expect(await moveGameToken(sessionId, outsider.id, player.id, { x: 0.5, y: 0.5 })).toEqual({ ok: false, error: "not_found" });
    await setGameSessionArchived(sessionId, gm.id, true);
    expect(await moveGameToken(sessionId, player.id, player.id, { x: 0.5, y: 0.5 })).toEqual({ ok: false, error: "archived" });
    expect(await setGameSessionMap(sessionId, gm.id, null)).toEqual({ ok: false, error: "archived" });
  });

  it("рух токена приходить іншим учасникам тим самим потоком кімнати", async () => {
    const { gm, player, sessionId } = await createTableWithHeroes();
    await setGameSessionMap(sessionId, gm.id, await createMapImage());
    const abort = new AbortController();
    const reader = openGameSessionStream({ sessionId, userId: gm.id, afterSeq: null, abortSignal: abort.signal }).getReader();
    const decoder = new TextDecoder();
    let text = "";
    const readUntil = async (needle: string) => {
      while (!text.includes(needle)) text += decoder.decode((await reader.read()).value, { stream: true });
    };
    await readUntil("event: ready");

    await moveGameToken(sessionId, player.id, player.id, { x: 0.3, y: 0.7 });
    await readUntil('"token":{"x":0.3,"y":0.7}');
    abort.abort();
  });
});
