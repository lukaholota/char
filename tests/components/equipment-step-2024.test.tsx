// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { EquipmentForm } from "@/lib/components/characterCreator/EquipmentForm";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import type { BackgroundI, ClassI, RaceI } from "@/lib/types/model-types";
import type { Weapon } from "@prisma/client";

/// KR26.4. Крок «Спорядження» під 2024: літери як у книзі, пакунок списком, монети окремо.
/// Рядки 2024 приходять без `description` — форма фікстур повторює те, що пише сід KR26.2.

afterEach(cleanup);

// Раннер (vitest на bun) не дає jsdom робочого localStorage, а zustand-persist забирає сховище
// в мить імпорту — тому шим стає на місце ще до імпортів, через vi.hoisted.
vi.hoisted(() => {
  const entries = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    writable: true,
    value: {
      get length() {
        return entries.size;
      },
      key: (index: number) => [...entries.keys()][index] ?? null,
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => void entries.set(key, String(value)),
      removeItem: (key: string) => void entries.delete(key),
      clear: () => entries.clear(),
    } satisfies Storage,
  });
});

const weapons = [
  { weaponId: 19, name: "GREATAXE", damage: "1к12", weaponType: "MARTIAL_WEAPON", isRanged: false, isAdditional: false, sortOrder: 19, versatileDamage: null },
  { weaponId: 4, name: "HANDAXE", damage: "1к6", weaponType: "SIMPLE_WEAPON", isRanged: false, isAdditional: false, sortOrder: 4, versatileDamage: null },
] as unknown as Weapon[];

const explorersPack = {
  name: "EXPLORERS_PACK",
  description: "Набір для подорожей дикою місцевістю.",
  ruleset: "RULES_2024",
  items: [
    { name: "Рюкзак", quantity: 1 },
    { name: "Дві фляги олії", quantity: 2 },
  ],
};

const option = (fields: Record<string, unknown>) => ({
  choiceGroup: 1,
  quantity: 1,
  chooseAnyWeapon: false,
  chooseAnyArmor: false,
  weaponType: null,
  weaponCount: 1,
  description: null,
  item: null,
  weapon: null,
  armor: null,
  equipmentPack: null,
  ...fields,
});

/// Варвар 2024: одна група, літери A і B, під A — чотири рядки й монети.
const barbarian2024 = {
  classId: 2,
  name: "BARBARIAN_2024",
  ruleset: "RULES_2024",
  startingEquipmentOption: [
    option({ optionId: 1001, option: "a", weapon: weapons[0] }),
    option({ optionId: 1002, option: "a", quantity: 4, weapon: weapons[1] }),
    option({ optionId: 1003, option: "a", equipmentPack: explorersPack }),
    option({ optionId: 1004, option: "a", quantity: 15, item: "зм" }),
    option({ optionId: 1005, option: "b", quantity: 75, item: "зм" }),
  ],
} as unknown as ClassI;

/// Варвар 2014: три групи, у третій вибору немає, зате два рядки під однією літерою.
const barbarian2014 = {
  classId: 2,
  name: "BARBARIAN_2014",
  ruleset: "RULES_2014",
  startingEquipmentOption: [
    option({ optionId: 13, option: "a", weapon: weapons[0], description: "Велика сокира (1к12)" }),
    option({ optionId: 14, option: "b", chooseAnyWeapon: true, weaponType: "MARTIAL_WEAPON", description: "Бойова рукопашна зброя на вибір" }),
    option({ optionId: 17, choiceGroup: 3, option: "a", equipmentPack: { ...explorersPack, ruleset: "RULES_2014" }, description: "Набір мандрівника" }),
    option({ optionId: 18, choiceGroup: 3, option: "a", quantity: 4, weapon: weapons[1], description: "4 списи (1к6), метальні" }),
  ],
} as unknown as ClassI;

const acolyte2024 = {
  backgroundId: 1,
  name: "ACOLYTE_2024",
  grantsGoldInstead: 50,
  items: [
    { name: "Священний символ", quantity: 1 },
    { name: "зм", quantity: 8 },
  ],
} as unknown as BackgroundI;

const renderStep = (selectedClass: ClassI, background?: BackgroundI) =>
  render(
    <EquipmentForm
      race={{} as RaceI}
      selectedClass={selectedClass}
      background={background}
      weapons={weapons}
      formId="equipment-step"
    />,
  );

const readSavedSelection = () =>
  usePersFormStore.getState().formData.equipmentSchema?.choiceGroupToId ?? {};

/// Крок зберігається через `handleSubmit`, тобто асинхронно — читати стор одразу після
/// події зарано.
const submitStep = async () => {
  fireEvent.submit(document.getElementById("equipment-step")!);
  await waitFor(() => expect(usePersFormStore.getState().formData.equipmentSchema).toBeTruthy());
};

beforeEach(() => {
  usePersFormStore.setState({ formData: {}, isHydrated: true });
});

describe("2024 — класова картка говорить літерами", () => {
  it("заголовок групи називає літери, а не номер опції", () => {
    renderStep(barbarian2024);

    expect(screen.getByText("Оберіть A або B")).toBeTruthy();
    expect(screen.queryByText("Опція 1")).toBeNull();
    expect(screen.getByText("Варіант A")).toBeTruthy();
    expect(screen.getByText("Варіант B")).toBeTruthy();
  });

  it("пакунок показано списком, а не склеєним реченням", () => {
    renderStep(barbarian2024);

    expect(screen.getByText("Велика сокира")).toBeTruthy();
    expect(screen.getByText("Ручна сокира x4")).toBeTruthy();
    expect(screen.getByText("Набір мандрівника")).toBeTruthy();
  });

  it("монети відділені від речей і підписані сумою", () => {
    renderStep(barbarian2024);

    expect(screen.getByText("75 зм")).toBeTruthy();
    // Речі — пункти списку, монети стоять поза ним: це не річ.
    expect(screen.getByText("Велика сокира").closest("ul")).not.toBeNull();
    expect(screen.getByText("15 зм").closest("ul")).toBeNull();
  });

  it("«?» показує вміст набору тієї самої редакції", () => {
    renderStep(barbarian2024);

    fireEvent.click(screen.getByRole("button", { name: "Що входить до: Набір мандрівника" }));

    expect(screen.getByText("Дві фляги олії")).toBeTruthy();
    expect(screen.queryByText("Набір для приготування їжі")).toBeNull();
  });

  it("картка походження стоїть поруч і теж відділяє монети", () => {
    renderStep(barbarian2024, acolyte2024);

    expect(screen.getByText("Майно походження")).toBeTruthy();
    expect(screen.getByText("Священний символ")).toBeTruthy();
    expect(screen.getByText("8 зм")).toBeTruthy();
  });
});

describe("вибір за замовчуванням несе всю літеру", () => {
  it("2024: незайманий крок віддає всі чотири рядки літери A, а не лише перший", async () => {
    renderStep(barbarian2024);
    await submitStep();

    expect(readSavedSelection()["1"]).toEqual([1001, 1002, 1003, 1004]);
  });

  it("2024: обрана літера B замінює вибір, а не додається до нього", async () => {
    renderStep(barbarian2024);
    fireEvent.click(screen.getByText("Варіант B"));
    await submitStep();

    expect(readSavedSelection()["1"]).toEqual([1005]);
  });

  it("2014: група без вибору віддає обидва свої рядки", async () => {
    renderStep(barbarian2014);
    await submitStep();

    expect(readSavedSelection()["3"]).toEqual([17, 18]);
  });
});

describe("2014 — ті самі опції й ті самі вибори", () => {
  it("описи рядків лишаються дослівними", () => {
    renderStep(barbarian2014);

    expect(screen.getByText("Велика сокира (1к12)")).toBeTruthy();
    expect(screen.getByText("4 списи (1к6), метальні")).toBeTruthy();
  });

  it("група з однією літерою не пропонує вибору", () => {
    renderStep(barbarian2014);

    expect(screen.getByText("Ви отримуєте")).toBeTruthy();
    expect(screen.getAllByRole("radio").map((radio) => radio.getAttribute("name"))).toEqual(["1", "1"]);
  });

  it("вибір зброї лишається доступним", () => {
    renderStep(barbarian2014);
    fireEvent.click(screen.getByText("Варіант B"));

    expect(screen.getByRole("button", { name: "Обрати зброю" })).toBeTruthy();
  });
});
