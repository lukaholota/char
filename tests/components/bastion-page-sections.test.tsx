// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { BastionFacilityCard } from "@/components/bastions/BastionFacilityCard";
import { BastionSpecialFacilitySlots } from "@/components/bastions/BastionFacilitySections";
import { BastionTurnPanel } from "@/components/bastions/BastionTurnPanel";
import { saveFacilityState } from "@/lib/actions/bastion-actions";
import type { BastionFacilityView, BastionRecord, BastionStanding } from "@/server/db/bastions";

vi.mock("@/lib/actions/bastion-actions", () => ({
  addTurn: vi.fn(),
  removeFacility: vi.fn(),
  replaceFacility: vi.fn(),
  saveBastionMaintaining: vi.fn(),
  saveFacilityState: vi.fn(async () => ({ ok: true, standing: {} })),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const metMatch = { status: "met", isSpecial: false, isAboveCharacterLevel: false } as const;

function buildView(overrides: Partial<BastionFacilityView>): BastionFacilityView {
  return {
    facilityId: 1, slug: "bedroom", space: "CRAMPED", allowedSpaces: ["CRAMPED", "ROOMY", "VAST"], name: "Спальня", level: null,
    prerequisiteText: "", match: metMatch, currentOrder: null, defenders: 0, hirelings: "", notes: "",
    allowedOrderCodes: [], expectedHirelings: "—", heroicInspirationHint: null,
    ...overrides,
  };
}

const library = buildView({
  facilityId: 2, slug: "library", name: "Бібліотека", space: "ROOMY", allowedSpaces: ["ROOMY"], level: 5,
  match: { ...metMatch, isSpecial: true }, allowedOrderCodes: ["RESEARCH"], expectedHirelings: "1",
});

describe("KR19.6 — картка приміщення читається, а не редагується", () => {
  it("базовому приміщенню наказів не пропонує й полів форми не показує", () => {
    render(<BastionFacilityCard persId={7} view={buildView({})} replacementOptions={[]} onChanged={vi.fn()} />);

    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button", { name: /Зберегти/ })).toBeNull();
  });

  it("спеціальне ставить каталожний наказ окремо від домашніх", () => {
    render(<BastionFacilityCard persId={7} view={library} replacementOptions={[]} onChanged={vi.fn()} />);

    const select = screen.getByRole("combobox");
    const topLevel = [...select.children].filter((node) => node.tagName === "OPTION").map((node) => node.textContent);
    expect(topLevel).toEqual(["Без наказу", "Дослідження"]);
    expect(within(select.querySelector("optgroup") as HTMLElement).getAllByRole("option")).toHaveLength(5);
    expect(screen.getByText("Найманців очікується 1")).toBeTruthy();
  });

  it("наказ поза каталогом називає каталожний; на базовому з уже відданим наказом — що базовим їх немає", () => {
    render(<BastionFacilityCard persId={7} view={{ ...library, currentOrder: "TRADE" }} replacementOptions={[]} onChanged={vi.fn()} />);
    render(<BastionFacilityCard persId={7} view={buildView({ facilityId: 3, currentOrder: "CRAFT" })} replacementOptions={[]} onChanged={vi.fn()} />);

    expect(screen.getByText("За каталогом це приміщення виконує наказ «Дослідження»")).toBeTruthy();
    expect(screen.getByText("Базовим приміщенням каталог наказів не дає")).toBeTruthy();
  });

  it("зміна наказу зберігає одразу, не чіпаючи решти стану, і перечитує сторінку", async () => {
    const onChanged = vi.fn(async () => undefined);
    render(<BastionFacilityCard persId={7} view={{ ...library, defenders: 3, notes: "план" }} replacementOptions={[]} onChanged={onChanged} />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "RESEARCH" } });

    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(saveFacilityState).toHaveBeenCalledWith({
      persId: 7, facilityId: 2, space: "roomy", currentOrder: "RESEARCH", defenders: 3, hirelings: "", notes: "план",
    });
  });

  it("прибрати приміщення можна лише з режиму правки", () => {
    render(<BastionFacilityCard persId={7} view={buildView({})} replacementOptions={[]} onChanged={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Прибрати/ })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Редагувати: Спальня" }));

    expect(screen.getByRole("button", { name: /Прибрати приміщення/ })).toBeTruthy();
  });
});

describe("KR19.6 — слоти спеціальних приміщень", () => {
  it("на 1-му рівні замість «0 / 0» пояснює, коли вони відкриваються", () => {
    render(<BastionSpecialFacilitySlots characterLevel={1} used={0} />);

    expect(screen.queryByText(/0 \/ 0/)).toBeNull();
    expect(screen.getByText(/відкриваються на 5-му рівні/)).toBeTruthy();
  });
});

describe("KR19.6 — хід бастіону", () => {
  const bastion: BastionRecord = { bastionId: 1, persId: 7, name: "Stonehaven", description: "", notes: "", isMaintaining: false, facilities: [], turns: [] };
  const standing = {
    persId: 7, persName: "Освальд", characterLevel: 5, bastion,
    access: { isOffered: true, isBelowStandardLevel: false, isEntryCardShown: true, isEntryCardMuted: false },
  } as BastionStanding;

  it("зводить накази й кладе їх заготовкою в запис журналу", () => {
    render(<BastionTurnPanel standing={standing} bastion={bastion} views={[buildView({}), { ...library, currentOrder: "RESEARCH" }]} onChanged={vi.fn()} />);

    expect(screen.getByRole("listitem").textContent).toBe("Бібліотека→Дослідження");
    expect(screen.getByRole("link", { name: /Правила бастіонів/ }).getAttribute("href")).toBe("/2024/rules/adventuring#bastions");
    fireEvent.click(screen.getByRole("button", { name: "Записати хід №1" }));

    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("Бібліотека — Дослідження");
  });
});
