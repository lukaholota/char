// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RoomTabBar } from "@/components/games/RoomPanels";
import { resetRoomTabs, useRoomTabStore } from "@/components/games/room-tabs";

vi.mock("@/components/games/GameJournal", () => ({ GameJournal: () => null, GameSoundToggle: () => null }));
vi.mock("@/components/games/GameRoomManagement", () => ({ GameRoomManagement: () => null }));
vi.mock("@/components/games/GameRoomPersPicker", () => ({ GameRoomPersPicker: () => null }));
vi.mock("@/components/games/GameRoomSidebar", () => ({ GameRoomInvite: () => null, GameRoomMembers: () => null }));
vi.mock("@/components/games/GameSessionDock", () => ({ PopOutJournalButton: () => null }));
vi.mock("@/components/games/RollTargetControls", () => ({ RollTargetChip: () => null }));
vi.mock("@/components/games/RoomRollTarget", () => ({ JournalRollStrip: () => null }));

function SideBar() {
  const isSideFolded = useRoomTabStore((state) => state.isSideFolded);
  return <RoomTabBar tabs={["journal", "room"]} current="journal" unseen={3} label="Бічна панель" isFolded={isSideFolded} canFold />;
}

afterEach(() => {
  cleanup();
  resetRoomTabs();
});

describe("бічна панель кімнати", () => {
  it("згортається в колонку іконок і розгортається кліком по вкладці", () => {
    render(<SideBar />);
    expect(screen.getByRole("tab", { name: "Журнал" }).getAttribute("aria-selected")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Згорнути бічну панель" }));
    expect(useRoomTabStore.getState().isSideFolded).toBe(true);
    expect(screen.getByRole("button", { name: "Розгорнути бічну панель" }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.getAllByRole("tab").map((tab) => tab.getAttribute("aria-selected"))).toEqual(["false", "false"]);
    expect(screen.getByRole("tab", { name: /^Журнал\s*3\s*нових$/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Кімната" }));
    expect(useRoomTabStore.getState()).toMatchObject({ isSideFolded: false, sideTab: "room" });
  });
});
