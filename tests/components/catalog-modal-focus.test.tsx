// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ContentListPage } from "@/components/catalogs/ContentListPage";

vi.mock("react-virtuoso", () => ({ Virtuoso: () => <div /> }));
vi.mock("@/hooks/useModalBackButton", () => ({ useModalBackButton: () => {} }));
afterEach(cleanup);

it("opens a catalog card without focusing its comment box, so the phone keyboard stays down", async () => {
  render(
    <ContentListPage
      title="Заклинання"
      searchQuery=""
      onSearchChange={() => {}}
      data={[] as string[]}
      renderItem={() => null}
      desktopDetailView={null}
      isModalChromeHidden
      selectedModalItem="Вогняна куля"
      renderModalContent={() => <textarea aria-label="Що думаєте?" />}
    />,
  );

  const commentBox = await screen.findByRole("textbox", { name: "Що думаєте?" });
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(document.activeElement).not.toBe(commentBox);
});
