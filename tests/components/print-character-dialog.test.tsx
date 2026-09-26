// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import PrintCharacterDialog from "@/lib/components/characterSheet/PrintCharacterDialog";
import {
  findPrintableWildshapeCountAction,
  generateCharacterPdfAction,
} from "@/app/char/[id]/print/actions";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/app/char/[id]/print/actions", () => ({
  findPrintableWildshapeCountAction: vi.fn(),
  generateCharacterPdfAction: vi.fn(),
}));
vi.mock("@/app/char/share/[token]/print/actions", () => ({
  findPrintableWildshapeCountByTokenAction: vi.fn(),
  generateCharacterPdfByTokenAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Дикі форми в модалці друку", () => {
  it("показує непорожню секцію увімкненою за замовчуванням", async () => {
    vi.mocked(findPrintableWildshapeCountAction).mockResolvedValue(2);
    render(<PrintCharacterDialog persId={7} characterName="Мирон" />);

    fireEvent.click(screen.getByRole("button", { name: "Друк" }));

    const checkbox = await screen.findByRole("checkbox", { name: "Дикі форми (2)" });
    expect(checkbox.getAttribute("data-state")).toBe("checked");
    expect(findPrintableWildshapeCountAction).toHaveBeenCalledWith(7);
  });

  it("не показує порожню секцію", async () => {
    vi.mocked(findPrintableWildshapeCountAction).mockResolvedValue(0);
    render(<PrintCharacterDialog persId={8} characterName="Воїн" />);

    fireEvent.click(screen.getByRole("button", { name: "Друк" }));
    await waitFor(() => expect(findPrintableWildshapeCountAction).toHaveBeenCalledWith(8));

    expect(screen.queryByText(/Дикі форми/)).toBeNull();
  });

  it("прибирає секцію з print config після вимкнення", async () => {
    vi.mocked(findPrintableWildshapeCountAction).mockResolvedValue(2);
    vi.mocked(generateCharacterPdfAction).mockRejectedValue(new Error("renderer stopped"));
    render(<PrintCharacterDialog persId={9} characterName="Мирон" />);

    fireEvent.click(screen.getByRole("button", { name: "Друк" }));
    const checkbox = await screen.findByRole("checkbox", { name: "Дикі форми (2)" });
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole("button", { name: "Завантажити PDF" }));

    await waitFor(() => expect(generateCharacterPdfAction).toHaveBeenCalledOnce());
    expect(vi.mocked(generateCharacterPdfAction).mock.calls[0][1].sections).not.toContain(
      "WILDSHAPES"
    );
  });
});

describe("перемикач «Лист 2024»", () => {
  it("є лише в персонажа 2024", async () => {
    vi.mocked(findPrintableWildshapeCountAction).mockResolvedValue(0);
    render(<PrintCharacterDialog persId={10} characterName="Старий" ruleset="RULES_2014" />);

    fireEvent.click(screen.getByRole("button", { name: "Друк" }));
    await waitFor(() => expect(findPrintableWildshapeCountAction).toHaveBeenCalledWith(10));

    expect(screen.queryByRole("switch", { name: "Лист 2024" })).toBeNull();
  });

  it("просить бланк 2024 і прибирає класичну таблицю заклинань", async () => {
    vi.mocked(findPrintableWildshapeCountAction).mockResolvedValue(0);
    vi.mocked(generateCharacterPdfAction).mockRejectedValue(new Error("renderer stopped"));
    render(<PrintCharacterDialog persId={11} characterName="Новий" ruleset="RULES_2024" />);

    fireEvent.click(screen.getByRole("button", { name: "Друк" }));
    fireEvent.click(await screen.findByRole("switch", { name: "Лист 2024" }));
    fireEvent.click(screen.getByRole("button", { name: "Завантажити PDF" }));

    await waitFor(() => expect(generateCharacterPdfAction).toHaveBeenCalledOnce());
    const config = vi.mocked(generateCharacterPdfAction).mock.calls[0][1];
    expect(config.sheetLayout).toBe("SHEET_2024");
    expect(config.sections).not.toContain("SPELL_SHEET");
    expect(screen.queryByText("Лист заклинань (таблиця)")).toBeNull();
  });
});
