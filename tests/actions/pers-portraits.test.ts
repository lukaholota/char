/**
 * KR31.13 — портрет персонажа (рішення власника 2026-09-14): файл перекодовується в WebP 512 і 96
 * на сервері й лягає в R2; у базі лише ключ. Сховище тут підмінене памʼяттю, справжнє R2 не чіпається.
 */

import sharp from "sharp";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase, resetUserData } from "../user-data";

const stored = vi.hoisted(() => new Map<string, { bytes: Uint8Array; contentType: string }>());

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
vi.mock("@/server/media/media-store", () => ({
  isMediaStoreConfigured: () => true,
  putMediaObject: async (key: string, bytes: Uint8Array, contentType: string) => void stored.set(key, { bytes, contentType }),
  deleteMediaObject: async (key: string) => void stored.delete(key),
}));

import { auth } from "@/lib/auth";
import { removePersPortrait, uploadPersPortrait } from "@/lib/actions/pers-portraits";
import { deletePers } from "@/lib/actions/pers";

vi.setConfig({ testTimeout: 60_000 });

beforeEach(async () => {
  stored.clear();
  await resetUserData();
});
afterAll(disconnectDatabase);

describe("KR31.13 — портрет персонажа", () => {
  it("фото стає двома WebP у сховищі, заміна прибирає старі, «Прибрати» чистить ключ", async () => {
    const persId = await createPers();

    const first = await uploadPersPortrait(buildForm(persId, await makePng()));
    expect(first).toMatchObject({ success: true, portraitKey: expect.stringMatching(new RegExp(`^portraits/${persId}/`)) });
    expect([...stored.keys()].sort()).toEqual([`${portraitKeyOf(first)}-96.webp`, `${portraitKeyOf(first)}.webp`]);
    expect(await sharp(stored.get(`${portraitKeyOf(first)}.webp`)!.bytes).metadata()).toMatchObject({ format: "webp", width: 512, height: 512 });

    const second = await uploadPersPortrait(buildForm(persId, await makePng()));
    expect(stored.size).toBe(2);
    expect(stored.has(`${portraitKeyOf(second)}.webp`)).toBe(true);

    expect(await removePersPortrait(persId)).toEqual({ success: true, portraitKey: null });
    expect(stored.size).toBe(0);
    expect((await prisma.pers.findUniqueOrThrow({ where: { persId } })).portraitKey).toBeNull();
  });

  it("копія з тим самим портретом не втрачає файл, коли оригінал міняє свій", async () => {
    const copyId = await createPers();
    const persId = await createPers();
    const uploaded = await uploadPersPortrait(buildForm(persId, await makePng()));
    await prisma.pers.update({ where: { persId: copyId }, data: { portraitKey: portraitKeyOf(uploaded) } });

    await removePersPortrait(persId);
    expect(stored.has(`${portraitKeyOf(uploaded)}.webp`)).toBe(true);
  });

  it("видалення персонажа прибирає його портрет і портрети знімків, а спільний із копією лишає", async () => {
    const snapshotId = await createPers();
    const persId = await createPers();
    const uploaded = await uploadPersPortrait(buildForm(persId, await makePng()));
    await prisma.pers.update({ where: { persId: snapshotId }, data: { parentPersId: persId, portraitKey: portraitKeyOf(uploaded) } });

    expect(await deletePers(persId)).toEqual({ success: true });
    await vi.waitFor(() => expect(stored.size).toBe(0));

    const copyId = await createPers();
    const originalId = await createPers();
    const kept = await uploadPersPortrait(buildForm(originalId, await makePng()));
    await prisma.pers.update({ where: { persId: copyId }, data: { portraitKey: portraitKeyOf(kept) } });

    expect(await deletePers(originalId)).toEqual({ success: true });
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(stored.has(`${portraitKeyOf(kept)}.webp`)).toBe(true);
  });

  it("SVG під виглядом картинки й чужий персонаж — відмова без запису", async () => {
    const persId = await createPers();
    const svg = new Blob(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'], { type: "image/png" });
    expect(await uploadPersPortrait(buildForm(persId, svg))).toMatchObject({ success: false });

    await signIn("stranger");
    expect(await uploadPersPortrait(buildForm(persId, await makePng()))).toMatchObject({ success: false, error: "Немає доступу до персонажа" });
    expect(stored.size).toBe(0);
  });
});

function portraitKeyOf(result: Awaited<ReturnType<typeof uploadPersPortrait>>): string {
  if (!result.success || !result.portraitKey) throw new Error("портрет не збережено");
  return result.portraitKey;
}

function buildForm(persId: number, file: Blob): FormData {
  const form = new FormData();
  form.set("persId", String(persId));
  form.set("file", file, "portrait.png");
  return form;
}

async function makePng(): Promise<Blob> {
  const bytes = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#aa5522" } }).png().toBuffer();
  return new Blob([new Uint8Array(bytes)], { type: "image/png" });
}

async function signIn(label: string) {
  const user = await prisma.user.create({ data: { email: `portrait-${label}-${Math.random()}@holota.family`, name: label } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
  return user;
}

async function createPers(): Promise<number> {
  const user = await signIn("owner");
  const [cls, race, background] = await Promise.all([
    prisma.class.findFirstOrThrow({ where: { name: "WIZARD_2014" } }),
    prisma.race.findFirstOrThrow({ where: { name: "HUMAN_2014" } }),
    prisma.background.findFirstOrThrow({ where: { name: "SAGE", ruleset: "RULES_2014" } }),
  ]);
  const pers = await prisma.pers.create({
    data: {
      userId: user.id, name: "Маг", ruleset: "RULES_2014", classId: cls.classId, raceId: race.raceId, backgroundId: background.backgroundId,
      level: 1, currentHp: 6, maxHp: 6, str: 8, dex: 14, con: 12, int: 16, wis: 12, cha: 10,
    },
  });
  return pers.persId;
}
