import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { signInAs } from "../helpers/signed-in-users";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
vi.mock("@/server/pdf/creaturesPdf", () => ({ generateCreaturesPdfBytes: vi.fn(buildOnePagePdf) }));

import { auth } from "@/lib/auth";
import { getPersById, renamePers } from "@/server/db/pers-actions";
import {
  acceptPersEditShareToken,
  ensurePersShareLinks,
  getPersByShareToken,
} from "@/server/db/share-actions";
import { attachWildshapeForm } from "@/server/db/wildshape-actions";
import { buildVisiblePersFilter } from "@/server/db/pers-access-filters";
import { findPrintableWildshapeCountAction, generateCharacterPdfAction } from "@/app/char/[id]/print/actions";
import {
  findPrintableWildshapeCountByTokenAction,
  generateCharacterPdfByTokenAction,
} from "@/app/char/share/[token]/print/actions";
import { generateCreaturesPdfBytes } from "@/server/pdf/creaturesPdf";

vi.setConfig({ testTimeout: 60_000 });

async function buildOnePagePdf(): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.addPage();
  return document.save();
}

beforeEach(async () => {
  await resetUserData();
  vi.mocked(generateCreaturesPdfBytes).mockClear();
});
afterAll(disconnectDatabase);

async function createPers2014(userId: number, className: "DRUID_2014" | "FIGHTER_2014", name: string) {
  const [cls, race, background] = await Promise.all([
    classByName(className),
    raceByName("HUMAN_2014"),
    backgroundByName("ACOLYTE"),
  ]);
  return prisma.pers.create({
    data: {
      userId,
      name,
      ruleset: "RULES_2014",
      classId: cls.classId,
      raceId: race.raceId,
      backgroundId: background.backgroundId,
      level: 2,
      currentHp: 15,
      maxHp: 15,
      str: 10, dex: 12, con: 14, int: 10, wis: 16, cha: 10,
    },
  });
}

function requireLinks(result: Awaited<ReturnType<typeof ensurePersShareLinks>>) {
  if (!result.success) throw new Error(result.error);
  return result;
}

function signOut() {
  vi.mocked(auth).mockResolvedValue(null as never);
}

describe("поділитися персонажем", () => {
  it("власник отримує обидва посилання, і повторне відкриття не ламає вже надіслані", async () => {
    const owner = await signInAs("share-owner");
    const pers = await createPers2014(owner.id, "FIGHTER_2014", "Воїн");

    const first = requireLinks(await ensurePersShareLinks(pers.persId));
    const second = requireLinks(await ensurePersShareLinks(pers.persId));

    expect(second.viewToken).toBe(first.viewToken);
    expect(second.editToken).toBe(first.editToken);
    expect(first.viewToken).not.toBe(first.editToken);
    expect((await getPersByShareToken(first.viewToken)).canEdit).toBe(false);
    expect((await getPersByShareToken(first.editToken)).canEdit).toBe(true);
  });

  it("зберігає посилання для перегляду, створене раніше", async () => {
    const owner = await signInAs("share-owner-legacy");
    const pers = await createPers2014(owner.id, "FIGHTER_2014", "Воїн");
    await prisma.pers.update({ where: { persId: pers.persId }, data: { shareToken: "already-sent-to-friends" } });

    const links = requireLinks(await ensurePersShareLinks(pers.persId));

    expect(links.viewToken).toBe("already-sent-to-friends");
  });

  it("ДМ за посиланням на редагування змінює персонажа, і власник бачить зміну", async () => {
    const owner = await signInAs("share-owner-dm");
    const pers = await createPers2014(owner.id, "FIGHTER_2014", "Воїн");
    const links = requireLinks(await ensurePersShareLinks(pers.persId));

    const dm = await signInAs("share-dm");
    expect(await renamePers(pers.persId, "Чужа правка")).toMatchObject({ success: false });
    expect(await acceptPersEditShareToken(links.editToken)).toEqual({ success: true, persId: pers.persId });
    expect(await renamePers(pers.persId, "Воїн після сесії")).toEqual({ success: true });
    const dmList = await prisma.pers.findMany({ where: buildVisiblePersFilter(dm.id), select: { persId: true } });
    expect(dmList.map((row) => row.persId)).toContain(pers.persId);

    await signInAs("share-owner-dm");
    expect((await getPersById(pers.persId))?.name).toBe("Воїн після сесії");
  });

  it("посилання для перегляду не дає прав на редагування", async () => {
    const owner = await signInAs("share-owner-view");
    const pers = await createPers2014(owner.id, "FIGHTER_2014", "Воїн");
    const links = requireLinks(await ensurePersShareLinks(pers.persId));

    await signInAs("share-viewer");
    expect(await acceptPersEditShareToken(links.viewToken)).toEqual({ error: "Посилання недійсне" });
    expect(await renamePers(pers.persId, "Чужа правка")).toMatchObject({ success: false });
  });

  it("без входу посилання на редагування просить увійти", async () => {
    const owner = await signInAs("share-owner-anon");
    const pers = await createPers2014(owner.id, "FIGHTER_2014", "Воїн");
    const links = requireLinks(await ensurePersShareLinks(pers.persId));

    signOut();
    expect(await acceptPersEditShareToken(links.editToken)).toMatchObject({ needsSignIn: true });
    expect(await ensurePersShareLinks(pers.persId)).toEqual({ success: false, error: "Увійдіть, щоб поділитися персонажем" });
  });

  it("співредактор не може ділитися чужим персонажем", async () => {
    const owner = await signInAs("share-owner-coeditor");
    const pers = await createPers2014(owner.id, "FIGHTER_2014", "Воїн");
    const links = requireLinks(await ensurePersShareLinks(pers.persId));

    await signInAs("share-coeditor");
    await acceptPersEditShareToken(links.editToken);

    expect(await ensurePersShareLinks(pers.persId)).toEqual({ success: false, error: "Поділитися може лише власник персонажа" });
  });
});

describe("друк Диких форм", () => {
  it("друїд друкує прикріплену форму зі свого листа і за посиланням", async () => {
    const owner = await signInAs("print-druid");
    const druid = await createPers2014(owner.id, "DRUID_2014", "Друїд");
    expect(await attachWildshapeForm({ persId: druid.persId, creatureKey: "wolf", ruleset: "RULES_2014" })).toMatchObject({ ok: true });
    const links = requireLinks(await ensurePersShareLinks(druid.persId));

    expect(await findPrintableWildshapeCountAction(druid.persId)).toBe(1);
    expect(await findPrintableWildshapeCountByTokenAction(links.viewToken)).toBe(1);

    await generateCharacterPdfAction(druid.persId, { sections: ["WILDSHAPES"] });
    await generateCharacterPdfByTokenAction(links.viewToken, { sections: ["WILDSHAPES"] });

    const printedNames = vi.mocked(generateCreaturesPdfBytes).mock.calls.map(([creatures]) => creatures.map((c) => c.nameEng));
    expect(printedNames).toEqual([["Wolf"], ["Wolf"]]);
  });

  it("недруїд не може прикріпити форму, тож пункту друку в нього немає", async () => {
    const owner = await signInAs("print-fighter");
    const fighter = await createPers2014(owner.id, "FIGHTER_2014", "Воїн");

    expect(await attachWildshapeForm({ persId: fighter.persId, creatureKey: "wolf", ruleset: "RULES_2014" })).toEqual({
      ok: false,
      error: "Персонаж не має Дикої форми",
    });
    expect(await findPrintableWildshapeCountAction(fighter.persId)).toBe(0);
  });
});
