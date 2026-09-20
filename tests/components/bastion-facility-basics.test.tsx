// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BastionBasicFacilitiesHint, BastionFacilityKindLabel, BastionMaintainToggle } from "@/components/bastions/BastionFacilityBasics";
import type { BastionFacilityView, BastionStanding } from "@/server/db/bastions";

vi.mock("@/lib/actions/bastion-actions", () => ({ saveBastionMaintaining: vi.fn() }));

afterEach(cleanup);

function buildView(overrides: Partial<BastionFacilityView>): BastionFacilityView {
  return {
    facilityId: 1, slug: "bedroom", space: "CRAMPED", allowedSpaces: ["CRAMPED", "ROOMY", "VAST"], name: "Спальня", level: null,
    prerequisiteText: "", match: { status: "met", isSpecial: false, isAboveCharacterLevel: false }, currentOrder: null,
    defenders: 0, hirelings: "", notes: "", allowedOrderCodes: [], expectedHirelings: "", heroicInspirationHint: null,
    ...overrides,
  };
}

describe("KR31.15 — базові й спеціальні приміщення на сторінці бастіону (L14-bastions-01, -10)", () => {
  it("рядок каже, базове приміщення чи спеціальне", () => {
    render(<BastionFacilityKindLabel view={buildView({})} />);
    render(<BastionFacilityKindLabel view={buildView({ slug: "library", space: "ROOMY", level: 5, match: { status: "met", isSpecial: true, isAboveCharacterLevel: false } })} />);
    expect(screen.getByText("Базове · Тісне")).toBeTruthy();
    expect(screen.getByText("Спеціальне · рівень 5+ · Просторе")).toBeTruthy();
  });

  it("з одним тісним базовим підказка просить ще безкоштовне просторе й називає вартість наступних", () => {
    render(<BastionBasicFacilitiesHint views={[buildView({})]} />);
    expect(screen.getByText(/Ще не додано: просторе\./)).toBeTruthy();
    expect(screen.getByText(/Нове тісне — 500 зм і 20 днів/)).toBeTruthy();
    expect(screen.getByText(/Збільшити: тісне → просторе — 500 зм і 25 днів/)).toBeTruthy();
  });
});

describe("KR31.15 — перемикач «Утримання» (L14-bastions-08)", () => {
  it("увімкнене Утримання попереджає про приміщення з наказом", () => {
    const standing = {
      persId: 7, persName: "Освальд", characterLevel: 5,
      access: { isOffered: true, isBelowStandardLevel: false, isEntryCardShown: true, isEntryCardMuted: false },
      bastion: { bastionId: 1, persId: 7, name: "Форт", description: "", notes: "", isMaintaining: true, facilities: [], turns: [] },
    } as BastionStanding;

    render(<BastionMaintainToggle standing={standing} views={[buildView({ currentOrder: "CRAFT" })]} onChanged={vi.fn()} />);

    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText(/Бастіон на Утриманні/)).toBeTruthy();
  });
});
