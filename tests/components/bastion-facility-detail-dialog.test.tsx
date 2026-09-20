// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BastionFacilityDetailDialog } from "@/components/bastions/BastionFacilityDetailDialog";
import { fetchBastionFacility } from "@/lib/catalog-reads";
import type { BastionFacilityData } from "@/lib/bastion-facility";

vi.mock("@/lib/catalog-reads", () => ({ fetchBastionFacility: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const library: BastionFacilityData = {
  slug: "library", name: "Бібліотека", engName: "Library", source: "DMG_2024", page: 340, facilityType: "special", level: 5,
  space: ["roomy"], hirelings: [{ exact: 1, min: null, space: null }], orders: ["research"], prerequisite: null, prerequisiteText: "",
  shortDescription: "Дослідження.", description: "Наказ «Дослідження» дає відповідь на запитання про світ.",
};

describe("KR19.6 — опис приміщення відкривається з картки бастіону", () => {
  it("до відкриття каталог не читає, після — показує опис із каталогу", async () => {
    vi.mocked(fetchBastionFacility).mockResolvedValue(library);
    render(<BastionFacilityDetailDialog slug="library" name="Бібліотека" />);

    expect(fetchBastionFacility).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Що дає: Бібліотека" }));

    expect(fetchBastionFacility).toHaveBeenCalledWith("library");
    await waitFor(() => expect(screen.getByText(/дає відповідь на запитання про світ/)).toBeTruthy());
  });

  it("зниклий із каталогу слаґ каже про це замість порожнього вікна", async () => {
    vi.mocked(fetchBastionFacility).mockResolvedValue(null);
    render(<BastionFacilityDetailDialog slug="gone" name="Зникле" />);

    fireEvent.click(screen.getByRole("button", { name: "Що дає: Зникле" }));

    await waitFor(() => expect(screen.getByText("Приміщення більше немає в каталозі")).toBeTruthy());
  });
});
