// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { ContentListPage } from "@/components/catalogs/ContentListPage";

vi.mock("react-virtuoso", () => ({ Virtuoso: () => <div /> }));
vi.mock("@/hooks/useModalBackButton", () => ({ useModalBackButton: () => {} }));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: ReactNode; open: boolean }) => <div data-testid="dialog" data-open={open}>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

afterEach(cleanup);

describe("закриття модалки каталогу", () => {
  it("тримає вміст під час анімації закриття", () => {
    const props = {
      title: "Заклинання",
      searchQuery: "",
      onSearchChange: () => {},
      data: [] as string[],
      renderItem: () => null,
      desktopDetailView: null,
      modalTitle: "Заклинання",
      renderModalContent: (spell: string) => <span>{spell}</span>,
    };
    const view = render(<ContentListPage {...props} selectedModalItem="Звʼязок з іншим планом" />);

    view.rerender(<ContentListPage {...props} selectedModalItem={null} />);

    expect(screen.getByTestId("dialog").dataset.open).toBe("false");
    expect(screen.getByText("Звʼязок з іншим планом")).toBeTruthy();
  });
});
