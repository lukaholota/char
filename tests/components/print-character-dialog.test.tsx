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
