import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getAllCreatures } from "@/lib/bestiaryData";
import { findAvailableForms } from "@/rules/wildshape";
import { prisma } from "@/lib/prisma";
import {
  attachForm,
  detachForm,
  enterBeastForm,
  findActiveForm,
  findAttachedForms,
  findWildshapeStanding,
  leaveBeastForm,
  setBeastHitPoints,
} from "@/server/db/wildshape";
import { disconnectDatabase, resetUserData } from "../user-data";

/// KR22.2. Прикріплена форма — перше посилання даних користувача на істоту, і воно свідомо йде
/// ключем, а не зовнішнім ключем (Р25). Головне, що тут треба довести: істота, яка випала з
/// каталогу, не забирає з собою рядок персонажа — вона просто стає недоступною формою.

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function createDruid() {
  const [druidClass, race, background] = await Promise.all([
    prisma.class.findFirstOrThrow({ where: { ruleset: "RULES_2014" } }),
    prisma.race.findFirstOrThrow({ where: { ruleset: "RULES_2014" } }),
    prisma.background.findFirstOrThrow({ where: { ruleset: "RULES_2014" } }),
  ]);

  const user = await prisma.user.create({
    data: { email: "wildshape@example.test", name: "Тестовий гравець" },
  });

  return prisma.pers.create({
    data: {
      userId: user.id,
      name: "Друїд із формами",
      ruleset: "RULES_2014",
      classId: druidClass.classId,
      raceId: race.raceId,
      backgroundId: background.backgroundId,
      level: 4,
      currentHp: 27,
      maxHp: 27,
      str: 10,
      dex: 14,
      con: 14,
      int: 12,
      wis: 16,
      cha: 8,
    },
  });
}

/// Справжній друїд, а не «перший-ліпший клас»: рівень друїда й коло вирішують, які форми
/// взагалі пропонуються.
async function createRealDruid(input: { level: number; moonCircle: boolean }) {
  const druidClass = await prisma.class.findFirstOrThrow({ where: { name: "DRUID_2014" } });
  const moonCircle = input.moonCircle
    ? await prisma.subclass.findFirstOrThrow({
        where: { name: "CIRCLE_OF_THE_MOON", classId: druidClass.classId },
      })
    : null;
  const [race, background] = await Promise.all([
    prisma.race.findFirstOrThrow({ where: { ruleset: "RULES_2014" } }),
    prisma.background.findFirstOrThrow({ where: { ruleset: "RULES_2014" } }),
  ]);

  const user = await prisma.user.create({
    data: { email: `druid-${input.level}-${input.moonCircle}@example.test`, name: "Тестовий гравець" },
  });

  return prisma.pers.create({
    data: {
      userId: user.id,
      name: "Справжній друїд",
      ruleset: "RULES_2014",
      classId: druidClass.classId,
      subclassId: moonCircle?.subclassId ?? null,
      raceId: race.raceId,
      backgroundId: background.backgroundId,
      level: input.level,
      currentHp: 20,
      maxHp: 20,
      str: 10,
      dex: 14,
      con: 14,
      int: 12,
      wis: 16,
      cha: 8,
    },
  });
}

function findWolf() {
  return getAllCreatures("RULES_2014").find((c) => c.nameEng === "Wolf");
}

describe("прикріплені форми перевтілення", () => {
  it("каталог 2014 має істоту, на якій тримається решта тесту", () => {
    expect(findWolf()).toBeDefined();
  });

  it("форма прикріплюється і читається зі статблоком", async () => {
    const pers = await createDruid();
    const wolf = findWolf()!;

    await attachForm({ persId: pers.persId, creature: wolf, ruleset: "RULES_2014" });
    const forms = await findAttachedForms(pers.persId);

    expect(forms).toHaveLength(1);
    expect(forms[0].key).toBe("wolf");
    expect(forms[0].creature?.nameEng).toBe("Wolf");
    expect(forms[0].creature?.hp).toBe(wolf.hp);
  });

  it("та сама істота не прикріплюється двічі", async () => {
    const pers = await createDruid();
    const wolf = findWolf()!;

    await attachForm({ persId: pers.persId, creature: wolf, ruleset: "RULES_2014" });
    await attachForm({ persId: pers.persId, creature: wolf, ruleset: "RULES_2014", sortOrder: 5 });

    const forms = await findAttachedForms(pers.persId);
    expect(forms).toHaveLength(1);
    expect(forms[0].sortOrder).toBe(5);
  });

  it("істота, якої немає в каталозі, лишає рядок цілим і віддає форму недоступною", async () => {
    const pers = await createDruid();

    await attachForm({
      persId: pers.persId,
      creature: { nameEng: "Creature That Left The Catalog" },
      ruleset: "RULES_2014",
    });

    const forms = await findAttachedForms(pers.persId);
    expect(forms).toHaveLength(1);
    expect(forms[0].key).toBe("creature-that-left-the-catalog");
    expect(forms[0].creature).toBeNull();
  });

  it("ключ читається в межах своєї редакції", async () => {
    const pers = await createDruid();
    const only2024 = getAllCreatures("RULES_2024").find(
      (candidate) =>
        !getAllCreatures("RULES_2014").some((other) => other.nameEng === candidate.nameEng)
    );
    expect(only2024).toBeDefined();

    await attachForm({ persId: pers.persId, creature: only2024!, ruleset: "RULES_2014" });
    const [wrongEdition] = await findAttachedForms(pers.persId);
    expect(wrongEdition.creature).toBeNull();

    await attachForm({ persId: pers.persId, creature: only2024!, ruleset: "RULES_2024" });
    const forms = await findAttachedForms(pers.persId);
    const rightEdition = forms.find((form) => form.ruleset === "RULES_2024");
    expect(rightEdition?.creature?.nameEng).toBe(only2024!.nameEng);
  });

  it("видалення персонажа забирає його форми, а видалення форми — лише її", async () => {
    const pers = await createDruid();
    const wolf = findWolf()!;

    const attached = await attachForm({
      persId: pers.persId,
      creature: wolf,
      ruleset: "RULES_2014",
    });
    await detachForm(attached.wildshapeId);
    expect(await findAttachedForms(pers.persId)).toHaveLength(0);

    await attachForm({ persId: pers.persId, creature: wolf, ruleset: "RULES_2014" });
    await prisma.pers.delete({ where: { persId: pers.persId } });

    const orphans = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*) AS count FROM public.pers_wildshape WHERE pers_id = ${pers.persId}
    `;
    expect(Number(orphans[0].count)).toBe(0);
  });
});

describe("що каталог пропонує саме цьому персонажу", () => {
  it("друїд 2 рівня без кола дістає межі з таблиці Звіриних форм", async () => {
    const pers = await createRealDruid({ level: 2, moonCircle: false });

    const standing = await findWildshapeStanding(pers.persId);

    expect(standing.druidLevel).toBe(2);
    expect(standing.isMoonCircle).toBe(false);
    expect(standing.limits.maxChallengeRating).toBe(0.25);
    expect(standing.limits.allowsFlySpeed).toBe(false);
  });

  it("друїд кола Місяця 6 рівня дістає ширші межі", async () => {
    const pers = await createRealDruid({ level: 6, moonCircle: true });

    const standing = await findWildshapeStanding(pers.persId);

    expect(standing.isMoonCircle).toBe(true);
    expect(standing.limits.maxChallengeRating).toBe(2);
  });

  /// Каталог фільтрує браузер (KR24.3), тож стик, який тут вартий перевірки, — «межі з бази
  /// годують правило», а не окрема серверна вибірка.
  it("перелік пропонованих форм непорожній і ширший у друїда Місяця", async () => {
    const plain = await createRealDruid({ level: 6, moonCircle: false });
    const moon = await createRealDruid({ level: 6, moonCircle: true });

    const catalog = getAllCreatures("RULES_2014");
    const offeredToPlain = findAvailableForms(catalog, await findWildshapeStanding(plain.persId));
    const offeredToMoon = findAvailableForms(catalog, await findWildshapeStanding(moon.persId));

    expect(offeredToPlain.length).toBeGreaterThan(0);
    expect(offeredToMoon.length).toBeGreaterThan(offeredToPlain.length);
  });

  it("недруїд не дістає жодної форми", async () => {
    const pers = await createDruid();

    const standing = await findWildshapeStanding(pers.persId);

    expect(standing.druidLevel).toBe(0);
    expect(findAvailableForms(getAllCreatures("RULES_2014"), standing)).toHaveLength(0);
  });

  it("прикріплена форма поза межами несе причину з порогом, а не зникає", async () => {
    const pers = await createRealDruid({ level: 2, moonCircle: false });
    const eagle = getAllCreatures("RULES_2014").find((c) => c.nameEng === "Giant Eagle");
    expect(eagle).toBeDefined();

    await attachForm({ persId: pers.persId, creature: eagle!, ruleset: "RULES_2014" });
    const [form] = await findAttachedForms(pers.persId);

    expect(form.creature?.nameEng).toBe("Giant Eagle");
    expect(form.eligibility?.eligible).toBe(false);
    expect(form.eligibility?.reasons.find((reason) => reason.kind === "flySpeedLocked")).toMatchObject({
      unlocksAtLevel: 8,
    });
  });

  /// Рядок обмежень картки їде з сервера готовим — щоб пороги рівнів не зʼявилися ще й у UI.
  it("персонаж везе на лист і межі, і їхнє пояснення", async () => {
    const pers = await createRealDruid({ level: 2, moonCircle: true });

    const standing = await findWildshapeStanding(pers.persId);

    expect(standing.ruleset).toBe("RULES_2014");
    expect(standing.limitNotes).toEqual([
      "КР до 1",
      "політ з 8 рівня",
      "плавання з 4 рівня",
      "лазіння без обмежень",
    ]);
  });
});

describe("вхід у форму, шкода й вихід", () => {
  async function attachBearTo(persId: number) {
    const bear = getAllCreatures("RULES_2014").find((c) => c.nameEng === "Brown Bear")!;
    return attachForm({ persId, creature: bear, ruleset: "RULES_2014" });
  }

  it("вхід у форму ставить хіти звіра на максимум зі статблока", async () => {
    const pers = await createRealDruid({ level: 2, moonCircle: true });
    const form = await attachBearTo(pers.persId);

    await enterBeastForm(form.wildshapeId, 34);
    const active = await findActiveForm(pers.persId);

    expect(active?.wildshapeId).toBe(form.wildshapeId);
    expect(active?.beastCurrentHp).toBe(34);
    expect(active?.beastMaxHp).toBe(34);
  });

  it("активна форма щонайбільше одна — вхід у другу гасить першу", async () => {
    const pers = await createRealDruid({ level: 6, moonCircle: true });
    const bear = await attachBearTo(pers.persId);
    const wolf = await attachForm({
      persId: pers.persId,
      creature: findWolf()!,
      ruleset: "RULES_2014",
    });

    await enterBeastForm(bear.wildshapeId, 34);
    await enterBeastForm(wolf.wildshapeId, 11);

    const active = await findActiveForm(pers.persId);
    expect(active?.wildshapeId).toBe(wolf.wildshapeId);

    const activeRows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*) AS count FROM public.pers_wildshape WHERE pers_id = ${pers.persId} AND is_active
    `;
    expect(Number(activeRows[0].count)).toBe(1);
  });

  it("хіти звіра переживають перезавантаження", async () => {
    const pers = await createRealDruid({ level: 2, moonCircle: true });
    const form = await attachBearTo(pers.persId);

    await enterBeastForm(form.wildshapeId, 34);
    await setBeastHitPoints(form.wildshapeId, 19);

    expect((await findActiveForm(pers.persId))?.beastCurrentHp).toBe(19);
  });

  it("вихід із форми гасить активність і хіти звіра", async () => {
    const pers = await createRealDruid({ level: 2, moonCircle: true });
    const form = await attachBearTo(pers.persId);

    await enterBeastForm(form.wildshapeId, 34);
    await leaveBeastForm(pers.persId);

    expect(await findActiveForm(pers.persId)).toBeNull();
    expect(await findAttachedForms(pers.persId)).toHaveLength(1);
  });
});
