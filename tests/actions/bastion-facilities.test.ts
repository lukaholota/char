import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Classes } from "@prisma/client";
import { getBastionFacilityBySlug } from "@/lib/bastionsData";
import { prisma } from "@/lib/prisma";
import {
  addFacility,
  createBastionForPers,
  loadBastion,
  loadBastionPicker,
  removeFacility,
  saveFacilityState,
} from "@/lib/actions/bastion-actions";
import { findFacilityMatch, findSpecialFacilityUsage } from "@/rules/bastions";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

function findFacility(slug: string) {
  const facility = getBastionFacilityBySlug(slug);
  if (!facility) throw new Error(`У каталозі KR19.1 немає приміщення ${slug}`);
  return facility;
}

async function createPlayerWithBastion(input: {
  email: string;
  className: Classes;
  level: number;
}) {
  const [characterClass, race, background] = await Promise.all([
    classByName(input.className),
    raceByName("HUMAN_2024"),
    backgroundByName("SOLDIER_2024"),
  ]);

  const user = await prisma.user.create({
    data: { email: input.email, name: "Тестовий гравець" },
  });

  const pers = await prisma.pers.create({
    data: {
      userId: user.id,
      name: "Власник бастіону",
      ruleset: "RULES_2024",
      classId: characterClass.classId,
      raceId: race.raceId,
      backgroundId: background.backgroundId,
      level: input.level,
      currentHp: 30,
      maxHp: 30,
      str: 14,
      dex: 12,
      con: 14,
      int: 14,
      wis: 12,
      cha: 10,
    },
  });

  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
  const created = await createBastionForPers({ persId: pers.persId, name: "Стара вежа" });
  if (!created.ok) throw new Error(created.error);

  return { user, pers };
}

async function readFacilities(persId: number) {
  const loaded = await loadBastion(persId);
  if (!loaded.ok) throw new Error(loaded.error);
  return loaded.standing.bastion?.facilities ?? [];
}

describe("приміщення бастіону", () => {
  it("розмір проставляється мовчки там, де каталог дає один варіант", async () => {
    const { pers } = await createPlayerWithBastion({
      email: "bastion-single-space@example.test",
      className: "WIZARD_2024",
      level: 5,
    });

    const added = await addFacility({ persId: pers.persId, slug: "arcane-study" });
    if (!added.ok) throw new Error(added.error);

    expect(findFacility("arcane-study").space).toEqual(["roomy"]);
    expect(added.standing.bastion?.facilities).toMatchObject([
      { facilitySlug: "arcane-study", space: "ROOMY" },
    ]);
  });

  it("там, де каталог дає вибір, розмір питається, а чужий не приймається", async () => {
    const { pers } = await createPlayerWithBastion({
      email: "bastion-choose-space@example.test",
      className: "WIZARD_2024",
      level: 5,
    });

    await expect(addFacility({ persId: pers.persId, slug: "bedroom" })).resolves.toEqual({
      ok: false,
      error: "Для цього приміщення треба обрати розмір",
    });
    await expect(
      addFacility({ persId: pers.persId, slug: "barrack", space: "cramped" })
    ).resolves.toEqual({
      ok: false,
      error: "Каталог не дозволяє цьому приміщенню такий розмір",
    });

    const added = await addFacility({ persId: pers.persId, slug: "bedroom", space: "vast" });
    if (!added.ok) throw new Error(added.error);
    expect(added.standing.bastion?.facilities).toMatchObject([{ space: "VAST" }]);
  });

  it("третє спеціальне приміщення на 5-му рівні додається, а лічильник показує 3 / 2", async () => {
    const { pers } = await createPlayerWithBastion({
      email: "bastion-over-limit@example.test",
      className: "WIZARD_2024",
      level: 5,
    });

    for (const slug of ["arcane-study", "library", "smithy"]) {
      const added = await addFacility({ persId: pers.persId, slug });
      expect(added.ok).toBe(true);
    }

    const picker = await loadBastionPicker(pers.persId);
    if (!picker.ok) throw new Error(picker.error);

    expect(picker.picker.specialCount).toBe(3);
    expect(
      findSpecialFacilityUsage({
        characterLevel: picker.picker.characterLevel,
        used: picker.picker.specialCount,
      })
    ).toEqual({ used: 3, limit: 2, isOverLimit: true });
  });

  it("приміщення з непройденою передумовою додається, і пікер каже, що вона непройдена", async () => {
    const { pers } = await createPlayerWithBastion({
      email: "bastion-unmet@example.test",
      className: "BARBARIAN_2024",
      level: 9,
    });

    const added = await addFacility({ persId: pers.persId, slug: "arcane-study" });
    expect(added.ok).toBe(true);

    const picker = await loadBastionPicker(pers.persId);
    if (!picker.ok) throw new Error(picker.error);
    expect(findFacilityMatch(findFacility("arcane-study"), picker.picker.profile).status).toBe(
      "unmet"
    );
  });

  it("профіль зібраний із бази: чарівник має містичне фокусування, воїн — Бойовий стиль", async () => {
    const wizard = await createPlayerWithBastion({
      email: "bastion-profile-wizard@example.test",
      className: "WIZARD_2024",
      level: 5,
    });
    const wizardPicker = await loadBastionPicker(wizard.pers.persId);
    if (!wizardPicker.ok) throw new Error(wizardPicker.error);

    expect(wizardPicker.picker.profile.spellcastingFocuses).toContain("arcane");
    expect(findFacilityMatch(findFacility("arcane-study"), wizardPicker.picker.profile).status).toBe(
      "met"
    );

    const fighter = await createPlayerWithBastion({
      email: "bastion-profile-fighter@example.test",
      className: "FIGHTER_2024",
      level: 5,
    });
    const fighterPicker = await loadBastionPicker(fighter.pers.persId);
    if (!fighterPicker.ok) throw new Error(fighterPicker.error);

    expect(fighterPicker.picker.profile.featureKeys).toContain("fighting style");
    expect(findFacilityMatch(findFacility("war-room"), fighterPicker.picker.profile).status).toBe(
      "met"
    );
  });

  it("приміщення з членством лишається «залежить від кампанії» для будь-якого профілю", async () => {
    const { pers } = await createPlayerWithBastion({
      email: "bastion-campaign@example.test",
      className: "WIZARD_2024",
      level: 9,
    });

    const picker = await loadBastionPicker(pers.persId);
    if (!picker.ok) throw new Error(picker.error);

    expect(findFacilityMatch(findFacility("harper-hideout"), picker.picker.profile).status).toBe(
      "campaign"
    );
  });

  it("пікер мовчить для чужого персонажа й для персонажа 2014", async () => {
    const owner = await createPlayerWithBastion({
      email: "bastion-picker-owner@example.test",
      className: "WIZARD_2024",
      level: 9,
    });

    const [class2014, race2014, background2014] = await Promise.all([
      classByName("WIZARD_2014"),
      raceByName("HUMAN_2014"),
      backgroundByName("SAGE"),
    ]);
    const stranger = await prisma.user.create({
      data: { email: "bastion-picker-stranger@example.test", name: "Чужий гравець" },
    });
    const pers2014 = await prisma.pers.create({
      data: {
        userId: stranger.id,
        name: "Персонаж 2014",
        ruleset: "RULES_2014",
        classId: class2014.classId,
        raceId: race2014.raceId,
        backgroundId: background2014.backgroundId,
        level: 9,
        currentHp: 30,
        maxHp: 30,
        str: 10,
        dex: 12,
        con: 12,
        int: 16,
        wis: 12,
        cha: 10,
      },
    });

    vi.mocked(auth).mockResolvedValue({ user: { email: stranger.email } } as never);
    await expect(loadBastionPicker(owner.pers.persId)).resolves.toEqual({
      ok: false,
      error: "Немає доступу до персонажа",
    });
    await expect(loadBastionPicker(pers2014.persId)).resolves.toEqual({
      ok: false,
      error: "Бастіони — механіка правил 2024",
    });
  });

  it("прибирається поштучно, і чужого приміщення дія не чіпає", async () => {
    const [own, other] = [
      await createPlayerWithBastion({
        email: "bastion-remove-own@example.test",
        className: "WIZARD_2024",
        level: 9,
      }),
      await createPlayerWithBastion({
        email: "bastion-remove-other@example.test",
        className: "WIZARD_2024",
        level: 9,
      }),
    ];

    vi.mocked(auth).mockResolvedValue({ user: { email: other.user.email } } as never);
    const foreign = await addFacility({ persId: other.pers.persId, slug: "library" });
    if (!foreign.ok) throw new Error(foreign.error);
    const foreignFacilityId = foreign.standing.bastion!.facilities[0].facilityId;

    vi.mocked(auth).mockResolvedValue({ user: { email: own.user.email } } as never);
    await addFacility({ persId: own.pers.persId, slug: "arcane-study" });
    await addFacility({ persId: own.pers.persId, slug: "library" });

    await expect(
      removeFacility({ persId: own.pers.persId, facilityId: foreignFacilityId })
    ).resolves.toEqual({ ok: false, error: "Це приміщення не належить бастіону персонажа" });

    const mine = await readFacilities(own.pers.persId);
    const removed = await removeFacility({ persId: own.pers.persId, facilityId: mine[0].facilityId });
    if (!removed.ok) throw new Error(removed.error);

    expect(removed.standing.bastion?.facilities.map((facility) => facility.facilitySlug)).toEqual([
      "library",
    ]);
    vi.mocked(auth).mockResolvedValue({ user: { email: other.user.email } } as never);
    expect((await readFacilities(other.pers.persId)).length).toBe(1);
  });
});

describe("стан приміщення — KR19.4", () => {
  it("наказ, захисники, найманці й нотатки зберігаються та читаються назад", async () => {
    const { pers } = await createPlayerWithBastion({
      email: "bastion-state-save@example.test",
      className: "WIZARD_2024",
      level: 5,
    });
    const added = await addFacility({ persId: pers.persId, slug: "smithy" });
    if (!added.ok) throw new Error(added.error);
    const facilityId = added.standing.bastion!.facilities[0].facilityId;

    const saved = await saveFacilityState({
      persId: pers.persId,
      facilityId,
      currentOrder: "CRAFT",
      defenders: 3,
      hirelings: "Коваль Остап",
      notes: "Кує лати",
    });
    if (!saved.ok) throw new Error(saved.error);

    expect(saved.standing.bastion?.facilities[0]).toMatchObject({
      currentOrder: "CRAFT",
      defenders: 3,
      hirelings: "Коваль Остап",
      notes: "Кує лати",
    });
  });

  it("наказ поза переліком каталогу приймається — попереджає лише UI, не блокує", async () => {
    const { pers } = await createPlayerWithBastion({
      email: "bastion-state-outside-catalog@example.test",
      className: "WIZARD_2024",
      level: 5,
    });
    expect(findFacility("arcane-study").orders).not.toContain("trade");
    const added = await addFacility({ persId: pers.persId, slug: "arcane-study" });
    if (!added.ok) throw new Error(added.error);
    const facilityId = added.standing.bastion!.facilities[0].facilityId;

    const saved = await saveFacilityState({
      persId: pers.persId,
      facilityId,
      currentOrder: "TRADE",
      defenders: 0,
      hirelings: "",
      notes: "",
    });
    if (!saved.ok) throw new Error(saved.error);
    expect(saved.standing.bastion?.facilities[0].currentOrder).toBe("TRADE");
  });

  it("відʼємні захисники дають людську помилку форми, а не падіння бази", async () => {
    const { pers } = await createPlayerWithBastion({
      email: "bastion-state-negative-defenders@example.test",
      className: "WIZARD_2024",
      level: 5,
    });
    const added = await addFacility({ persId: pers.persId, slug: "smithy" });
    if (!added.ok) throw new Error(added.error);
    const facilityId = added.standing.bastion!.facilities[0].facilityId;

    await expect(
      saveFacilityState({
        persId: pers.persId,
        facilityId,
        currentOrder: null,
        defenders: -1,
        hirelings: "",
        notes: "",
      })
    ).resolves.toEqual({ ok: false, error: "Захисників не може бути менше нуля" });
  });

  it("невідоме значення наказу відхиляється", async () => {
    const { pers } = await createPlayerWithBastion({
      email: "bastion-state-bad-order@example.test",
      className: "WIZARD_2024",
      level: 5,
    });
    const added = await addFacility({ persId: pers.persId, slug: "smithy" });
    if (!added.ok) throw new Error(added.error);
    const facilityId = added.standing.bastion!.facilities[0].facilityId;

    await expect(
      saveFacilityState({
        persId: pers.persId,
        facilityId,
        currentOrder: "NONSENSE" as never,
        defenders: 0,
        hirelings: "",
        notes: "",
      })
    ).resolves.toEqual({ ok: false, error: "Такого наказу не існує" });
  });

  it("чуже приміщення дія стану не чіпає", async () => {
    const [own, other] = [
      await createPlayerWithBastion({
        email: "bastion-state-own@example.test",
        className: "WIZARD_2024",
        level: 9,
      }),
      await createPlayerWithBastion({
        email: "bastion-state-other@example.test",
        className: "WIZARD_2024",
        level: 9,
      }),
    ];

    vi.mocked(auth).mockResolvedValue({ user: { email: other.user.email } } as never);
    const foreign = await addFacility({ persId: other.pers.persId, slug: "library" });
    if (!foreign.ok) throw new Error(foreign.error);
    const foreignFacilityId = foreign.standing.bastion!.facilities[0].facilityId;

    vi.mocked(auth).mockResolvedValue({ user: { email: own.user.email } } as never);
    await expect(
      saveFacilityState({
        persId: own.pers.persId,
        facilityId: foreignFacilityId,
        currentOrder: null,
        defenders: 1,
        hirelings: "",
        notes: "",
      })
    ).resolves.toEqual({ ok: false, error: "Це приміщення не належить бастіону персонажа" });
  });

  it("статі персонажа після збереження стану приміщення не змінюються жодного разу", async () => {
    const { pers } = await createPlayerWithBastion({
      email: "bastion-state-stats-untouched@example.test",
      className: "WIZARD_2024",
      level: 5,
    });
    const added = await addFacility({ persId: pers.persId, slug: "smithy" });
    if (!added.ok) throw new Error(added.error);
    const facilityId = added.standing.bastion!.facilities[0].facilityId;

    const before = await prisma.pers.findUniqueOrThrow({ where: { persId: pers.persId } });

    const saved = await saveFacilityState({
      persId: pers.persId,
      facilityId,
      currentOrder: "CRAFT",
      defenders: 7,
      hirelings: "Коваль Остап",
      notes: "Кує лати",
    });
    if (!saved.ok) throw new Error(saved.error);

    const after = await prisma.pers.findUniqueOrThrow({ where: { persId: pers.persId } });
    expect(after).toEqual(before);
  });
});
