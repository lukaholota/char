// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ReportDialog } from "@/components/discussion/ReportDialog";
import { reportContent } from "@/lib/actions/content-report-actions";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/lib/actions/content-report-actions", () => ({ reportContent: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("скарга на запис", () => {
  it("без причини скаргу не надіслати", () => {
    render(<ReportDialog target="homebrew:1" commentId={null} open onOpenChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Надіслати скаргу" })).toHaveProperty("disabled", true);
  });

  it("вибрана причина позначається й доходить до скарги", async () => {
    vi.mocked(reportContent).mockResolvedValue({ success: true } as never);
    render(<ReportDialog target="homebrew:1" commentId={null} open onOpenChange={vi.fn()} />);

    fireEvent.click(screen.getByText("Спам або реклама"));
    fireEvent.click(screen.getByRole("button", { name: "Надіслати скаргу" }));

    expect(screen.getByRole("radio", { name: "Спам або реклама" }).getAttribute("data-state")).toBe("checked");
    await waitFor(() => expect(reportContent).toHaveBeenCalledOnce());
    expect(vi.mocked(reportContent).mock.calls[0][0]).toMatchObject({ reason: "SPAM" });
  });
});
