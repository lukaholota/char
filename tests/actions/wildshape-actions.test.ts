import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Ruleset } from "@prisma/client";
import { getAllCreatures } from "@/lib/bestiaryData";
import { prisma } from "@/lib/prisma";
import {
  attachWildshapeForm,
  damageBeastForm,
  enterWildshapeForm,
  leaveWildshapeForm,
  loadWildshapeCharacters,
  loadWildshapeForms,
  loadWildshapePicker,
} from "@/server/db/wildshape-actions";
import { restoreFeatureUse, spendFeatureUse } from "@/server/db/feature-uses";
import { findWildshapeUses } from "@/server/db/wildshape-uses";
import { backgroundByName, classByName, raceByName, subclassByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";

/// KR24.3. Пікер форм переїхав у бестіарій, тобто перелік тепер рахує браузер. Це бʼє повз UI і
/// перевіряє те, чого переїзд не сміє зачепити: **суддя лишається на сервері**. Прикріпити можна
/// що завгодно з попередженням ([Р-3]), але вхід у форму поза межами таблиці Звіриних форм
/// сервер відхиляє — і причиною, а не мовчанням.

beforeEach(resetUserData);
afterAll(disconnectDatabase);

function signInAs(email: string) {
  vi.mocked(auth).mockResolvedValue({ user: { email } } as never);
}

async function createDruid(input: {
  email: string;
  level: number;
  moonCircle: boolean;
  ruleset?: Ruleset;
}) {
  const ruleset = input.ruleset ?? "RULES_2014";
  const [druidClass, race, background] = await Promise.all([
    classByName(ruleset === "RULES_2024" ? "DRUID_2024" : "DRUID_2014"),
    raceByName("HUMAN_2014"),
    backgroundByName("ACOLYTE"),
  ]);
  /// Ключ підкласу в базі однаковий для обох редакцій — розводить їх `classId` (KR24.6).
  const moonCircle = input.moonCircle
    ? await subclassByName(druidClass.classId, "CIRCLE_OF_THE_MOON")
    : null;

  const user = await prisma.user.create({ data: { email: input.email, name: "Тестовий гравець" } });
  const pers = await prisma.pers.create({
    data: {
      userId: user.id,
      name: "Друїд із бестіарію",
      ruleset,
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

  return { user, pers };
}

const eagleKey = () => getAllCreatures("RULES_2014").find((c) => c.nameEng === "Giant Eagle")!.nameEng;
const bearKey = () => getAllCreatures("RULES_2014").find((c) => c.nameEng === "Brown Bear")!.nameEng;

describe("сервер лишається суддею після переїзду пікера в бестіарій", () => {
  it("непридатна форма прикріплюється з попередженням, яке називає причину", async () => {
    const { user, pers } = await createDruid({
      email: "wildshape-picker-warn@example.test",
      level: 6,
      moonCircle: true,
    });
    signInAs(user.email!);

    const attached = await attachWildshapeForm({
      persId: pers.persId,
      creatureKey: eagleKey(),
      ruleset: "RULES_2014",
    });
    if (!attached.ok) throw new Error(attached.error);

    expect(attached.warnings).toEqual(["Швидкість польоту відкривається з 8 рівня друїда"]);
    expect(attached.form.eligibility?.eligible).toBe(false);
  });

  it("вхід у непридатну форму сервер відхиляє — і саме тією причиною", async () => {
    const { user, pers } = await createDruid({
      email: "wildshape-picker-refuse@example.test",
      level: 6,
      moonCircle: true,
    });
    signInAs(user.email!);

    const attached = await attachWildshapeForm({
      persId: pers.persId,
      creatureKey: eagleKey(),
      ruleset: "RULES_2014",
    });
    if (!attached.ok) throw new Error(attached.error);

    await expect(
      enterWildshapeForm({ persId: pers.persId, wildshapeId: attached.form.wildshapeId })
    ).resolves.toEqual({
      ok: false,
      error: "Швидкість польоту відкривається з 8 рівня друїда",
    });

    const active = await prisma.persWildshape.count({
      where: { persId: pers.persId, isActive: true },
    });
    expect(active).toBe(0);
  });

  it("придатна форма входу не блокує", async () => {
    const { user, pers } = await createDruid({
      email: "wildshape-picker-allow@example.test",
      level: 6,
      moonCircle: true,
    });
    signInAs(user.email!);

    const attached = await attachWildshapeForm({
      persId: pers.persId,
      creatureKey: bearKey(),
      ruleset: "RULES_2014",
    });
    if (!attached.ok) throw new Error(attached.error);

    const entered = await enterWildshapeForm({
      persId: pers.persId,
      wildshapeId: attached.form.wildshapeId,
    });
    if (!entered.ok) throw new Error(entered.error);

    expect(entered.active.creature?.nameEng).toBe("Brown Bear");
  });

  it("істоти не з каталогу сервер не приймає навіть із листа персонажа", async () => {
    const { user, pers } = await createDruid({
      email: "wildshape-picker-unknown@example.test",
      level: 6,
      moonCircle: true,
    });
    signInAs(user.email!);

    await expect(
      attachWildshapeForm({
        persId: pers.persId,
        creatureKey: "creature-that-never-existed",
        ruleset: "RULES_2014",
      })
    ).resolves.toEqual({ ok: false, error: "Такої істоти немає в каталозі" });
  });
});

describe("контекст фільтра бестіарію", () => {
  it("персонаж приносить свої межі й уже прикріплені форми", async () => {
    const { user, pers } = await createDruid({
      email: "wildshape-picker-context@example.test",
      level: 2,
      moonCircle: true,
    });
    signInAs(user.email!);

    await attachWildshapeForm({ persId: pers.persId, creatureKey: bearKey(), ruleset: "RULES_2014" });
    const picker = await loadWildshapePicker(pers.persId);
    if (!picker.ok) throw new Error(picker.error);

    expect(picker.standing).toMatchObject({ druidLevel: 2, isMoonCircle: true, ruleset: "RULES_2014" });
    expect(picker.attachedKeys).toEqual(["brown-bear"]);
  });

  it("чужого персонажа в контекст узяти не можна", async () => {
    const owner = await createDruid({
      email: "wildshape-picker-owner@example.test",
      level: 6,
      moonCircle: true,
    });
    const stranger = await createDruid({
      email: "wildshape-picker-stranger@example.test",
      level: 6,
      moonCircle: true,
    });
    signInAs(stranger.user.email!);

    await expect(loadWildshapePicker(owner.pers.persId)).resolves.toEqual({
      ok: false,
      error: "Немає доступу до персонажа",
    });
  });

  it("у списку контекстів лише персонажі з Дикою формою, і лише свої", async () => {
    const { user, pers } = await createDruid({
      email: "wildshape-picker-list@example.test",
      level: 4,
      moonCircle: false,
    });
    const [fighterClass, race, background] = await Promise.all([
      classByName("FIGHTER_2014"),
      raceByName("HUMAN_2014"),
      backgroundByName("ACOLYTE"),
    ]);
    await prisma.pers.create({
      data: {
        userId: user.id,
        name: "Воїн без форм",
        ruleset: "RULES_2014",
        classId: fighterClass.classId,
        raceId: race.raceId,
        backgroundId: background.backgroundId,
        level: 8,
        currentHp: 60,
        maxHp: 60,
        str: 16,
        dex: 12,
        con: 14,
        int: 10,
        wis: 10,
        cha: 10,
      },
    });
    await createDruid({
      email: "wildshape-picker-other-player@example.test",
      level: 8,
      moonCircle: true,
    });
    signInAs(user.email!);

    const characters = await loadWildshapeCharacters();

    expect(characters.map((character) => character.persId)).toEqual([pers.persId]);
    expect(characters[0]).toMatchObject({ druidLevel: 4, isMoonCircle: false });
    expect(characters[0].limitNotes).toContain("лазіння без обмежень");
  });

  /// Не «порожня база віддає порожньо»: у ній лежить чужий друїд, і гість не сміє його побачити.
  it("неавторизований гість не дістає чужих персонажів", async () => {
    await createDruid({
      email: "wildshape-picker-someone-else@example.test",
      level: 8,
      moonCircle: true,
    });
    vi.mocked(auth).mockResolvedValue(null as never);

    await expect(loadWildshapeCharacters()).resolves.toEqual([]);
  });
});

/// KR24.4. Другий шар малює падіння форми як подію на екрані, і числа для неї бере звідси —
/// не з власних припущень браузера. Тому дія мусить повернути і надлишок, і те, у що
/// перетворилися власні хіти.
describe("падіння форми як подія, а не тиха зміна числа", () => {
  async function bearFormOf(input: { email: string; level: number }) {
    const { user, pers } = await createDruid({ ...input, moonCircle: true });
    signInAs(user.email!);

    const attached = await attachWildshapeForm({
      persId: pers.persId,
      creatureKey: bearKey(),
      ruleset: "RULES_2014",
    });
    if (!attached.ok) throw new Error(attached.error);

    const entered = await enterWildshapeForm({ persId: pers.persId, wildshapeId: attached.form.wildshapeId });
    if (!entered.ok) throw new Error(entered.error);

    return pers;
  }

  it("шкода в межах стосу звіра власних хітів не торкається", async () => {
    const pers = await bearFormOf({ email: "wildshape-damage-inside@example.test", level: 6 });

    const result = await damageBeastForm({ persId: pers.persId, damage: 10 });

    expect(result).toMatchObject({ ok: true, reverted: false, carriedOver: 0, beastCurrentHp: 24, persCurrentHp: 20 });
  });

  it("надлишок шкоди називає і своє число, і нові власні хіти", async () => {
    const pers = await bearFormOf({ email: "wildshape-damage-overflow@example.test", level: 6 });

    const result = await damageBeastForm({ persId: pers.persId, damage: 40 });

    expect(result).toMatchObject({ ok: true, reverted: true, carriedOver: 6, persCurrentHp: 14 });

    const reread = await prisma.pers.findUniqueOrThrow({ where: { persId: pers.persId } });
    expect(reread.currentHp).toBe(14);

    const forms = await loadWildshapeForms(pers.persId);
    expect(forms.ok && forms.active).toBeNull();
  });
});

/// KR24.5. Перевтілення й лічильник використань були двома незвʼязаними системами на двох
/// слайдах: гравець мусив памʼятати робити дві дії там, де за столом відбувається одна. Тут
/// перевіряється сам стик — і те, що ручне керування він не забрав.
describe("вхід у форму витрачає використання", () => {
  async function bearOf(input: { email: string; level: number }) {
    const { user, pers } = await createDruid({ ...input, moonCircle: true });
    signInAs(user.email!);

    const attached = await attachWildshapeForm({
      persId: pers.persId,
      creatureKey: bearKey(),
      ruleset: "RULES_2014",
    });
    if (!attached.ok) throw new Error(attached.error);

    return { pers, wildshapeId: attached.form.wildshapeId };
  }

  async function findUsesOf(persId: number) {
    const loaded = await loadWildshapeForms(persId);
    if (!loaded.ok) throw new Error(loaded.error);
    return loaded.uses;
  }

  function findWildShapeFeature() {
    return prisma.feature.findFirstOrThrow({
      where: { engName: "Wild Shape", usesPoolKey: "WILD_SHAPE" },
      select: { featureId: true },
    });
  }

  it("перевтілення знімає рівно одне використання", async () => {
    const { pers, wildshapeId } = await bearOf({ email: "wildshape-uses-spend@example.test", level: 6 });

    expect(await findUsesOf(pers.persId)).toMatchObject({ remaining: 2, max: 2, price: 1 });

    const entered = await enterWildshapeForm({ persId: pers.persId, wildshapeId });
    if (!entered.ok) throw new Error(entered.error);

    expect(entered.warnings).toEqual([]);
    expect(await findUsesOf(pers.persId)).toMatchObject({ remaining: 1, max: 2 });
  });

  /// За правилами 2014 вихід безкоштовний — і повернути використання може лише відпочинок або
  /// ручний лічильник.
  it("вихід із форми використань не чіпає", async () => {
    const { pers, wildshapeId } = await bearOf({ email: "wildshape-uses-leave@example.test", level: 6 });

    await enterWildshapeForm({ persId: pers.persId, wildshapeId });
    await leaveWildshapeForm(pers.persId);

    expect(await findUsesOf(pers.persId)).toMatchObject({ remaining: 1 });
    expect((await findUsesOf(pers.persId))?.remaining).not.toBe(2);
  });

  /// [Р-3] і [Р26]: лист трекер, а не суддя. Порожній пул попереджає — і пропускає.
  it("вхід без залишку попереджає, але не блокує", async () => {
    const { pers, wildshapeId } = await bearOf({ email: "wildshape-uses-empty@example.test", level: 6 });
    const feature = await findWildShapeFeature();

    await spendFeatureUse({ persId: pers.persId, featureId: feature.featureId });
    await spendFeatureUse({ persId: pers.persId, featureId: feature.featureId });
    expect(await findUsesOf(pers.persId)).toMatchObject({ remaining: 0 });

    const entered = await enterWildshapeForm({ persId: pers.persId, wildshapeId });
    if (!entered.ok) throw new Error(entered.error);

    expect(entered.active.creature?.nameEng).toBe("Brown Bear");
    expect(entered.warnings).toEqual([
      "Використань Дикої форми бракує: потрібно 1, лишилося 0. Перевтілення записане — вирішує майстер за столом.",
    ]);
    expect(await findUsesOf(pers.persId)).toMatchObject({ remaining: 0 });
  });

  /// Автоматика додається, ручне керування не забирається: обидві двері ведуть в один пул.
  it("ручний лічильник лишається робочим і ділить із формою той самий пул", async () => {
    const { pers, wildshapeId } = await bearOf({ email: "wildshape-uses-manual@example.test", level: 6 });
    const feature = await findWildShapeFeature();

    await enterWildshapeForm({ persId: pers.persId, wildshapeId });

    const spent = await spendFeatureUse({ persId: pers.persId, featureId: feature.featureId });
    expect(spent).toMatchObject({ success: true, usesRemaining: 0 });
    expect(await findUsesOf(pers.persId)).toMatchObject({ remaining: 0 });

    const restored = await restoreFeatureUse({ persId: pers.persId, featureId: feature.featureId });
    expect(restored).toMatchObject({ success: true, usesRemaining: 1 });
    expect(await findUsesOf(pers.persId)).toMatchObject({ remaining: 1 });
  });

  /// Пул ділять шість фіч, тож ціну треба брати саме з тієї, чиєю формою став персонаж:
  /// елементаль Кола місяця коштує два використання, і це число лежить у даних, а не в коді.
  it("ціна береться з фічі, яку активують", async () => {
    const { user, pers } = await createDruid({
      email: "wildshape-uses-price@example.test",
      level: 10,
      moonCircle: true,
    });
    signInAs(user.email!);

    const catalog = getAllCreatures("RULES_2014");
    const beastType = catalog.find((creature) => creature.nameEng === "Brown Bear")!.type;
    const elementalType = catalog.find((creature) => creature.nameEng === "Air Elemental")!.type;

    const [beastCharge, elementalCharge, expected] = await Promise.all([
      findWildshapeUses({ persId: pers.persId, creatureType: beastType }),
      findWildshapeUses({ persId: pers.persId, creatureType: elementalType }),
      prisma.feature.findFirstOrThrow({
        where: { engName: "Elemental Wild Shape" },
        select: { featureId: true, usePrice: true },
      }),
    ]);

    expect(beastCharge).toMatchObject({ price: 1 });
    expect(elementalCharge).toMatchObject({ price: expected.usePrice, featureId: expected.featureId });
    expect(elementalCharge?.price).toBe(2);
  });
});

/// KR24.6. Дика форма 2024 — інша фіча з тією самою назвою, і саме серверний стик показує, чи
/// вона справді інша: плавучий звір, якого 2014 не пустив би, тимчасові хіти замість стосу
/// звіра й межа відомих форм, яка попереджає, а не блокує ([Р-3], [Р26]).
describe("Дика форма 2024 на сервері", () => {
  const crabKey = () => getAllCreatures("RULES_2024").find((c) => c.nameEng === "Giant Crab")!.nameEng;

  async function createDruid2024(input: { email: string; level: number; moonCircle: boolean }) {
    const { user, pers } = await createDruid({ ...input, ruleset: "RULES_2024" });
    signInAs(user.email!);
    return pers;
  }

  async function attach2024(persId: number, creatureKey: string) {
    const attached = await attachWildshapeForm({ persId, creatureKey, ruleset: "RULES_2024" });
    if (!attached.ok) throw new Error(attached.error);
    return attached;
  }

  it("друїд 2024 нарешті має Дику форму — межі, а не мовчазний null", async () => {
    const pers = await createDruid2024({ email: "ws2024-limits@example.test", level: 2, moonCircle: false });

    const loaded = await loadWildshapeForms(pers.persId);
    if (!loaded.ok) throw new Error(loaded.error);

    expect(loaded.standing.limits).toEqual({
      maxChallengeRating: 0.25,
      allowsFlySpeed: false,
      allowsSwimSpeed: true,
    });
    expect(loaded.standing.knownFormsLimit).toBe(4);
  });

  /// Та сама істота, дві редакції: 2014 ріже її плаванням до 4 рівня, 2024 — ні.
  it("плавучий звір доступний з 2 рівня, і сервер пускає в нього", async () => {
    const pers = await createDruid2024({ email: "ws2024-swim@example.test", level: 2, moonCircle: false });

    const attached = await attach2024(pers.persId, crabKey());
    expect(attached.warnings).toEqual([]);
    expect(attached.form.eligibility?.eligible).toBe(true);

    const entered = await enterWildshapeForm({ persId: pers.persId, wildshapeId: attached.form.wildshapeId });
    if (!entered.ok) throw new Error(entered.error);
    expect(entered.active.creature?.nameEng).toBe("Giant Crab");
  });

  it("вхід у форму видає тимчасові хіти, а стосу звіра не заводить", async () => {
    const pers = await createDruid2024({ email: "ws2024-temp-hp@example.test", level: 6, moonCircle: false });
    const attached = await attach2024(pers.persId, crabKey());

    await enterWildshapeForm({ persId: pers.persId, wildshapeId: attached.form.wildshapeId });

    const reread = await prisma.pers.findUniqueOrThrow({ where: { persId: pers.persId } });
    expect(reread.tempHp).toBe(6);
    expect(reread.currentHp).toBe(20);

    const row = await prisma.persWildshape.findUniqueOrThrow({
      where: { persWildshapeId: attached.form.wildshapeId },
    });
    expect(row.currentHp).toBeNull();
  });

  it("Коло місяця 2024 потроює тимчасові хіти", async () => {
    const pers = await createDruid2024({ email: "ws2024-moon-temp-hp@example.test", level: 6, moonCircle: true });
    const attached = await attach2024(pers.persId, crabKey());

    await enterWildshapeForm({ persId: pers.persId, wildshapeId: attached.form.wildshapeId });

    expect((await prisma.pers.findUniqueOrThrow({ where: { persId: pers.persId } })).tempHp).toBe(18);
  });

  /// Тимчасові хіти не складаються: більший запас лишається на місці.
  it("наявний більший запас тимчасових хітів не зменшується", async () => {
    const pers = await createDruid2024({ email: "ws2024-temp-hp-keep@example.test", level: 2, moonCircle: false });
    await prisma.pers.update({ where: { persId: pers.persId }, data: { tempHp: 9 } });
    const attached = await attach2024(pers.persId, crabKey());

    await enterWildshapeForm({ persId: pers.persId, wildshapeId: attached.form.wildshapeId });

    expect((await prisma.pers.findUniqueOrThrow({ where: { persId: pers.persId } })).tempHp).toBe(9);
  });

  /// Шкода у формі 2024 йде по власних хітах звичайним блоком: якби її ще й приймала дія
  /// стосу звіра, один удар записався б двічі.
  it("шкода стосу звіра для форми 2024 відхиляється причиною", async () => {
    const pers = await createDruid2024({ email: "ws2024-damage@example.test", level: 2, moonCircle: false });
    const attached = await attach2024(pers.persId, crabKey());
    await enterWildshapeForm({ persId: pers.persId, wildshapeId: attached.form.wildshapeId });

    await expect(damageBeastForm({ persId: pers.persId, damage: 5 })).resolves.toEqual({
      ok: false,
      error: "У формі 2024 хіти лишаються вашими — записуйте їх у блоці хітів персонажа",
    });
    expect((await prisma.pers.findUniqueOrThrow({ where: { persId: pers.persId } })).currentHp).toBe(20);
  });

  it("пʼята форма понад межу 4 попереджає, але прикріплюється", async () => {
    const pers = await createDruid2024({ email: "ws2024-known-forms@example.test", level: 2, moonCircle: false });
    const beasts = getAllCreatures("RULES_2024")
      .filter(
        (creature) =>
          creature.type.trim().toLowerCase() === "звір" &&
          creature.challenge === "0" &&
          creature.flySpeed === null
      )
      .slice(0, 5);
    expect(beasts).toHaveLength(5);

    const warnings = [];
    for (const beast of beasts) warnings.push((await attach2024(pers.persId, beast.nameEng)).warnings);

    expect(warnings.slice(0, 4).flat()).toEqual([]);
    expect(warnings[4]).toEqual([
      "Відомих форм 5 при межі 4. Зайві лишаються на листі — за столом заміняйте по одній за довгий відпочинок.",
    ]);
    expect(await prisma.persWildshape.count({ where: { persId: pers.persId } })).toBe(5);
  });

  /// 2014 межі відомих форм не знає — і не мусить дізнатися заразом із 2024.
  it("друїд 2014 пʼятої форми не боїться", async () => {
    const { user, pers } = await createDruid({
      email: "ws2014-no-known-forms@example.test",
      level: 8,
      moonCircle: false,
    });
    signInAs(user.email!);

    const beasts = getAllCreatures("RULES_2014")
      .filter(
        (creature) =>
          creature.type.trim().toLowerCase() === "звір" &&
          creature.challenge === "0" &&
          creature.flySpeed === null &&
          creature.swimSpeed === null
      )
      .slice(0, 5);

    const warnings = [];
    for (const beast of beasts) {
      const attached = await attachWildshapeForm({
        persId: pers.persId,
        creatureKey: beast.nameEng,
        ruleset: "RULES_2014",
      });
      if (!attached.ok) throw new Error(attached.error);
      warnings.push(attached.warnings);
    }

    expect(warnings.flat()).toEqual([]);
    const loaded = await loadWildshapeForms(pers.persId);
    expect(loaded.ok && loaded.standing.knownFormsLimit).toBeNull();
  });
});

/// KR31.15 (`L13-wildshape-01`, `P5-druid-secondary-flows-05`). Фіча 2024 зветься
/// «Druid: Wild Shape (2024)», а платника шукали рівно за «Wild Shape» — лічильника на картці
/// не було, і вхід у форму нічого не списував.
describe("друїд 2024 бачить використання Дикої форми й витрачає їх", () => {
  it("2 рівень — «2 / 2», вхід у вовка знімає одне", async () => {
    const { user, pers } = await createDruid({ email: "wildshape-uses-2024@example.test", level: 2, moonCircle: false, ruleset: "RULES_2024" });
    signInAs(user.email!);
    const wolfKey = getAllCreatures("RULES_2024").find((c) => c.nameEng === "Wolf")!.nameEng;
    const attached = await attachWildshapeForm({ persId: pers.persId, creatureKey: wolfKey, ruleset: "RULES_2024" });
    if (!attached.ok) throw new Error(attached.error);

    expect(await findWildshapeUses({ persId: pers.persId })).toMatchObject({ remaining: 2, max: 2, price: 1, isUnlimited: false });

    const entered = await enterWildshapeForm({ persId: pers.persId, wildshapeId: attached.form.wildshapeId });
    if (!entered.ok) throw new Error(entered.error);

    expect(await findWildshapeUses({ persId: pers.persId })).toMatchObject({ remaining: 1, max: 2 });
  });
});
