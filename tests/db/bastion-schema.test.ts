import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getBastionFacilityBySlug } from "@/lib/bastionsData";
import { prisma } from "@/lib/prisma";
import {
  addBastionFacility,
  createBastion,
  deleteBastion,
  findBastionForPers,
  removeBastionFacility,
  updateBastionDetails,
  updateBastionFacilityState,
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
    data: { email: `${name}-bastion@example.test`, name: "Тестовий гравець" },
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

function findCatalogFacility(slug: string) {
  const facility = getBastionFacilityBySlug(slug);
  if (!facility) throw new Error(`У каталозі KR19.1 немає приміщення ${slug}`);
  return facility;
}

describe("бастіон персонажа", () => {
  it("створюється, приймає приміщення й читається назад із бази", async () => {
    const pers = await createPers2024("Ельга");

    const bastion = await createBastion({
      persId: pers.persId,
      name: "Стара вежа під Водоглибом",
      description: "Вежа на околиці, дісталася від наставниці",
    });

    await addBastionFacility({
      bastionId: bastion.bastionId,
      facility: findCatalogFacility("bedroom"),
      space: "cramped",
    });
    await addBastionFacility({
      bastionId: bastion.bastionId,
      facility: findCatalogFacility("library"),
      space: "roomy",
    });

    const readBack = await findBastionForPers(pers.persId);

    expect(readBack?.name).toBe("Стара вежа під Водоглибом");
    expect(readBack?.description).toBe("Вежа на околиці, дісталася від наставниці");
    expect(readBack?.facilities.map((facility) => facility.facilitySlug)).toEqual([
      "bedroom",
      "library",
    ]);
    expect(readBack?.facilities[0]).toMatchObject({
      space: "CRAMPED",
      currentOrder: null,
      defenders: 0,
      hirelings: "",
      notes: "",
    });
    expect(readBack?.facilities[1].space).toBe("ROOMY");
  });

  it("персонаж без бастіону не має рядка, а не порожній бастіон", async () => {
    const pers = await createPers2024("Тор");

    expect(await findBastionForPers(pers.persId)).toBeNull();
  });

  it("бастіон один на персонажа", async () => {
    const pers = await createPers2024("Ліна");
    await createBastion({ persId: pers.persId, name: "Перший" });

    await expect(createBastion({ persId: pers.persId, name: "Другий" })).rejects.toThrow();
  });

  it("назва, антураж і нотатки редагуються", async () => {
    const pers = await createPers2024("Мирон");
    const bastion = await createBastion({ persId: pers.persId, name: "Без назви" });

    await updateBastionDetails({
      bastionId: bastion.bastionId,
      name: "Корчма «Три келихи»",
      description: "Корчма при дорозі",
      notes: "Наступного ходу — Торгівля",
    });

    const readBack = await findBastionForPers(pers.persId);
    expect(readBack).toMatchObject({
      name: "Корчма «Три келихи»",
      description: "Корчма при дорозі",
      notes: "Наступного ходу — Торгівля",
    });
  });

  it("бастіон видаляється разом зі своїми приміщеннями", async () => {
    const pers = await createPers2024("Всеволод");
    const bastion = await createBastion({ persId: pers.persId, name: "Тимчасовий" });
    await addBastionFacility({
      bastionId: bastion.bastionId,
      facility: findCatalogFacility("kitchen"),
      space: "roomy",
    });

    await deleteBastion(bastion.bastionId);

    const [{ count }] = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*) FROM public.pers_bastion_facility
    `;
    expect(await findBastionForPers(pers.persId)).toBeNull();
    expect(Number(count)).toBe(0);
  });

  it("приміщення прибирається поштучно", async () => {
    const pers = await createPers2024("Зоряна");
    const bastion = await createBastion({ persId: pers.persId, name: "Святилище" });
    const [kept, removed] = [
      await addBastionFacility({
        bastionId: bastion.bastionId,
        facility: findCatalogFacility("sanctuary"),
        space: "roomy",
      }),
      await addBastionFacility({
        bastionId: bastion.bastionId,
        facility: findCatalogFacility("storage"),
        space: "cramped",
      }),
    ];

    await removeBastionFacility(removed.facilityId);

    const readBack = await findBastionForPers(pers.persId);
    expect(readBack?.facilities.map((facility) => facility.facilityId)).toEqual([kept.facilityId]);
  });

  it("однакових приміщень може бути кілька, і розмір у кожного свій", async () => {
    const pers = await createPers2024("Бран");
    const bastion = await createBastion({ persId: pers.persId, name: "Форт" });
    const barrack = findCatalogFacility("barrack");

    await addBastionFacility({ bastionId: bastion.bastionId, facility: barrack, space: "roomy" });
    await addBastionFacility({ bastionId: bastion.bastionId, facility: barrack, space: "vast" });

    const readBack = await findBastionForPers(pers.persId);
    expect(readBack?.facilities.map((facility) => facility.space)).toEqual(["ROOMY", "VAST"]);
  });

  it("чужий бастіон не видно й видалення персонажа його не чіпає", async () => {
    const [own, other] = await Promise.all([createPers2024("Своя"), createPers2024("Чужий")]);
    await createBastion({ persId: own.persId, name: "Свій бастіон" });
    await createBastion({ persId: other.persId, name: "Чужий бастіон" });

    await prisma.pers.delete({ where: { persId: own.persId } });

    expect(await findBastionForPers(own.persId)).toBeNull();
    expect((await findBastionForPers(other.persId))?.name).toBe("Чужий бастіон");
  });
});

describe("стан приміщення — колонки під KR19.4", () => {
  it("наказ, захисники й найманці зберігаються та читаються назад", async () => {
    const pers = await createPers2024("Рагнар");
    const bastion = await createBastion({ persId: pers.persId, name: "Кузня" });
    const facility = await addBastionFacility({
      bastionId: bastion.bastionId,
      facility: findCatalogFacility("smithy"),
      space: "roomy",
    });

    await prisma.$executeRaw`
      UPDATE public.pers_bastion_facility
         SET current_order = ${"CRAFT"}::public."BastionOrder",
             defenders = 4,
             hirelings = ${"Коваль Остап"},
             notes = ${"Кує лати"}
       WHERE pers_bastion_facility_id = ${facility.facilityId}
    `;

    const readBack = await findBastionForPers(pers.persId);
    expect(readBack?.facilities[0]).toMatchObject({
      currentOrder: "CRAFT",
      defenders: 4,
      hirelings: "Коваль Остап",
      notes: "Кує лати",
    });
  });

  it("updateBastionFacilityState зберігає й читає назад через Prisma, а не сирим SQL", async () => {
    const pers = await createPers2024("Освальд");
    const bastion = await createBastion({ persId: pers.persId, name: "Форт" });
    const facility = await addBastionFacility({
      bastionId: bastion.bastionId,
      facility: findCatalogFacility("smithy"),
      space: "roomy",
    });

    await updateBastionFacilityState({
      facilityId: facility.facilityId,
      currentOrder: "CRAFT",
      defenders: 5,
      hirelings: "Коваль Остап",
      notes: "Кує лати",
    });

    const readBack = await findBastionForPers(pers.persId);
    expect(readBack?.facilities[0]).toMatchObject({
      currentOrder: "CRAFT",
      defenders: 5,
      hirelings: "Коваль Остап",
      notes: "Кує лати",
    });
  });

  it("наказ можна зняти назад у null", async () => {
    const pers = await createPers2024("Інгрід");
    const bastion = await createBastion({ persId: pers.persId, name: "Кузня" });
    const facility = await addBastionFacility({
      bastionId: bastion.bastionId,
      facility: findCatalogFacility("smithy"),
      space: "roomy",
    });
    await updateBastionFacilityState({
      facilityId: facility.facilityId,
      currentOrder: "CRAFT",
      defenders: 0,
      hirelings: "",
      notes: "",
    });
    expect((await findBastionForPers(pers.persId))?.facilities[0].currentOrder).toBe("CRAFT");

    await updateBastionFacilityState({
      facilityId: facility.facilityId,
      currentOrder: null,
      defenders: 0,
      hirelings: "",
      notes: "",
    });

    const readBack = await findBastionForPers(pers.persId);
    expect(readBack?.facilities[0].currentOrder).toBeNull();
  });

  it("відʼємних захисників база не приймає", async () => {
    const pers = await createPers2024("Хома");
    const bastion = await createBastion({ persId: pers.persId, name: "Казарма" });
    const facility = await addBastionFacility({
      bastionId: bastion.bastionId,
      facility: findCatalogFacility("barrack"),
      space: "roomy",
    });

    await expect(
      prisma.$executeRaw`
        UPDATE public.pers_bastion_facility SET defenders = -1
         WHERE pers_bastion_facility_id = ${facility.facilityId}
      `
    ).rejects.toThrow();
  });
});
