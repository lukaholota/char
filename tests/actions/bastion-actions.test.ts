import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Ruleset } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createBastionForPers,
  loadBastion,
  removeBastion,
  saveBastionDetails,
} from "@/lib/actions/bastion-actions";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function createPlayerWithPers(input: { email: string; ruleset: Ruleset; level: number }) {
  const [characterClass, race, background] = await Promise.all([
    prisma.class.findFirstOrThrow({ where: { ruleset: input.ruleset } }),
    prisma.race.findFirstOrThrow({ where: { ruleset: input.ruleset } }),
    prisma.background.findFirstOrThrow({ where: { ruleset: input.ruleset } }),
  ]);

  const user = await prisma.user.create({
    data: { email: input.email, name: "Тестовий гравець" },
  });

  const pers = await prisma.pers.create({
    data: {
      userId: user.id,
      name: "Персонаж із бастіоном",
      ruleset: input.ruleset,
      classId: characterClass.classId,
      raceId: race.raceId,
      backgroundId: background.backgroundId,
      level: input.level,
      currentHp: 30,
      maxHp: 30,
      str: 14,
      dex: 12,
      con: 14,
      int: 10,
      wis: 12,
      cha: 10,
    },
  });

  return { user, pers };
}

function signInAs(email: string) {
  vi.mocked(auth).mockResolvedValue({ user: { email } } as never);
}

describe("серверні дії бастіону", () => {
  it("персонаж 2014 бастіону не бачить і створити його не може", async () => {
    const { user, pers } = await createPlayerWithPers({
      email: "bastion-2014@example.test",
      ruleset: "RULES_2014",
      level: 12,
    });
    signInAs(user.email!);

    const loaded = await loadBastion(pers.persId);
    if (!loaded.ok) throw new Error(loaded.error);
    expect(loaded.standing.access.isOffered).toBe(false);
    expect(loaded.standing.access.isEntryCardShown).toBe(false);

    await expect(
      createBastionForPers({ persId: pers.persId, name: "Замок не за правилами" })
    ).resolves.toEqual({ ok: false, error: "Бастіони — механіка правил 2024" });
    await expect(prisma.persBastion.count()).resolves.toBe(0);
  });

  it("персонаж 2024 четвертого рівня бастіон бачить, створює й дістає попередження", async () => {
    const { user, pers } = await createPlayerWithPers({
      email: "bastion-level-4@example.test",
      ruleset: "RULES_2024",
      level: 4,
    });
    signInAs(user.email!);

    const before = await loadBastion(pers.persId);
    if (!before.ok) throw new Error(before.error);
    expect(before.standing.access).toMatchObject({
      isOffered: true,
      isBelowStandardLevel: true,
      isEntryCardShown: true,
      isEntryCardMuted: true,
    });
    expect(before.standing.bastion).toBeNull();

    const created = await createBastionForPers({
      persId: pers.persId,
      name: "  Стара вежа під Водоглибом  ",
      description: "Вежа на околиці",
    });
    if (!created.ok) throw new Error(created.error);

    expect(created.standing.bastion).toMatchObject({
      name: "Стара вежа під Водоглибом",
      description: "Вежа на околиці",
      facilities: [],
    });
    expect(created.standing.access).toMatchObject({
      isBelowStandardLevel: true,
      isEntryCardShown: true,
      isEntryCardMuted: false,
    });
  });

  it("порожню назву не приймає", async () => {
    const { user, pers } = await createPlayerWithPers({
      email: "bastion-blank-name@example.test",
      ruleset: "RULES_2024",
      level: 7,
    });
    signInAs(user.email!);

    await expect(createBastionForPers({ persId: pers.persId, name: "   " })).resolves.toEqual({
      ok: false,
      error: "Назва бастіону не може бути порожньою",
    });
    await expect(prisma.persBastion.count()).resolves.toBe(0);
  });

  it("назва, антураж і нотатки редагуються, бастіон видаляється", async () => {
    const { user, pers } = await createPlayerWithPers({
      email: "bastion-edit@example.test",
      ruleset: "RULES_2024",
      level: 9,
    });
    signInAs(user.email!);
    await createBastionForPers({ persId: pers.persId, name: "Без назви" });

    const saved = await saveBastionDetails({
      persId: pers.persId,
      name: "Корчма «Три келихи»",
      description: "Корчма при дорозі",
      notes: "Наступного ходу — Торгівля",
    });
    if (!saved.ok) throw new Error(saved.error);
    expect(saved.standing.bastion).toMatchObject({
      name: "Корчма «Три келихи»",
      description: "Корчма при дорозі",
      notes: "Наступного ходу — Торгівля",
    });

    await expect(removeBastion(pers.persId)).resolves.toEqual({ ok: true });
    await expect(prisma.persBastion.count()).resolves.toBe(0);
  });

  it("чужого бастіону не віддає й не дає його ні змінити, ні видалити", async () => {
    const [own, other] = await Promise.all([
      createPlayerWithPers({ email: "bastion-own@example.test", ruleset: "RULES_2024", level: 6 }),
      createPlayerWithPers({ email: "bastion-other@example.test", ruleset: "RULES_2024", level: 6 }),
    ]);

    signInAs(other.user.email!);
    await createBastionForPers({ persId: other.pers.persId, name: "Чужий бастіон" });

    signInAs(own.user.email!);
    const noAccess = { ok: false, error: "Немає доступу до персонажа" };
    await expect(loadBastion(other.pers.persId)).resolves.toEqual(noAccess);
    await expect(
      saveBastionDetails({
        persId: other.pers.persId,
        name: "Захоплено",
        description: "",
        notes: "",
      })
    ).resolves.toEqual(noAccess);
    await expect(removeBastion(other.pers.persId)).resolves.toEqual(noAccess);

    const survived = await prisma.persBastion.findUniqueOrThrow({
      where: { persId: other.pers.persId },
    });
    expect(survived.name).toBe("Чужий бастіон");
  });
});
