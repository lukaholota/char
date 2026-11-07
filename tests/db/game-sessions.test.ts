import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { canSeeGameRoll, GAME_ROLL_VISIBILITIES, type GameRoll } from "@/rules/game-roll";
import {
  bindMemberPers,
  createGameSession,
  findGameSessionView,
  findInvite,
  GAME_SESSION_LIMITS,
  joinGameSessionByToken,
  leaveGameSession,
  removeGameSessionMember,
  rotateInviteToken,
  setGameSessionArchived,
} from "@/server/db/game-sessions";
import { insertGameRollEvent, listEventsAfter, listEventsBefore, type GameRollDraft } from "@/server/db/game-roll-events";
import { openGameSessionStream } from "@/server/game-sessions/game-session-stream";

vi.setConfig({ testTimeout: 60_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

const d20Roll: GameRoll = { d20Mode: "NORMAL", modeSources: [], groups: [{ sides: 20, values: [12] }], extra: [], bonus: 3, total: 15, check: null };

async function createUser(label: string) {
  return prisma.user.create({ data: { email: `${label}-${randomUUID()}@game.test`, name: `${label} Тестовий` } });
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

function buildDraft(overrides: Partial<GameRollDraft> = {}): GameRollDraft {
  return { idempotencyKey: randomUUID(), visibility: "PUBLIC", source: "FREE", persId: null, label: "Перевірка", roll: d20Roll, rolledAt: new Date(), ...overrides };
}

async function createTable() {
  const gm = await createUser("gm");
  const player = await createUser("player");
  const created = await createGameSession(gm.id, "  Підземелля   Мурхола ");
  if (!created.ok) throw new Error(created.error);
  const sessionId = created.value.id;
  const view = await findGameSessionView(sessionId, gm.id);
  const joined = await joinGameSessionByToken(view!.inviteToken!, player.id);
  expect(joined).toEqual({ ok: true, value: { sessionId } });
  return { gm, player, sessionId, inviteToken: view!.inviteToken! };
}

describe("кімнати й учасники", () => {
  it("власник стає ведучим, гравець приходить за посиланням, повторний вхід нічого не дублює", async () => {
    const { gm, player, sessionId, inviteToken } = await createTable();
    expect(await joinGameSessionByToken(inviteToken, player.id)).toEqual({ ok: true, value: { sessionId } });

    const gmView = await findGameSessionView(sessionId, gm.id);
    expect(gmView).toMatchObject({ name: "Підземелля Мурхола", myRole: "GM", isArchived: false });
    expect(gmView!.members.map((member) => member.role)).toEqual(["GM", "PLAYER"]);
    const playerView = await findGameSessionView(sessionId, player.id);
    expect(playerView).toMatchObject({ myRole: "PLAYER", inviteToken: null });
    expect(inviteToken).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });

  it("нове посилання відкликає старе, архів не пускає нових, ліміт учасників тримається", async () => {
    const { gm, sessionId, inviteToken } = await createTable();
    const rotated = await rotateInviteToken(sessionId, gm.id);
    if (!rotated.ok) throw new Error(rotated.error);
    const late = await createUser("late");
    expect(await joinGameSessionByToken(inviteToken, late.id)).toEqual({ ok: false, error: "not_found" });
    expect(await findInvite(inviteToken, late.id)).toBeNull();

    await setGameSessionArchived(sessionId, gm.id, true);
    expect(await joinGameSessionByToken(rotated.value.inviteToken, late.id)).toEqual({ ok: false, error: "archived" });
    await setGameSessionArchived(sessionId, gm.id, false);

    for (let index = 2; index < GAME_SESSION_LIMITS.members; index++) {
      const extra = await createUser(`extra${index}`);
      expect((await joinGameSessionByToken(rotated.value.inviteToken, extra.id)).ok).toBe(true);
    }
    expect(await joinGameSessionByToken(rotated.value.inviteToken, late.id)).toEqual({ ok: false, error: "full" });
  });

  it("гравець не керує кімнатою, ведучий не може піти чи вигнати себе", async () => {
    const { gm, player, sessionId } = await createTable();
    expect(await rotateInviteToken(sessionId, player.id)).toEqual({ ok: false, error: "forbidden" });
    expect(await setGameSessionArchived(sessionId, player.id, true)).toEqual({ ok: false, error: "forbidden" });
    expect(await removeGameSessionMember(sessionId, player.id, gm.id)).toEqual({ ok: false, error: "forbidden" });
    expect(await leaveGameSession(sessionId, gm.id)).toEqual({ ok: false, error: "forbidden" });
    expect(await removeGameSessionMember(sessionId, gm.id, gm.id)).toEqual({ ok: false, error: "forbidden" });
    const stranger = await createUser("stranger");
    expect(await findGameSessionView(sessionId, stranger.id)).toBeNull();
  });

  it("привʼязати можна лише свого персонажа, а журнал памʼятає імʼя на момент кидка", async () => {
    const { gm, player, sessionId } = await createTable();
    const ownPers = await createPers(player.id, "Арвен");
    const foreignPers = await createPers(gm.id, "НПС ведучого");
    expect(await bindMemberPers(sessionId, player.id, foreignPers)).toEqual({ ok: false, error: "bad_pers" });
    expect(await bindMemberPers(sessionId, player.id, ownPers)).toEqual({ ok: true, value: null });

    const free = await insertGameRollEvent(sessionId, player.id, buildDraft());
    expect(free).toMatchObject({ ok: true, value: { persName: "Арвен", authorName: "player Тестовий" } });
    expect(await insertGameRollEvent(sessionId, player.id, buildDraft({ source: "CHARACTER", persId: foreignPers }))).toEqual({ ok: false, error: "bad_pers" });
    expect(await insertGameRollEvent(sessionId, gm.id, buildDraft({ source: "CHARACTER", persId: foreignPers }))).toMatchObject({ ok: true, value: { persName: "НПС ведучого" } });

    await prisma.pers.update({ where: { persId: ownPers }, data: { name: "Арвен Нова" } });
    const [first] = await listEventsAfter(sessionId, { userId: player.id, isGm: false }, 0, 10);
    expect(first.persName).toBe("Арвен");
    await prisma.pers.delete({ where: { persId: ownPers } });
    expect((await findGameSessionView(sessionId, player.id))!.myPersId).toBeNull();
  });
});

describe("журнал кидків", () => {
  it("паралельні кидки отримують неперервні унікальні номери, повтор з тим самим ключем не дублює", async () => {
    const { gm, player, sessionId } = await createTable();
    const drafts = Array.from({ length: 20 }, () => buildDraft());
    const results = await Promise.all(drafts.map((draft, index) => insertGameRollEvent(sessionId, index % 2 ? gm.id : player.id, draft)));
    const seqs = results.map((result) => (result.ok ? result.value.seq : -1)).sort((a, b) => a - b);
    expect(seqs).toEqual(Array.from({ length: 20 }, (_, index) => index + 1));

    const retried = await insertGameRollEvent(sessionId, player.id, drafts[0]);
    expect(retried.ok && retried.value.seq).toBe(results[0].ok && results[0].value.seq);
    expect(await prisma.gameRollEvent.count({ where: { gameSessionId: sessionId } })).toBe(20);
  });

  it("чужий ключ ідемпотентності не відкриває чужу подію", async () => {
    const { gm, player, sessionId } = await createTable();
    const secret = buildDraft({ visibility: "SELF" });
    await insertGameRollEvent(sessionId, gm.id, secret);
    const replay = await insertGameRollEvent(sessionId, player.id, { ...secret, visibility: "PUBLIC" });
    expect(replay.ok && replay.value.authorUserId).toBe(player.id);
  });

  it("фільтр бази збігається з правилом видимості для кожної пари автор/глядач", async () => {
    const { gm, player, sessionId } = await createTable();
    const other = await createUser("other");
    const session = await findGameSessionView(sessionId, gm.id);
    await joinGameSessionByToken(session!.inviteToken!, other.id);
    const authors = [gm, player, other];
    for (const author of authors) {
      for (const visibility of GAME_ROLL_VISIBILITIES) {
        await insertGameRollEvent(sessionId, author.id, buildDraft({ visibility, label: `${author.id}:${visibility}` }));
      }
    }
    for (const viewer of authors) {
      const isGm = viewer.id === gm.id;
      const expected = authors.flatMap((author) =>
        GAME_ROLL_VISIBILITIES.filter((visibility) => canSeeGameRoll(visibility, { isAuthor: author.id === viewer.id, isGm })).map((visibility) => `${author.id}:${visibility}`),
      );
      const after = await listEventsAfter(sessionId, { userId: viewer.id, isGm }, 0, 100);
      const before = await listEventsBefore(sessionId, { userId: viewer.id, isGm }, null, 100);
      expect(after.map((event) => `${event.authorUserId}:${event.visibility}`)).toEqual(expected);
      expect(before.events.map((event) => `${event.authorUserId}:${event.visibility}`)).toEqual(expected);
    }
  });

  it("секретний кидок: майстер бачить усе, автор — лише формулу без значень, інші — нічого, у кожному шляху читання", async () => {
    const { gm, player, sessionId } = await createTable();
    const other = await createUser("other");
    await joinGameSessionByToken((await findGameSessionView(sessionId, gm.id))!.inviteToken!, other.id);
    const draft = buildDraft({ visibility: "SECRET", label: "1к20", roll: { ...d20Roll, d20Mode: null, bonus: 0, total: 12 } });
    const inserted = await insertGameRollEvent(sessionId, player.id, draft);
    const replayed = await insertGameRollEvent(sessionId, player.id, draft);
    const redacted = { visibility: "SECRET", label: "Секретний кидок · 1к20", roll: null, total: null };
    expect(inserted.ok && inserted.value).toMatchObject(redacted);
    expect(replayed.ok && replayed.value).toMatchObject(redacted);

    const asAuthor = { userId: player.id, isGm: false };
    const authorPages = [await listEventsAfter(sessionId, asAuthor, 0, 10), (await listEventsBefore(sessionId, asAuthor, null, 10)).events];
    for (const events of authorPages) {
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject(redacted);
      expect(JSON.stringify(events)).not.toContain("values");
    }
    const abort = new AbortController();
    const reader = readStreamEvents(openGameSessionStream({ sessionId, userId: player.id, afterSeq: null, abortSignal: abort.signal }));
    await reader.next("session");
    expect(await reader.next("roll")).toMatchObject(redacted);
    abort.abort();

    const [forGm] = await listEventsAfter(sessionId, { userId: gm.id, isGm: true }, 0, 10);
    expect(forGm).toMatchObject({ visibility: "SECRET", label: "1к20", total: 12, roll: { groups: [{ sides: 20, values: [12] }] } });
    expect(await listEventsAfter(sessionId, { userId: other.id, isGm: false }, 0, 10)).toEqual([]);
    expect((await listEventsBefore(sessionId, { userId: other.id, isGm: false }, null, 10)).events).toEqual([]);
  });

  it("майстер, що кидає секретно, бачить власний кидок повністю", async () => {
    const { gm, sessionId } = await createTable();
    const inserted = await insertGameRollEvent(sessionId, gm.id, buildDraft({ visibility: "SECRET", label: "Прихований" }));
    expect(inserted.ok && inserted.value).toMatchObject({ label: "Прихований", total: 15 });
  });

  it("сторінки старших подій ідуть без пропусків і кажуть, чи є ще", async () => {
    const { player, sessionId } = await createTable();
    for (let index = 0; index < 7; index++) await insertGameRollEvent(sessionId, player.id, buildDraft({ label: `#${index + 1}` }));
    const viewer = { userId: player.id, isGm: false };
    const latest = await listEventsBefore(sessionId, viewer, null, 3);
    expect(latest).toMatchObject({ hasOlder: true });
    expect(latest.events.map((event) => event.seq)).toEqual([5, 6, 7]);
    const older = await listEventsBefore(sessionId, viewer, 5, 3);
    expect(older.events.map((event) => event.seq)).toEqual([2, 3, 4]);
    expect((await listEventsBefore(sessionId, viewer, 2, 3)).hasOlder).toBe(false);
  });

  it("вигнаний гравець і заархівована кімната кидків не приймають", async () => {
    const { gm, player, sessionId } = await createTable();
    await removeGameSessionMember(sessionId, gm.id, player.id);
    expect(await insertGameRollEvent(sessionId, player.id, buildDraft())).toEqual({ ok: false, error: "forbidden" });
    await setGameSessionArchived(sessionId, gm.id, true);
    expect(await insertGameRollEvent(sessionId, gm.id, buildDraft())).toEqual({ ok: false, error: "archived" });
  });
});

describe("потік подій", () => {
  it("віддає останні події, далі живі кидки за видимістю, а вигнаному — removed і кінець", async () => {
    const { gm, player, sessionId } = await createTable();
    await insertGameRollEvent(sessionId, gm.id, buildDraft({ label: "до входу" }));
    const abort = new AbortController();
    const reader = readStreamEvents(openGameSessionStream({ sessionId, userId: player.id, afterSeq: null, abortSignal: abort.signal }));

    expect(await reader.next("session")).toMatchObject({ myRole: "PLAYER" });
    expect(await reader.next("roll")).toMatchObject({ seq: 1, label: "до входу" });
    expect(await reader.next("ready")).toEqual({ hasOlder: false, isFresh: true });

    await insertGameRollEvent(sessionId, gm.id, buildDraft({ label: "таємний", visibility: "GM" }));
    await insertGameRollEvent(sessionId, gm.id, buildDraft({ label: "для всіх" }));
    expect(await reader.next("roll")).toMatchObject({ seq: 3, label: "для всіх" });

    await removeGameSessionMember(sessionId, gm.id, player.id);
    expect(await reader.next("removed")).toEqual({});
    expect(await reader.isDone()).toBe(true);
    abort.abort();
  });

  it("після реконекту з курсором доганяє лише пропущене", async () => {
    const { gm, player, sessionId } = await createTable();
    for (const label of ["a", "b", "c"]) await insertGameRollEvent(sessionId, gm.id, buildDraft({ label }));
    const abort = new AbortController();
    const reader = readStreamEvents(openGameSessionStream({ sessionId, userId: player.id, afterSeq: 1, abortSignal: abort.signal }));
    await reader.next("session");
    expect(await reader.next("roll")).toMatchObject({ seq: 2 });
    expect(await reader.next("roll")).toMatchObject({ seq: 3 });
    expect(await reader.next("ready")).toEqual({ hasOlder: null, isFresh: false });
    abort.abort();
  });
});

function readStreamEvents(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const queue: Array<{ event: string; data: unknown }> = [];
  let isDone = false;

  async function pull(): Promise<void> {
    const { value, done } = await reader.read();
    if (done) {
      isDone = true;
      return;
    }
    buffer += decoder.decode(value, { stream: true });
    let boundary: number;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const event = /^event: (.+)$/m.exec(block)?.[1];
      const data = /^data: (.+)$/m.exec(block)?.[1];
      if (event && data) queue.push({ event, data: JSON.parse(data) });
    }
  }

  return {
    async next(expectedEvent: string): Promise<unknown> {
      for (;;) {
        const index = queue.findIndex((item) => item.event === expectedEvent);
        if (index !== -1) {
          const [item] = queue.splice(0, index + 1).slice(-1);
          return item.data;
        }
        if (isDone) throw new Error(`stream ended before ${expectedEvent}`);
        await pull();
      }
    },
    async isDone(): Promise<boolean> {
      while (!isDone) await pull();
      return true;
    },
  };
}

