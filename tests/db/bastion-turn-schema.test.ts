import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  addBastionTurn,
  createBastion,
  deleteBastion,
  findBastionForPers,
  findBastionTurns,
  removeBastionTurn,
  updateBastionTurn,
} from "@/server/db/bastions";
import { disconnectDatabase, resetUserData } from "../user-data";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function createPers2024(name: string, level = 5) {
  const [class2024, race2024, background2024] = await Promise.all([
    prisma.class.findFirstOrThrow({ where: { ruleset: "RULES_2024" } }),
    prisma.race.findFirstOrThrow({ where: { ruleset: "RULES_2024" } }),
    prisma.background.findFirstOrThrow({ where: { ruleset: "RULES_2024" } }),
  ]);

  const user = await prisma.user.create({
    data: { email: `${name}-bastion-turn@example.test`, name: "Тестовий гравець" },
  });

  return prisma.pers.create({
    data: {
      userId: user.id,
      name,
      ruleset: "RULES_2024",
      classId: class2024.classId,
      raceId: race2024.raceId,
      backgroundId: background2024.backgroundId,
      level,
      currentHp: 38,
      maxHp: 38,
      str: 16,
      dex: 14,
      con: 14,
      int: 10,
      wis: 12,
      cha: 8,
    },
  });
}

async function createBastionFor(name: string) {
  const pers = await createPers2024(name);
  const bastion = await createBastion({ persId: pers.persId, name: `Бастіон ${name}` });

  return { pers, bastion };
}

describe("журнал ходів бастіону — таблиця pers_bastion_turn", () => {
  it("запис створюється, читається назад і несе дату створення", async () => {
    const { pers, bastion } = await createBastionFor("Ельга");

    const added = await addBastionTurn({
      bastionId: bastion.bastionId,
      turnNumber: 4,
      entry: "Бібліотека дослідила руїни, кузня закінчила лати",
    });

    expect(added).toMatchObject({
      bastionId: bastion.bastionId,
      turnNumber: 4,
      entry: "Бібліотека дослідила руїни, кузня закінчила лати",
    });
    expect(added.createdAt).toBeInstanceOf(Date);

    const readBack = await findBastionForPers(pers.persId);
    expect(readBack?.turns).toEqual([added]);
  });

  it("записи читаються за номером ходу, а не за порядком внесення", async () => {
    const { bastion } = await createBastionFor("Мирон");

    await addBastionTurn({ bastionId: bastion.bastionId, turnNumber: 7, entry: "Сьомий" });
    await addBastionTurn({ bastionId: bastion.bastionId, turnNumber: 2, entry: "Другий" });
    await addBastionTurn({ bastionId: bastion.bastionId, turnNumber: 5, entry: "Пʼятий" });

    const turns = await findBastionTurns(bastion.bastionId);
    expect(turns.map((turn) => turn.turnNumber)).toEqual([2, 5, 7]);
  });

  it("запис редагується — і номер, і текст", async () => {
    const { bastion } = await createBastionFor("Ліна");
    const added = await addBastionTurn({
      bastionId: bastion.bastionId,
      turnNumber: 3,
      entry: "Чернетка",
    });

    await updateBastionTurn({ turnId: added.turnId, turnNumber: 4, entry: "Кузня закінчила лати" });

    const turns = await findBastionTurns(bastion.bastionId);
    expect(turns).toHaveLength(1);
    expect(turns[0]).toMatchObject({
      turnId: added.turnId,
      turnNumber: 4,
      entry: "Кузня закінчила лати",
    });
    expect(turns[0].createdAt).toEqual(added.createdAt);
  });

  it("запис видаляється поштучно, сусідній лишається", async () => {
    const { bastion } = await createBastionFor("Зоряна");
    const [kept, removed] = [
      await addBastionTurn({ bastionId: bastion.bastionId, turnNumber: 1, entry: "Перший" }),
      await addBastionTurn({ bastionId: bastion.bastionId, turnNumber: 2, entry: "Другий" }),
    ];

    await removeBastionTurn(removed.turnId);

    const turns = await findBastionTurns(bastion.bastionId);
    expect(turns.map((turn) => turn.turnId)).toEqual([kept.turnId]);
  });

  it("двом записам можна дати один номер ходу — унікальності немає свідомо (Р26)", async () => {
    const { bastion } = await createBastionFor("Бран");

    await addBastionTurn({ bastionId: bastion.bastionId, turnNumber: 3, entry: "Ранок" });
    await addBastionTurn({ bastionId: bastion.bastionId, turnNumber: 3, entry: "Вечір" });

    const turns = await findBastionTurns(bastion.bastionId);
    expect(turns.map((turn) => turn.entry)).toEqual(["Ранок", "Вечір"]);
  });

  it("нульового й відʼємного номера ходу база не приймає", async () => {
    const { bastion } = await createBastionFor("Хома");

    await expect(
      addBastionTurn({ bastionId: bastion.bastionId, turnNumber: 0, entry: "Нульовий" })
    ).rejects.toThrow();
    await expect(
      prisma.$executeRaw`
        INSERT INTO public.pers_bastion_turn (pers_bastion_id, turn_number, entry)
        VALUES (${bastion.bastionId}, -1, ${"Відʼємний"})
      `
    ).rejects.toThrow();
  });

  it("бастіон видаляється разом зі своїм журналом", async () => {
    const { pers, bastion } = await createBastionFor("Всеволод");
    await addBastionTurn({ bastionId: bastion.bastionId, turnNumber: 1, entry: "Перший хід" });

    await deleteBastion(bastion.bastionId);

    const [{ count }] = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*) FROM public.pers_bastion_turn
    `;
    expect(await findBastionForPers(pers.persId)).toBeNull();
    expect(Number(count)).toBe(0);
  });

  it("чужий журнал не видно й видалення персонажа його не чіпає", async () => {
    const [own, other] = [await createBastionFor("Своя"), await createBastionFor("Чужий")];
    await addBastionTurn({ bastionId: own.bastion.bastionId, turnNumber: 1, entry: "Свій запис" });
    await addBastionTurn({
      bastionId: other.bastion.bastionId,
      turnNumber: 1,
      entry: "Чужий запис",
    });

    await prisma.pers.delete({ where: { persId: own.pers.persId } });

    expect(await findBastionForPers(own.pers.persId)).toBeNull();
    expect((await findBastionForPers(other.pers.persId))?.turns.map((turn) => turn.entry)).toEqual([
      "Чужий запис",
    ]);
  });
});
